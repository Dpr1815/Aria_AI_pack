/**
 * Step Category Controller
 *
 * Catalog endpoints for step categories and types.
 * Reads directly from the in-memory step registry — no DB needed.
 */

import { Request, Response, NextFunction } from 'express';
import {
  getStepCategories,
  getStepTypesByCategory,
  getAvailableLanguages,
  getStatisticsTypes,
  getSummaryTypes,
  getStatisticsTypesBySummaryId,
  getSummaryTypesByConversationType,
} from '@modules';
import { ApiResponseBuilder } from '../utils/response';
import { NotFoundError } from '@utils';
import { GoogleTTSConnector } from '@connectors';

export class CategoryController {
  constructor(private readonly tts: GoogleTTSConnector) {}
  /**
   * GET /categories
   * Returns available step categories
   */
  listCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = getStepCategories();
      res.status(200).json(ApiResponseBuilder.success(categories));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /categories/:categoryId/step-types
   * Returns selectable step types for a category
   */
  listStepTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const stepTypes = getStepTypesByCategory(categoryId);

      if (!stepTypes) {
        throw new NotFoundError('Step category', categoryId);
      }

      res.status(200).json(ApiResponseBuilder.success(stepTypes));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /statistics-types
   * Returns all registered statistics types
   */
  listStatistics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const types = getStatisticsTypes();
      res.status(200).json(ApiResponseBuilder.success(types));
    } catch (error) {
      next(error);
    }
  };
  /**
   * GET /statistics-types/by-summary/:summaryTypeId
   * Returns statistics types that consume a given summary type
   */
  listBySummaryType = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { summaryTypeId } = req.params;
      const types = getStatisticsTypesBySummaryId(summaryTypeId);
      res.status(200).json(ApiResponseBuilder.success(types));
    } catch (error) {
      next(error);
    }
  };

  listSummaries = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const types = getSummaryTypes();
      res.status(200).json(ApiResponseBuilder.success(types));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /summary-types/:conversationTypeId
   * Returns summary types compatible with a given conversation type
   */
  listSummariesByConversationType = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { conversationTypeId } = req.params;
      const types = getSummaryTypesByConversationType(conversationTypeId);
      res.status(200).json(ApiResponseBuilder.success(types));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /voices?languageCode=en-US
   * Returns available Google TTS voices, optionally filtered by language code
   */
  listVoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const languageCode = req.query.languageCode as string | undefined;
      const voices = await this.tts.listVoices(languageCode);
      res.status(200).json(ApiResponseBuilder.success(voices));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /languages/:conversationTypeId
   * Returns available conversation languages for the given category
   */
  listLanguages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conversationTypeId } = req.params;
      const languages = getAvailableLanguages(conversationTypeId);
      res.status(200).json(ApiResponseBuilder.success(languages));
    } catch (error) {
      next(error);
    }
  };
}
