/**
 * Conversation Types
 *
 * SINGLE SOURCE OF TRUTH for:
 * - LLMMessageRole, LLMMessage (used by connectors, documents, services)
 * - AIResponse (what the LLM returns: { text: string, action?: string })
 *
 * DESIGN:
 * - The LLM returns flat JSON: { text, action } where action is a string key or empty.
 * - Action types are resolved via the action registry at runtime.
 * - Document types define data shape. This file defines operational types.
 */

import type { ObjectId } from 'mongodb';
import type {
  AgentDocument,
  SessionDocument,
  ConversationDocument,
  AgentPromptDocument,
} from '@models';
import type { VoiceConfig } from './audio.types';

// ============================================
// LLM Interaction (Single Source of Truth)
// ============================================

export type LLMMessageRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}

// ============================================
// AI Response
// ============================================

/**
 * What the LLM returns. Flat JSON, no nesting.
 *
 * { "text": "Hello!", "action": "" }
 * { "text": "Moving on.", "action": "STEP_COMPLETED" }
 */
export interface AIResponse {
  text: string;
  /** Action key (e.g. "STEP_COMPLETED") or undefined/empty if no action. */
  action?: string;
}

// ============================================
// Action System (Registry-Based)
// ============================================

export const ActionType = {
  STEP_COMPLETED: 'STEP_COMPLETED',
  CONVERSATION_COMPLETE: 'CONVERSATION_COMPLETE',
  START_TEST: 'START_TEST',
  START_LINGUISTIC: 'START_LINGUISTIC',
  STOP_LINGUISTIC: 'STOP_LINGUISTIC',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export interface ActionContext {
  session: SessionDocument;
  agent: AgentDocument;
  services: ActionServices;
}

export interface ActionServices {
  sessionRepo: ActionSessionRepo;
  conversationRepo: ActionConversationRepo;
  promptRepo: ActionPromptRepo;
  conversationService: ActionConversationService;
  assessmentRepo?: ActionAssessmentRepo;
  stepRepo?: ActionStepRepo;
}

export interface ActionSessionRepo {
  updateStatus(sessionId: ObjectId, status: string): Promise<SessionDocument | null>;
  updateCurrentStep(sessionId: ObjectId, stepKey: string): Promise<SessionDocument | null>;
  updateById(id: ObjectId, update: object): Promise<SessionDocument | null>;
}

export interface ActionConversationRepo {
  getMessagesForStep(
    sessionId: ObjectId,
    stepKey: string
  ): Promise<import('@models').MessageEntry[]>;
  addMessage(
    sessionId: ObjectId,
    message: Omit<import('@models').MessageEntry, 'sequence' | 'createdAt'>
  ): Promise<ConversationDocument | null>;
}

export interface ActionPromptRepo {
  findByAgentAndKey(agentId: ObjectId, key: string): Promise<AgentPromptDocument | null>;
}

export interface ActionConversationService {
  injectStepContext(
    sessionId: ObjectId,
    newStepKey: string,
    agent: AgentDocument,
    participantName?: string
  ): Promise<void>;
}

export interface ActionAssessmentRepo {
  findByAgentId(agentId: ObjectId): Promise<import('@models').AgentAssessmentDocument | null>;
}

export interface ActionStepRepo {
  findByAgentAndKey(agentId: ObjectId, key: string): Promise<import('@models').AgentStepDocument | null>;
}

/**
 * Result returned by every action executor.
 */
export interface ActionResult {
  nextStep?: string;
  isComplete?: boolean;
  responseText?: string;
  triggerAIResponse?: boolean;
  contextMessage?: string;
  clientPayload?: Record<string, unknown>;
  /** Override the TTS/STT voice for subsequent responses (e.g. linguistic mode) */
  voiceOverride?: VoiceConfig;
  error?: string;
}

export type ActionExecutor = (
  payload: Record<string, unknown> | undefined,
  context: ActionContext
) => Promise<ActionResult>;

export type ActionRegistry = Record<string, ActionExecutor>;

// ============================================
// Conversation Service Results
// ============================================

export interface InitializeResult {
  sessionId: ObjectId;
  agent: AgentDocument;
  text: string;
  currentStep: string;
  isNewSession: boolean;
}

export interface ProcessResult {
  /** AI response text for the current step */
  text: string;
  currentStep: string;
  isComplete: boolean;
  /** Action key from the AI response, if any */
  action?: string;
  actionTiming?: 'before_response' | 'after_response';
  /** True when the action advanced to a new step (set by ConversationService) */
  stepAdvanced?: boolean;
  clientPayload?: Record<string, unknown>;
  /**
   * AI-generated opening for the NEW step after a transition (e.g. STEP_COMPLETED).
   * When present, the WS handler should deliver this as a second response + audio.
   */
  followUpText?: string;
  /** Override the TTS/STT voice for this and subsequent responses (e.g. linguistic mode) */
  voiceOverride?: VoiceConfig;
  /** Error message if the action failed during execution */
  actionError?: string;
}

export interface ProcessDataResult extends ProcessResult {
  dataSaved: boolean;
  field: string;
}

// ============================================
// State Machine Types
// ============================================

export interface StepInfo {
  key: string;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface StepTransition {
  from: string;
  to: string | null;
  isLast: boolean;
}

export interface NavigationResult {
  currentStep: string;
  nextStep: string | null;
  previousStep: string | null;
  isFirst: boolean;
  isLast: boolean;
  progress: number;
}
