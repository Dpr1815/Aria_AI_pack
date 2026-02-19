import { ReasoningEffort } from '@connectors/llm/model-capabilities';
// ============================================
// API Response Types
// ============================================

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Pagination query parameters (from request)
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/**
 * Paginated result from service layer
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
/**
 * query options from service layer
 */

export interface QueryOptions {
  skip?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
}
/**
 * Successful API response
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

/**
 * Error API response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>; // Validation errors
    requestId?: string;
    stack?: string;
  };
}

/**
 * Union type for any API response
 */
export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

// ============================================
// OPEN AI PROMPT Types
// ============================================

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: PromptCategory;
  model?: string;
  useWebSearch?: boolean;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: ReasoningEffort;
  responseFormat?: 'json_object' | 'text';
}

export type PromptCategory = 'generation' | 'conversation' | 'summary';

export interface PromptContext {
  userId?: string;
  assessmentId?: string;
  participantData?: any;
  questionContext?: any;
  previousResponses?: any[];
  reportData?: any;
  assessmentResults?: any;
}

export interface BuildPromptParams {
  templateId: string;
  context?: PromptContext;
  variables: Record<string, any>;
  options?: PromptOptions;
}

export interface PromptOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  customInstructions?: string;
  reasoningEffort?: ReasoningEffort;
  responseFormat?: 'json_object' | 'text';
}

export interface BuiltPrompt {
  content: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  reasoningEffort?: ReasoningEffort;
  useWebSearch?: boolean;
  responseFormat?: 'json_object' | 'text';
  templateId?: string;
  originalVariables?: Record<string, any>;
  originalTemplate?: string;
}

// ============================================
// LLM Interaction
// ============================================

export type LLMMessageRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}
export interface LLMCompletionConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  usage: LLMUsage;
  finishReason: string;
}

export interface LLMJSONCompletionResult<T> extends Omit<LLMCompletionResult, 'content'> {
  content: T;
  raw: string;
}
