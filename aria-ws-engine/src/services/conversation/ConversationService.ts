/**
 * Conversation Service
 *
 * Orchestrates the conversation flow between participant and AI agent.
 *
 * Responsibilities:
 * - Session initialization (new + rejoin with sessionPersistence)
 * - User input processing (STT transcript → LLM → response)
 * - Client action processing (form submissions, assessments)
 * - Data submission processing (structured payloads)
 *
 * The LLM always returns flat JSON: { text: string, action: string }.
 * Action execution is delegated to ActionHandler via registry lookup.
 */

import type { CompletionOptions, ILLMConnector } from '@connectors';
import type {
  AgentDocument,
  AgentPromptDocument,
  ConversationDocument,
  MessageEntry,
} from '@models';
import type {
  AgentRepository,
  SessionRepository,
  ConversationRepository,
  ParticipantRepository,
  AgentPromptRepository,
} from '@repositories';
import type {
  AIResponse,
  LLMMessage,
  InitializeResult,
  ProcessResult,
  ProcessDataResult,
} from '@types';
import { ActionHandler } from './ActionHandler';
import * as StateMachine from './StateMachine';
import { OUTPUT_FORMAT_INJECTION } from './output-format';
import { KeyedMutex, createLogger } from '@utils';
import { ObjectId } from 'mongodb';

// ============================================
// Dependencies
// ============================================

export interface ConversationServiceDeps {
  agentRepo: AgentRepository;
  sessionRepo: SessionRepository;
  conversationRepo: ConversationRepository;
  participantRepo: ParticipantRepository;
  promptRepo: AgentPromptRepository;
  llmConnector: ILLMConnector;
  actionHandler: ActionHandler;
}

export interface ProcessOptions {
  skipAction?: boolean;
}

// ============================================
// Service
// ============================================

const logger = createLogger('ConversationService');

export class ConversationService {
  private readonly mutex = new KeyedMutex();

  constructor(private readonly deps: ConversationServiceDeps) {}

  // ──────────────────────────────────────────
  // Public API (serialized per session)
  // ──────────────────────────────────────────

  /**
   * Initialize a conversation session.
   * Serialized per sessionId to prevent concurrent initialization races.
   */
  async initialize(sessionId: ObjectId): Promise<InitializeResult> {
    return this.mutex.runExclusive(sessionId.toString(), () => this._initialize(sessionId));
  }

  /**
   * Process a user's spoken input (post-STT transcript).
   * Serialized per sessionId to prevent interleaving with concurrent requests.
   */
  async processUserInput(
    sessionId: ObjectId,
    transcript: string,
    latencyMs?: number,
    options?: ProcessOptions
  ): Promise<ProcessResult> {
    return this.mutex.runExclusive(sessionId.toString(), () =>
      this._processUserInput(sessionId, transcript, latencyMs, options)
    );
  }

  /**
   * Process structured data submission (assessment answers, form data).
   * Serialized per sessionId to prevent interleaving with concurrent requests.
   */
  async processDataSubmission(
    sessionId: ObjectId,
    dataType: string,
    payload: unknown,
    latencyMs?: number
  ): Promise<ProcessDataResult> {
    return this.mutex.runExclusive(sessionId.toString(), () =>
      this._processDataSubmission(sessionId, dataType, payload, latencyMs)
    );
  }

  // ──────────────────────────────────────────
  // Initialization (implementation)
  // ──────────────────────────────────────────

  /**
   * New session:
   *   Injects step context, calls LLM — same as any other step.
   *
   * Existing session + sessionPersistence:
   *   - Last message from assistant → replay text (client re-synthesizes audio)
   *   - Last message from user/system → call LLM (connection dropped mid-flow)
   *
   * Existing session without sessionPersistence:
   *   Returns session state only — no text, no audio.
   */
  private async _initialize(sessionId: ObjectId): Promise<InitializeResult> {
    const session = await this.deps.sessionRepo.findByIdOrThrow(sessionId, 'Session');

    const [agent, conversation, participant] = await Promise.all([
      this.deps.agentRepo.findByIdOrThrow(session.agentId, 'Agent'),
      this.deps.conversationRepo.findBySessionIdOrThrow(session._id),
      this.deps.participantRepo.findByIdOrThrow(session.participantId, 'Participant'),
    ]);

    const isNewSession = conversation.messageCount === 0;
    let text = '';

    if (isNewSession) {
      await this.injectStepContext(session._id, session.currentStep, agent, participant.name);
      text = await this.generateAndStore(session, agent);
    } else if (agent.features.sessionPersistence) {
      text = await this.resumeSession(session, agent, conversation);
    }

    return {
      sessionId: session._id,
      agent,
      text,
      currentStep: session.currentStep,
      isNewSession,
    };
  }

