/**
 * WebSocket Message Validations
 *
 * Zod schemas for validating incoming WebSocket messages from clients.
 * These schemas are the SINGLE SOURCE OF TRUTH for client message types.
 *
 * TypeScript types are derived via z.infer<> — do NOT define them manually elsewhere.
 */

import { z } from 'zod';

// ============================================
// Client → Server Message Schemas
// ============================================

/**
 * Init Message
 * Sent when client first connects to establish session.
 */
export const InitMessageSchema = z.object({
  type: z.literal('init'),
  accessToken: z.string().min(1, 'accessToken is required'),
});

/**
 * Start Recording Message
 * Sent when client starts recording audio.
 */
export const StartRecordingMessageSchema = z.object({
  type: z.literal('startRecording'),
});

/**
 * Audio Message
 * Sent with each audio chunk during recording (base64-encoded).
 */
export const AudioMessageSchema = z.object({
  type: z.literal('audio'),
  data: z.string().min(1, 'audio data is required'),
});

/**
 * Stop Recording Message
 * Sent when client stops recording.
 */
export const StopRecordingMessageSchema = z.object({
  type: z.literal('stopRecording'),
  latency: z.number().nonnegative().optional(),
});

/**
 * Submit Data Message
 * Generic message for submitting any type of data (forms, test solutions, etc.).
 */
export const SubmitDataMessageSchema = z.object({
  type: z.literal('submitData'),
  dataType: z.string().min(1, 'dataType is required').regex(/^[a-zA-Z0-9_-]+$/, 'dataType contains invalid characters'),
  payload: z.unknown(),
  latency: z.number().nonnegative().optional(),
});

/**
 * Ping Message
 * Application-level heartbeat from client.
 */
export const PingMessageSchema = z.object({
  type: z.literal('ping'),
});

// ============================================
// Discriminated Union for All Client Messages
// ============================================

export const ClientMessageSchema = z.discriminatedUnion('type', [
  InitMessageSchema,
  StartRecordingMessageSchema,
  AudioMessageSchema,
  StopRecordingMessageSchema,
  SubmitDataMessageSchema,
  PingMessageSchema,
]);

// ============================================
// Inferred Types (Single Source of Truth)
// ============================================

export type InitMessage = z.infer<typeof InitMessageSchema>;
export type StartRecordingMessage = z.infer<typeof StartRecordingMessageSchema>;
export type AudioMessage = z.infer<typeof AudioMessageSchema>;
export type StopRecordingMessage = z.infer<typeof StopRecordingMessageSchema>;
export type SubmitDataMessage = z.infer<typeof SubmitDataMessageSchema>;
export type PingMessage = z.infer<typeof PingMessageSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ClientMessageType = ClientMessage['type'];

// ============================================
// Specific Data Payload Schemas
// ============================================

/**
 * Test Solution Payload
 * For submitting code/test answers.
 */
export const TestSolutionPayloadSchema = z.object({
  solution: z.string().min(1, 'solution is required'),
  language: z.string().optional(),
  timeSpentMs: z.number().nonnegative().optional(),
});

export type TestSolutionPayloadInput = z.infer<typeof TestSolutionPayloadSchema>;

/**
 * Form Response Payload
 * For submitting form data.
 */
export const FormResponsePayloadSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
  formId: z.string().optional(),
  submittedAt: z.string().datetime().optional(),
});

export type FormResponsePayloadInput = z.infer<typeof FormResponsePayloadSchema>;

// ============================================
// Validation Helper Functions
// ============================================

/**
 * Parse and validate a client message.
 * Returns typed message or throws ZodError.
 */
export function parseClientMessage(data: unknown): ClientMessage {
  return ClientMessageSchema.parse(data);
}

/**
 * Safely parse a client message.
 * Returns result object with success/error.
 */
export function safeParseClientMessage(data: unknown) {
  return ClientMessageSchema.safeParse(data);
}

/**
 * Validate data payload based on dataType.
 */
export function parseDataPayload(dataType: string, payload: unknown) {
  switch (dataType) {
    case 'testSolution':
      return TestSolutionPayloadSchema.parse(payload);
    case 'formResponse':
      return FormResponsePayloadSchema.parse(payload);
    default:
      return payload;
  }
}

// ============================================
// Error Formatting
// ============================================

/**
 * Format Zod error for client-friendly message.
 */
export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return issues.join('; ');
}
