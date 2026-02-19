/**
 * Validations Index
 *
 * Re-exports all Zod validation schemas and helper functions.
 *
 * Usage:
 *   import { parseClientMessage, parseAIResponse } from '@validations';
 *   import { ClientMessageSchema, type ClientMessage } from '@validations';
 */

// ============================================
// WebSocket Message Validations
// ============================================
export {
  // Schemas
  InitMessageSchema,
  StartRecordingMessageSchema,
  AudioMessageSchema,
  StopRecordingMessageSchema,
  SubmitDataMessageSchema,
  ClientMessageSchema,
  TestSolutionPayloadSchema,
  FormResponsePayloadSchema,

  // Types (Zod-inferred — single source of truth)
  type InitMessage,
  type StartRecordingMessage,
  type AudioMessage,
  type StopRecordingMessage,
  type SubmitDataMessage,
  type ClientMessage,
  type ClientMessageType,
  type TestSolutionPayloadInput,
  type FormResponsePayloadInput,

  // Functions
  parseClientMessage,
  safeParseClientMessage,
  parseDataPayload,
  formatValidationError,
} from './websocket.validation';

// ============================================
// AI Response Validations
// ============================================
export {
  // Schemas
  SectionResultSchema,
  AssessmentSectionSchema,
  BehavioralSectionSchema,
  TimeAnalysisSectionSchema,
  FinalSummarySectionSchema,
  SummarySchema,

  // Types
  type SectionResultInput,
  type AssessmentSectionInput,
  type BehavioralSectionInput,
  type TimeAnalysisSectionInput,
  type FinalSummarySectionInput,
  type SummaryInput,

  // Functions
  parseAIResponse,
  safeParseAIResponse,
  parseAIResponseFromString,
  parseSummary,
  hasAction,
  formatAIValidationError,
} from './ai.validation';

// ============================================
// Re-export Zod for convenience
// ============================================
export { z, ZodError } from 'zod';
export type { ZodSchema, ZodType, ZodIssue } from 'zod';
