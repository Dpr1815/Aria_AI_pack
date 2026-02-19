/**
 * Step Category Validations
 */

import { z } from 'zod';

export const CategoryIdParamSchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
});
export const SummaryTypeIdParamSchema = z.object({
  summaryTypeId: z.string().min(1, 'Summary type ID is required'),
});
export const ConversationTypeIdParamSchema = z.object({
  conversationTypeId: z.string().min(1, 'Conversation type ID is required'),
});
export type CategoryIdParam = z.infer<typeof CategoryIdParamSchema>;
