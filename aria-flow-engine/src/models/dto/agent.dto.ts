import type {
  VoiceConfig,
  AgentFeatures,
  RenderConfig,
  StepConfig,
  PromptConfig,
  AssessmentConfig,
} from '@validations';
/**
 * Agent response DTO - full agent with optional sparse fieldsets
 */
export interface AgentDTO {
  _id: string;
  label: string;
  ownerId: string;
  organizationId?: string;
  voice: VoiceConfig;
  features: AgentFeatures;
  render: RenderConfig;
  conversationTypeId?: string;
  stepOrder: string[];
  summaryTypeId?: string;
  statisticsTypeId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Sparse fieldsets (only present if requested)
  steps?: Record<string, StepConfig>;
  prompts?: Record<string, PromptConfig>;
  assessment?: AssessmentConfig;
}

/**
 * Agent list item DTO - lighter version for list endpoints
 */
export type AgentListItemDTO = Omit<AgentDTO, 'steps' | 'prompts' | 'assessment'>;

/**
 * Step response DTO
 */
export interface StepDTO {
  _id: string;
  agentId: string;
  key: string;
  label: string;
  order: number;
  nextStep: string | null;
  inputs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Prompt response DTO
 */
export interface PromptDTO {
  _id: string;
  agentId: string;
  key: string;
  system: string;
  model: string;
  temperature: number;
  maxTokens: number;
  messages?: unknown[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Assessment response DTO
 */
export interface AssessmentDTO {
  _id: string;
  agentId: string;
  testContent: string;
  language: string;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
}
