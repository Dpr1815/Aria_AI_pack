import { ObjectId, Filter } from 'mongodb';
import {
  SummaryRepository,
  SessionRepository,
  AgentRepository,
  AgentStepRepository,
  AgentAssessmentRepository,
} from '@repositories';
import { ConversationService } from './conversation.service';
import { GenerateSummaryInput, SummaryQueryInput } from '@validations';
import {
  SummaryDTO,
  AgentStepDocument,
  ConversationDocument,
  SummaryDocument,
  SessionDocument,
} from '@models';
import { SummaryDefinition, SummarySectionDefinition, getSummaryConfig } from '@modules/summaries';
import { getStepDefinition } from '@modules/steps';
import { OpenAIService } from './ai/openai.service';
import { PromptBuilderService } from './ai/prompt-builder.service';
import { createLogger, PaginatedResult, NotFoundError, toObjectId } from '@utils';

const logger = createLogger('SummaryService');

// ============================================
// INTERNAL TYPES
// ============================================

interface AgentContext {
  label: string;
  voice: { languageCode: string };
  stepOrder: string[];
}

interface GenerationContext {
  agent: AgentContext;
  session: SessionDocument;
}

interface TimeAnalysis {
  totalDurationMs: number;
  averageResponseTimeMs: number;
  engagementScore: number;
}

// ============================================
// SERVICE
// ============================================

export class SummaryService {
  constructor(
    private readonly summaryRepository: SummaryRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly agentRepository: AgentRepository,
    private readonly agentStepRepository: AgentStepRepository,
    private readonly agentAssessmentRepository: AgentAssessmentRepository,

    private readonly conversationService: ConversationService,
    private readonly openaiService: OpenAIService,
    private readonly promptBuilder: PromptBuilderService
  ) {}

  // ============================================
  // GENERATE
  // ============================================

  async generate(sessionId: string | ObjectId): Promise<SummaryDTO> {
    const sessionObjectId = toObjectId(sessionId);

    const session = await this.sessionRepository.findByIdOrThrow(sessionObjectId, 'Session');

    const agent = await this.agentRepository.findByIdOrThrow(session.agentId, 'Agent');
    if (!agent.summaryTypeId) {
      throw new NotFoundError('Summary ID in the Agent card', session.agentId.toString());
    }
    const typeId = agent.summaryTypeId;

    const config = getSummaryConfig(typeId);

    const summaryData = await this.generateSummaryData(sessionObjectId, session, agent, config);

    const summary = await this.summaryRepository.upsert(
      { sessionId: sessionObjectId } as Filter<SummaryDocument>,
      {
        sessionId: sessionObjectId,
        agentId: session.agentId,
        participantId: session.participantId,
        typeId,
        data: summaryData,
        generatedAt: new Date(),
      } as SummaryDocument
    );

    logger.info('Summary generated', {
      summaryId: summary._id.toString(),
      sessionId: sessionObjectId.toString(),
      typeId,
    });

    return this.toResponse(summary);
  }