  // ──────────────────────────────────────────
  // User Input (implementation)
  // ──────────────────────────────────────────

  private async _processUserInput(
    sessionId: ObjectId,
    transcript: string,
    latencyMs?: number,
    options?: ProcessOptions
  ): Promise<ProcessResult> {
    const { session, agent } = await this.loadSessionContext(sessionId);

    if (session.status === 'completed') {
      return this.completedResponse(session.currentStep);
    }

    await this.deps.sessionRepo.touchActivity(session._id);

    await this.deps.conversationRepo.addMessage(session._id, {
      stepKey: session.currentStep,
      role: 'user',
      content: transcript,
      latencyMs,
    });

    const aiResponse = await this.generateResponse(session, agent);

    await this.deps.conversationRepo.addMessage(session._id, {
      stepKey: session.currentStep,
      role: 'assistant',
      content: aiResponse.text,
      action: aiResponse.action,
    });

    return this.buildProcessResult(aiResponse, session, agent, options);
  }

  // ──────────────────────────────────────────
  // Data Submission (implementation)
  // ──────────────────────────────────────────

  private async _processDataSubmission(
    sessionId: ObjectId,
    dataType: string,
    payload: unknown,
    latencyMs?: number
  ): Promise<ProcessDataResult> {
    const { session, agent } = await this.loadSessionContext(sessionId);

    if (session.status === 'completed') {
      return { ...this.completedResponse(session.currentStep), dataSaved: false, field: dataType };
    }

    await this.deps.sessionRepo.touchActivity(session._id);

    await this.deps.sessionRepo.updateById(session._id, {
      [`data.${dataType}`]: payload,
    });

    await this.deps.conversationRepo.addMessage(session._id, {
      stepKey: session.currentStep,
      role: 'system',
      content: `Data submitted: ${dataType}`,
      latencyMs,
    });

    const userContent = JSON.stringify({ dataType, payload });
    const conversation = await this.deps.conversationRepo.findBySessionIdOrThrow(session._id);
    const built = await this.buildMessages(agent, session.currentStep, conversation, userContent);
    const aiResponse = await this.callLLM(built);

    await this.deps.conversationRepo.addMessage(session._id, {
      stepKey: session.currentStep,
      role: 'assistant',
      content: aiResponse.text,
      action: aiResponse.action,
    });

    // Data submissions can also trigger actions (e.g. assessment completion)
    let isComplete = false;
    let currentStep = session.currentStep;
    let stepAdvanced = false;
    let followUpText: string | undefined;

    if (aiResponse.action) {
      const actionResult = await this.deps.actionHandler.execute(aiResponse.action, session, agent, this);

      if (actionResult.error) {
        logger.error(`Action ${aiResponse.action} failed during data submission: ${actionResult.error}`);
        return {
          text: aiResponse.text,
          currentStep,
          isComplete: false,
          action: aiResponse.action,
          actionError: actionResult.error,
          dataSaved: true,
          field: dataType,
        };
      }

      isComplete = actionResult.isComplete ?? false;
      stepAdvanced = !!actionResult.nextStep;
      currentStep = actionResult.nextStep ?? currentStep;

      if (actionResult.triggerAIResponse) {
        followUpText = await this.generateAndStore({ _id: session._id, currentStep }, agent);
      }
    }

    return {
      text: aiResponse.text,
      currentStep,
      isComplete,
      action: aiResponse.action,
      stepAdvanced,
      followUpText,
      dataSaved: true,
      field: dataType,
    };
  }

  // ──────────────────────────────────────────
  // Queries
  // ──────────────────────────────────────────

  async getSessionStatus(sessionId: ObjectId) {
    const session = await this.deps.sessionRepo.findById(sessionId);

    if (!session) {
      return { exists: false, isComplete: false, currentStep: null };
    }

    return {
      exists: true,
      isComplete: session.status === 'completed',
      currentStep: session.currentStep,
    };
  }

