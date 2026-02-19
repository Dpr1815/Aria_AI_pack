import { z } from 'zod';

// ============================================
// PARAM SCHEMAS
// ============================================

export const VideoStepParamSchema = z.object({
  id: z.string().min(1, 'Session ID is required'),
  step: z
    .string()
    .min(1, 'Step name is required')
    .max(100, 'Step name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Step name must be alphanumeric with hyphens/underscores'),
});

// ============================================
// BODY SCHEMAS
// ============================================

/**
 * Validated from multipart form fields (not JSON body).
 * The file itself is handled by multer; these are the text fields.
 */
export const VideoUploadFieldsSchema = z.object({
  step: z
    .string()
    .min(1, 'Step name is required')
    .max(100, 'Step name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Step name must be alphanumeric with hyphens/underscores'),
});

// ============================================
// INFERRED TYPES
// ============================================

export type VideoStepParam = z.infer<typeof VideoStepParamSchema>;
export type VideoUploadFields = z.infer<typeof VideoUploadFieldsSchema>;
