/**
 * Integration tests for Category flow
 *
 * Tests catalog endpoints that read from in-memory registry
 */

import { CategoryController } from '@controllers/category.controller';
import { GoogleTTSConnector } from '@connectors';
import * as modules from '@modules';
import { Request, Response, NextFunction } from 'express';

// Mock the modules
jest.mock('@modules', () => ({
  getStepCategories: jest.fn(),
  getStepTypesByCategory: jest.fn(),
  getStatisticsTypes: jest.fn(),
  getSummaryTypes: jest.fn(),
  getStatisticsTypesBySummaryId: jest.fn(),
}));

const mockTts = {
  listVoices: jest.fn().mockResolvedValue([]),
  listLanguages: jest.fn().mockResolvedValue([]),
  clearCache: jest.fn(),
} as unknown as GoogleTTSConnector;

describe('Category Flow - Integration', () => {
  let categoryController: CategoryController;

  beforeEach(() => {
    jest.clearAllMocks();
    categoryController = new CategoryController(mockTts);
  });

  describe('List categories flow', () => {
    it('should retrieve all step categories from registry', async () => {
      const mockCategories = [
        { id: 'information', label: 'Information Collection', description: 'Collect user information' },
        { id: 'assessment', label: 'Assessment', description: 'Assess user responses' },
        { id: 'feedback', label: 'Feedback', description: 'Provide feedback' },
      ];

      (modules.getStepCategories as jest.Mock).mockReturnValue(mockCategories);

      const req = {} as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await categoryController.listCategories(req, res, next);

      expect(modules.getStepCategories).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCategories,
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('List step types flow', () => {
    it('should retrieve step types for a specific category', async () => {
      const categoryId = 'information';
      const mockStepTypes = [
        { id: 'text-input', label: 'Text Input', description: 'Free text input' },
        { id: 'email-input', label: 'Email Input', description: 'Email address input' },
        { id: 'multiple-choice', label: 'Multiple Choice', description: 'Select from options' },
      ];

      (modules.getStepTypesByCategory as jest.Mock).mockReturnValue(mockStepTypes);

      const req = {
        params: { categoryId },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await categoryController.listStepTypes(req, res, next);

      expect(modules.getStepTypesByCategory).toHaveBeenCalledWith(categoryId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStepTypes,
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle invalid category id', async () => {
      const categoryId = 'nonexistent';
      (modules.getStepTypesByCategory as jest.Mock).mockReturnValue(null);

      const req = {
        params: { categoryId },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await categoryController.listStepTypes(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Step category'),
        })
      );
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('List statistics types flow', () => {
    it('should retrieve all statistics types from registry', async () => {
      const mockStatisticsTypes = [
        { id: 'completion-rate', label: 'Completion Rate', description: 'Percentage of completed sessions' },
        { id: 'average-time', label: 'Average Time', description: 'Average session duration' },
        { id: 'satisfaction-score', label: 'Satisfaction Score', description: 'User satisfaction rating' },
      ];

      (modules.getStatisticsTypes as jest.Mock).mockReturnValue(mockStatisticsTypes);

      const req = {} as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await categoryController.listStatistics(req, res, next);

      expect(modules.getStatisticsTypes).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStatisticsTypes,
        })
      );
    });
  });

  describe('List statistics by summary type flow', () => {
    it('should retrieve statistics types for a specific summary type', async () => {
      const summaryTypeId = 'session-summary';
      const mockStatisticsTypes = [
        { id: 'completion-metrics', label: 'Completion Metrics' },
        { id: 'engagement-metrics', label: 'Engagement Metrics' },
      ];

      (modules.getStatisticsTypesBySummaryId as jest.Mock).mockReturnValue(mockStatisticsTypes);

      const req = {
        params: { summaryTypeId },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await categoryController.listBySummaryType(req, res, next);

      expect(modules.getStatisticsTypesBySummaryId).toHaveBeenCalledWith(summaryTypeId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStatisticsTypes,
        })
      );
    });

    it('should return empty array for unknown summary type', async () => {
      const summaryTypeId = 'unknown-type';
      (modules.getStatisticsTypesBySummaryId as jest.Mock).mockReturnValue([]);

      const req = {
        params: { summaryTypeId },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await categoryController.listBySummaryType(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
        })
      );
    });
  });

  describe('List summaries flow', () => {
    it('should retrieve all summary types from registry', async () => {
      const mockSummaryTypes = [
        { id: 'session-summary', label: 'Session Summary', description: 'Summary of session interactions' },
        { id: 'conversation-summary', label: 'Conversation Summary', description: 'Summary of conversation flow' },
        { id: 'agent-summary', label: 'Agent Summary', description: 'Summary of agent performance' },
      ];

      (modules.getSummaryTypes as jest.Mock).mockReturnValue(mockSummaryTypes);

      const req = {} as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await categoryController.listSummaries(req, res, next);

      expect(modules.getSummaryTypes).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockSummaryTypes,
        })
      );
    });

    it('should handle empty summary types registry', async () => {
      (modules.getSummaryTypes as jest.Mock).mockReturnValue([]);

      const req = {} as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      await categoryController.listSummaries(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [],
        })
      );
    });
  });
});