  // ──────────────────────────────────────────
  // Step Context (public for ActionHandler)
  // ──────────────────────────────────────────

  /**
   * Inject a system message at the start of a new step with participant
   * name and the last assistant message from the previous step.
   */
  async injectStepContext(
    sessionId: ObjectId,
    newStepKey: string,
    agent: AgentDocument,
    participantName?: string
  ): Promise<void> {
    // Look up participant name from session if not provided (e.g. step transitions)
    if (!participantName) {
      const session = await this.deps.sessionRepo.findByIdOrThrow(sessionId, 'Session');
      const participant = await this.deps.participantRepo.findById(session.participantId);
      participantName = participant?.name;
    }

    const previousMessage = await this.getLastAssistantFromPreviousStep(
      sessionId,
      newStepKey,
      agent
    );

    const parts: string[] = [];
    if (participantName) parts.push(`participant_name: ${participantName}.`);
    if (previousMessage) parts.push(`last_prompt_step: "${previousMessage}".`);

    await this.deps.conversationRepo.addMessage(sessionId, {
      stepKey: newStepKey,
      role: 'system',
      content: parts.join(' '),
    });
  }

  // ══════════════════════════════════════════
  // Private — Initialization Helpers
  // ══════════════════════════════════════════

  /**
   * Generate an AI response, store it, and execute any action.
   * Reusable by init, resume recovery, and follow-up generation.
   */
  private async generateAndStore(
    session: { _id: ObjectId; currentStep: string },
    agent: AgentDocument
  ): Promise<string> {
    const aiResponse = await this.generateResponse(session, agent);

    await this.deps.conversationRepo.addMessage(session._id, {
      stepKey: session.currentStep,
      role: 'assistant',
      content: aiResponse.text,
      action: aiResponse.action,
    });

    if (aiResponse.action) {
      await this.deps.actionHandler.execute(aiResponse.action, session as any, agent, this);
    }

    return aiResponse.text;
  }

  /**
   * Resume an existing session by replaying or recovering the last exchange.
   * Only called when agent.features.sessionPersistence is true.
   */
  private async resumeSession(
    session: { _id: ObjectId; currentStep: string },
    agent: AgentDocument,
    conversation: ConversationDocument
  ): Promise<string> {
    const lastMessage = this.getLastMessage(conversation);
    if (!lastMessage) return '';

    if (lastMessage.role === 'assistant') {
      return lastMessage.content;
    }

    if (lastMessage.role === 'user' || lastMessage.role === 'system') {
      return this.generateAndStore(session, agent);
    }

    return '';
  }

  // ══════════════════════════════════════════
  // Private — LLM Interaction
  // ══════════════════════════════════════════

  /**
   * Build messages from conversation history and call the LLM.
   */
  private async generateResponse(
    session: { _id: ObjectId; currentStep: string },
    agent: AgentDocument
  ): Promise<AIResponse> {
    const conversation = await this.deps.conversationRepo.findBySessionIdOrThrow(session._id);
    const built = await this.buildMessages(agent, session.currentStep, conversation);
    return this.callLLM(built);
  }

  private async callLLM(built: {
    messages: LLMMessage[];
    promptDoc: AgentPromptDocument;
  }): Promise<AIResponse> {
    const { promptDoc, messages } = built;

    const options: CompletionOptions = {
      model: promptDoc.model,
      temperature: promptDoc.temperature ?? 0.7,
      maxTokens: promptDoc.maxTokens ?? 1024,
      reasoningEffort: promptDoc.reasoningEffort,
      responseFormat: 'json',
    };

    const result = await this.deps.llmConnector.complete(messages, options);
    return result.response;
  }

  // ══════════════════════════════════════════
  // Private — Message Building
  // ══════════════════════════════════════════

