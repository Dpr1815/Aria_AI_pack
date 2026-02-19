/**
 * Step Category Routes
 *
 * Catalog endpoints for browsing available step types.
 * Read-only, no DB — served from in-memory registry.
 */

import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { validateParams } from '../middleware/validation.middleware';
import {
  CategoryIdParamSchema,
  SummaryTypeIdParamSchema,
  ConversationTypeIdParamSchema,
} from '../validations/category.validation';

export interface StepCategoryRouterDependencies {
  controller: CategoryController;
  auth: ReturnType<typeof import('../middleware/auth.middleware').createAuthMiddleware>;
}

export const createCategoryRouter = (deps: StepCategoryRouterDependencies): Router => {
  const router = Router();
  const c = deps.controller;

  /**
   * GET /categories
   * Returns available categories (e.g. ["interview"])
   */
  router.get('/conversation-types', deps.auth, c.listCategories);

  /**
   * GET /categories/:categoryId/step-types
   * Returns selectable step types for the given category
   */
  router.get(
    '/:categoryId/step-types',
    deps.auth,
    validateParams(CategoryIdParamSchema),
    c.listStepTypes
  );
  /**
   * GET /statistics-types
   * Returns all available statistics types
   */
  router.get('/statistics-types', deps.auth, deps.controller.listStatistics);

  /**
   * GET /statistics-types/by-summary/:summaryTypeId
   * Returns statistics types compatible with the given summary type
   */
  router.get(
    '/statistics-types/:summaryTypeId',
    deps.auth,
    validateParams(SummaryTypeIdParamSchema),
    deps.controller.listBySummaryType
  );

  /**
   * GET /summary-types
   * Returns all available summary types
   */
  router.get('/summary-types', deps.auth, deps.controller.listSummaries);

  /**
   * GET /summary-types/:conversationTypeId
   * Returns summary types compatible with the given conversation type
   */
  router.get(
    '/summary-types/:conversationTypeId',
    deps.auth,
    validateParams(ConversationTypeIdParamSchema),
    deps.controller.listSummariesByConversationType
  );

  /**
   * GET /voices?languageCode=en-US
   * Returns available Google TTS voices, optionally filtered by language code
   */
  router.get('/voices', deps.auth, c.listVoices);

  /**
   * GET /languages/:conversationTypeId
   * Returns available conversation languages for the given category
   */
  router.get(
    '/languages/:conversationTypeId',
    deps.auth,
    validateParams(ConversationTypeIdParamSchema),
    c.listLanguages
  );

  return router;
};