  async regenerate(
    sessionId: string | ObjectId,
    input: GenerateSummaryInput = {}
  ): Promise<SummaryDTO> {
    const sessionObjectId = toObjectId(sessionId);
    const session = await this.sessionRepository.findByIdOrThrow(sessionObjectId, 'Session');

    const agent = await this.agentRepository.findByIdOrThrow(session.agentId, 'Agent');
    if (!agent.summaryTypeId) {
      throw new NotFoundError('Summary ID in the Agent card', sessionId.toString());
    }
    const existingSummary = await this.summaryRepository.findBySessionId(sessionObjectId);
    if (existingSummary) {
      await this.summaryRepository.deleteById(existingSummary._id);
      logger.info('Existing summary deleted for regeneration', {
        summaryId: existingSummary._id.toString(),
      });
    }

    return this.generate(sessionObjectId);
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  async getById(summaryId: string | ObjectId): Promise<SummaryDTO> {
    const summary = await this.summaryRepository.findByIdOrThrow(summaryId, 'Summary');
    return this.toResponse(summary);
  }

  async getBySessionId(sessionId: string | ObjectId): Promise<SummaryDTO> {
    const sessionObjectId = toObjectId(sessionId);
    const summary = await this.summaryRepository.findBySessionId(sessionObjectId);
    if (!summary) {
      throw new NotFoundError('Summary for session', sessionId.toString());
    }
    return this.toResponse(summary);
  }

  async list(agentIds: ObjectId[], query: SummaryQueryInput): Promise<PaginatedResult<SummaryDTO>> {
    const filters: {
      agentId?: ObjectId;
      participantId?: ObjectId;
      typeId?: string;
    } = {};

    if (query.agentId) filters.agentId = new ObjectId(query.agentId);
    if (query.participantId) filters.participantId = new ObjectId(query.participantId);
    if (query.typeId) filters.typeId = query.typeId;

    const result = await this.summaryRepository.findByAgentIdsWithFilters(agentIds, filters, {
      page: query.page,
      limit: query.limit,
    });

    return this.toPaginatedResponse(result);
  }

  async listByAgent(
    agentId: string | ObjectId,
    options: { typeId?: string; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<SummaryDTO>> {
    const objectId = toObjectId(agentId);
    const result = await this.summaryRepository.findByAgentId(objectId, options);
    return this.toPaginatedResponse(result);
  }

  async listByParticipant(
    participantId: string | ObjectId,
    options: { typeId?: string; page?: number; limit?: number } = {}
  ): Promise<PaginatedResult<SummaryDTO>> {
    const objectId = toObjectId(participantId);
    const result = await this.summaryRepository.findByParticipantId(objectId, options);
    return this.toPaginatedResponse(result);
  }

  // ============================================
  // DELETE
  // ============================================

  async delete(summaryId: string | ObjectId): Promise<void> {
    await this.summaryRepository.deleteByIdOrThrow(summaryId, 'Summary');
    logger.info('Summary deleted', { summaryId: summaryId.toString() });
  }

  async deleteBySession(sessionId: string | ObjectId): Promise<void> {
    const sessionObjectId = toObjectId(sessionId);
    await this.summaryRepository.deleteBySessionId(sessionObjectId);
    logger.info('Summary deleted by session', { sessionId: sessionObjectId.toString() });
  }

  // ============================================
  // CONFIG-DRIVEN GENERATION PIPELINE
  // ============================================

  /**
   * Executes the full summary generation pipeline:
   *
   * 1. Load conversation + agent steps (batch, no N+1)
   * 2. For each section in config: build prompt → execute → validate
   * 3. Aggregate section results into main prompt → execute → validate
   */
  private async generateSummaryData(
    sessionId: ObjectId,
    session: SessionDocument,
    agent: AgentContext,
    config: SummaryDefinition
  ): Promise<Record<string, unknown>> {
    // Batch-load all data upfront
    const [conversation, agentSteps] = await Promise.all([
      this.conversationService.getBySessionId(sessionId),
      this.agentStepRepository.findByAgentId(session.agentId),
    ]);

    const stepMap = this.buildStepMap(agentSteps);
    const langSuffix = this.resolveLangSuffix(agent.voice.languageCode);
    const context: GenerationContext = { agent, session };

    // Phase 1: Execute section prompts sequentially (supports chaining)
    const sectionResults = await this.executeSections(
      config.sections,
      agent.stepOrder,
      stepMap,
      conversation,
      langSuffix,
      session
    );

    // Phase 2: Execute main aggregation prompt
    const includeTimeAnalysis = config.main.variables.injectTimeAnalysis !== false;
    const timeAnalysis = includeTimeAnalysis
      ? this.calculateTimeAnalysis(session, conversation)
      : undefined;

    const mainResult = await this.executeMainPrompt(
      config.main,
      sectionResults,
      timeAnalysis,
      context,
      langSuffix
    );

    const result: Record<string, unknown> = {
      ...mainResult,
      sections: sectionResults,
    };

    if (timeAnalysis) {
      result.timeAnalysis = timeAnalysis;
    }

    return result;
  }

  // ============================================
  // PHASE 1: SECTION EXECUTION
  // ============================================

  /**
   * Execute all section prompts sequentially.
   * Sequential execution enables fromSections chaining.
   */
  private async executeSections(
    sections: SummarySectionDefinition[],
    stepOrder: string[],
    stepMap: Map<string, AgentStepDocument>,
    conversation: ConversationDocument,
    langSuffix: string,
    session: SessionDocument
  ): Promise<Record<string, Record<string, unknown>>> {
    const sectionResults: Record<string, Record<string, unknown>> = {};

    for (const section of sections) {
      // Check if the step exists in the agent's stepOrder
      if (!stepOrder.includes(section.key)) {
        if (section.required) {
          throw new NotFoundError(
            `Required step '${section.key}' not found in agent stepOrder for summary section`
          );
        }
        logger.debug(`Skipping optional section '${section.key}' — step not in agent stepOrder`);
        continue;
      }

      try {
        const result = await this.executeSection(
          section,
          stepMap,
          conversation,
          sectionResults,
          langSuffix,
          session
        );
        sectionResults[section.key] = result;

        logger.debug(`Section '${section.key}' completed`, {
          score: (result as Record<string, unknown>).score,
        });
      } catch (error) {
        if (section.required) {
          throw error;
        }
        logger.warn(`Optional section '${section.key}' failed, skipping`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return sectionResults;
  }

  /**
   * Execute a single section prompt.
   */
  private async executeSection(
    section: SummarySectionDefinition,
    stepMap: Map<string, AgentStepDocument>,
    conversation: ConversationDocument,
    previousResults: Record<string, Record<string, unknown>>,
    langSuffix: string,
    session: SessionDocument
  ): Promise<Record<string, unknown>> {
    // 1. Build prompt variables from section config
    const variables = await this.resolveSectionVariables(
      section,
      stepMap,
      previousResults,
      session
    );
    const userMessage = this.resolveUserMessage(section, conversation, session);
    // 2. Resolve language-specific template ID
    const templateId = `${section.promptId}_${langSuffix}`;

    // 3. Build and execute prompt
    const builtPrompt = await this.promptBuilder.buildPrompt({
      templateId,
      variables,
      options: { responseFormat: 'json_object' },
    });

    const result = await this.openaiService.executeWithSystemPromptJSON<Record<string, unknown>>(
      builtPrompt.content,
      JSON.stringify(userMessage),
      {
        model: builtPrompt.model,
        maxTokens: builtPrompt.maxTokens,
        temperature: builtPrompt.temperature,
      }
    );
    // 4. Validate against section output schema
    return section.outputSchema.parse(result.content);
  }
  /**
   * Resolve all variables for a user message.
   */
  private resolveUserMessage(
    section: SummarySectionDefinition,
    conversation: ConversationDocument,
    session: SessionDocument
  ): Record<string, unknown> {
    const variables: Record<string, unknown> = {};
    const config = section.variables;

    // 1. Conversation text (filtered by expandsTo or [stepKey])
    if (config.injectConversation !== false) {
      const stepKeys = this.resolveStepKeys(section.key);
      const filteredMessages = conversation.messages.filter((m) => stepKeys.includes(m.stepKey));
      const conversationText = this.formatConversationForPrompt(filteredMessages);

      const varName = config.conversationVariableName || 'conversation';
      variables[varName] = conversationText;
    }

    // 2. Variables from previous section outputs (chaining)
    if (config.injectSessiondata !== false) {
      const submitted_data = session.data[section.key];
      const varName = 'submitted_data';
      variables[varName] = submitted_data;
    }

    return variables;
  }
  /**
   * Resolve all variables for a section prompt based on its config.
   */
  private async resolveSectionVariables(
    section: SummarySectionDefinition,
    stepMap: Map<string, AgentStepDocument>,
    previousResults: Record<string, Record<string, unknown>>,
    session: SessionDocument
  ): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {};
    const config = section.variables;

    // 1. Step card inputs
    if (config.fromStepCard?.length) {
      const stepDoc = stepMap.get(section.key);
      if (stepDoc) {
        for (const key of config.fromStepCard) {
          if (stepDoc.inputs[key] !== undefined) {
            variables[key] = stepDoc.inputs[key];
          }
        }
      } else {
        logger.warn(`AgentStepDocument not found for step '${section.key}'`);
      }
    }
    // 1.5 Step assessment card
    if (config.fromAssessmentCard?.length) {
      const assessment_doc = await this.agentAssessmentRepository.findByAgentId(session.agentId);
      if (assessment_doc) {
        const assessmentData = assessment_doc as unknown as Record<string, unknown>;
        for (const key of config.fromAssessmentCard) {
          if (assessmentData[key] !== undefined) {
            variables[key] = assessmentData[key];
          }
        }
      } else {
        logger.warn(`Agent Assessment doc not found `);
      }
    }
    // 2. Static variables
    if (config.static) {
      Object.assign(variables, config.static);
    }

    // 3. Variables from previous section outputs (chaining)
    if (config.fromSections) {
      for (const [varName, sourcePath] of Object.entries(config.fromSections)) {
        const value = this.resolveNestedValue(previousResults, sourcePath);
        if (value !== undefined) {
          variables[varName] = value;
        }
      }
    }

    return variables;
  }

  /**
   * Resolve which step keys to gather conversation messages from.
   * Uses expandsTo from step registry if defined, otherwise [stepKey].
   */
  private resolveStepKeys(stepKey: string): string[] {
    const stepDef = getStepDefinition(stepKey);
    if (stepDef?.expandsTo?.length) {
      return stepDef.expandsTo;
    }
    return [stepKey];
  }

  // ============================================
  // PHASE 2: MAIN AGGREGATION
  // ============================================

  /**
   * Execute the main aggregation prompt with all section results.
   */
  private async executeMainPrompt(
    mainConfig: SummaryDefinition['main'],
    sectionResults: Record<string, Record<string, unknown>>,
    timeAnalysis: TimeAnalysis | undefined,
    context: GenerationContext,
    langSuffix: string
  ): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {};
    const config = mainConfig.variables;

    // 1. Section results blob
    if (config.injectSectionResults !== false) {
      const varName = config.sectionResultsVariableName || 'sectionResults';
      variables[varName] = JSON.stringify(sectionResults, null, 2);
    }

    // 2. Time analysis (only if calculated)
    if (timeAnalysis) {
      variables['timeAnalysis'] = JSON.stringify(timeAnalysis);
    }

    // 3. Context variables (dot-path resolution into agent/session)
    if (config.fromContext) {
      for (const [varName, path] of Object.entries(config.fromContext)) {
        const value = this.resolveNestedValue(context, path);
        if (value !== undefined) {
          variables[varName] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      }
    }

    // 4. Static variables
    if (config.static) {
      Object.assign(variables, config.static);
    }

    // 5. Build and execute
    const templateId = `${mainConfig.promptId}_${langSuffix}`;

    const builtPrompt = await this.promptBuilder.buildPrompt({
      templateId,
      variables,
      options: { responseFormat: 'json_object' },
    });

    const result = await this.openaiService.executePromptJSON<Record<string, unknown>>(builtPrompt);

    return result.content;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Build a Map<stepKey, AgentStepDocument> for O(1) lookup.
   */
  private buildStepMap(agentSteps: AgentStepDocument[]): Map<string, AgentStepDocument> {
    const map = new Map<string, AgentStepDocument>();
    for (const step of agentSteps) {
      map.set(step.key, step);
    }
    return map;
  }

  /**
   * Extract language suffix from languageCode.
   * 'en-US' → 'en', 'it-IT' → 'it'
   */
  private resolveLangSuffix(languageCode: string): string {
    return languageCode.split('-')[0].toLowerCase();
  }

  /**
   * Resolve a dot-notated path on an object.
   * e.g. resolveNestedValue({ agent: { label: 'X' } }, 'agent.label') → 'X'
   */
  private resolveNestedValue(obj: object, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Format messages into a structured text block for prompt injection.
   */
  private formatConversationForPrompt(
    messages: Array<{ role: string; content: string; stepKey?: string }>
  ): string {
    const parts: string[] = [];
    let currentStep = '';

    for (const message of messages) {
      if (message.stepKey && message.stepKey !== currentStep) {
        currentStep = message.stepKey;
      }
      const role = message.role.toUpperCase();
      parts.push(`[${role}]: ${message.content}`);
    }

    return parts.join('\n');
  }

  /**
   * Calculate time analysis from session timestamps and message latencies.
   */
  private calculateTimeAnalysis(
    session: SessionDocument,
    conversation: ConversationDocument
  ): TimeAnalysis {
    const sessionStart = session.createdAt.getTime();
    const sessionEnd = session.updatedAt.getTime();
    const totalDurationMs = sessionEnd - sessionStart;

    // Compute average response time from message latencies
    const latencies = conversation.messages
      .filter((m) => m.latencyMs !== undefined && m.latencyMs > 0)
      .map((m) => m.latencyMs!);

    const averageResponseTimeMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length)
        : 0;

    const engagementScore = this.calculateEngagementScore(averageResponseTimeMs, totalDurationMs);

    return { totalDurationMs, averageResponseTimeMs, engagementScore };
  }

  private calculateEngagementScore(avgResponseTime: number, totalDuration: number): number {
    let score = 7;

    if (avgResponseTime > 0) {
      if (avgResponseTime < 2000) score += 1.5;
      else if (avgResponseTime < 4000) score += 0.5;
      else if (avgResponseTime > 8000) score -= 1;
    }

    if (totalDuration > 600000) score += 0.5;

    return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
  }

  // ============================================
  // RESPONSE TRANSFORMERS
  // ============================================

  private toResponse(summary: SummaryDocument): SummaryDTO {
    return {
      _id: summary._id.toString(),
      sessionId: summary.sessionId.toString(),
      agentId: summary.agentId.toString(),
      participantId: summary.participantId.toString(),
      typeId: summary.typeId,
      data: summary.data,
      generatedAt: summary.generatedAt.toISOString(),
    };
  }

  private toPaginatedResponse(
    result: PaginatedResult<SummaryDocument>
  ): PaginatedResult<SummaryDTO> {
    return {
      ...result,
      data: result.data.map((doc) => this.toResponse(doc)),
    };
  }
}