  /**
   * Assemble the LLM message array:
   *   1. System prompt (from AgentPromptDocument + output format injection)
   *   2. Conversation history for the current step
   *   3. Optional additional user input (e.g. data submission payload)
   */
  private async buildMessages(
    agent: AgentDocument,
    stepKey: string,
    conversation: ConversationDocument,
    additionalInput?: string
  ): Promise<{ messages: LLMMessage[]; promptDoc: AgentPromptDocument }> {
    const promptDoc = await this.deps.promptRepo.findByAgentAndKeyOrThrow(agent._id, stepKey);

    const messages: LLMMessage[] = [
      { role: 'system', content: promptDoc.system + OUTPUT_FORMAT_INJECTION },
    ];

    const stepMessages = conversation.messages.filter((m) => m.stepKey === stepKey);
    for (const msg of stepMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    if (additionalInput) {
      messages.push({ role: 'user', content: additionalInput });
    }

    return { messages, promptDoc };
  }

  // ══════════════════════════════════════════
  // Private — Result Builders
  // ══════════════════════════════════════════

  /**
   * Build a ProcessResult from an AI response, executing any action.
   *
   * If the action returns triggerAIResponse (e.g. STEP_COMPLETED),
   * generates the AI opening for the new step and includes it as followUpText.
   */
  private async buildProcessResult(
    aiResponse: AIResponse,
    session: { _id: ObjectId; currentStep: string; status?: string },
    agent: AgentDocument,
    options?: ProcessOptions
  ): Promise<ProcessResult> {
    let isComplete = false;
    let currentStep = session.currentStep;
    let stepAdvanced = false;
    let clientPayload: Record<string, unknown> | undefined;
    let actionTiming: ProcessResult['actionTiming'];
    let followUpText: string | undefined;
    let voiceOverride: ProcessResult['voiceOverride'];

    if (aiResponse.action && !options?.skipAction) {
      actionTiming = this.deps.actionHandler.getTiming(aiResponse.action);

      const actionResult = await this.deps.actionHandler.execute(
        aiResponse.action,
        session as any,
        agent,
        this
      );

      if (actionResult.error) {
        logger.error(`Action ${aiResponse.action} failed: ${actionResult.error}`);
        return {
          text: aiResponse.text,
          currentStep,
          isComplete: false,
          action: aiResponse.action,
          actionTiming,
          actionError: actionResult.error,
        };
      }

      isComplete = actionResult.isComplete ?? false;
      stepAdvanced = !!actionResult.nextStep;
      currentStep = actionResult.nextStep ?? currentStep;
      clientPayload = actionResult.clientPayload;
      voiceOverride = actionResult.voiceOverride;

      // Action requested an AI follow-up (e.g. STEP_COMPLETED → new step opening)
      if (actionResult.triggerAIResponse) {
        if (actionResult.contextMessage) {
          await this.deps.conversationRepo.addMessage(session._id, {
            stepKey: currentStep,
            role: 'system',
            content: actionResult.contextMessage,
          });
        }
        followUpText = await this.generateAndStore({ _id: session._id, currentStep }, agent);
      }
    }

    return {
      text: aiResponse.text,
      currentStep,
      isComplete,
      action: aiResponse.action,
      actionTiming,
      stepAdvanced,
      clientPayload,
      followUpText,
      voiceOverride,
    };
  }

  private completedResponse(currentStep: string): ProcessResult {
    return {
      text: 'This conversation has already ended.',
      currentStep,
      isComplete: true,
    };
  }

  // ══════════════════════════════════════════
  // Private — Utilities
  // ══════════════════════════════════════════

  private async loadSessionContext(sessionId: ObjectId) {
    const session = await this.deps.sessionRepo.findByIdOrThrow(sessionId, 'Session');
    const agent = await this.deps.agentRepo.findByIdOrThrow(session.agentId, 'Agent');
    return { session, agent };
  }

  private getLastMessage(conversation: ConversationDocument): MessageEntry | undefined {
    const { messages } = conversation;
    return messages.length > 0 ? messages[messages.length - 1] : undefined;
  }

  private async getLastAssistantFromPreviousStep(
    sessionId: ObjectId,
    currentStepKey: string,
    agent: AgentDocument
  ): Promise<string | undefined> {
    const previousStepKey = StateMachine.getPreviousStep(agent, currentStepKey);
    if (!previousStepKey) return undefined;

    const stepMessages = await this.deps.conversationRepo.getMessagesForStep(
      sessionId,
      previousStepKey
    );

    const assistantMessages = stepMessages.filter((m) => m.role === 'assistant');
    if (assistantMessages.length === 0) return undefined;

    return assistantMessages[assistantMessages.length - 1].content;
  }
}

// ══════════════════════════════════════════
// Error & Factory
// ══════════════════════════════════════════

export class ConversationError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}

export function createConversationService(deps: ConversationServiceDeps): ConversationService {
  return new ConversationService(deps);
}
