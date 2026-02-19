/**
 * Unit tests for agent validation schemas
 */

import {
  VoiceConfigSchema,
  AgentFeaturesSchema,
  RenderConfigSchema,
  StepConfigSchema,
  PromptConfigSchema,
  AssessmentConfigSchema,
  AgentQuerySchema,
  AgentIdParamSchema,
  AgentGetByIdQuerySchema,
  UpdateStepSchema,
  UpdatePromptSchema,
  UpdateAssessmentSchema,
  AgentStepKeyParamSchema,
  AgentPromptKeyParamSchema,
  AddStepSchema,
  parseIncludeQuery,
  GenerateStepSchema,
} from '../../../src/validations/agent.validation';

// Mock @modules — these are called by schema refinements
jest.mock('@modules', () => ({
  ...jest.requireActual('@modules'),
  getStepCategories: jest.fn().mockReturnValue(['interview', 'learningDevelopment']),
  getAllStepIds: jest.fn().mockReturnValue(['intro', 'background', 'behavioral', 'work', 'conclusion', 'assessment']),
  getStepDefinition: jest.fn().mockReturnValue(null),
  getSummaryConfig: jest.fn().mockReturnValue({ compatibleConversationTypes: ['interview'] }),
  getStatisticsConfig: jest.fn().mockReturnValue({ requiredSummaryTypeId: 'interview-summary' }),
  isSummaryTypeRegistered: jest.fn().mockReturnValue(true),
  isStatisticsTypeRegistered: jest.fn().mockReturnValue(true),
  isValidStep: jest.fn().mockReturnValue(true),
  isReportStep: jest.fn().mockReturnValue(false),
  isSubStep: jest.fn().mockReturnValue(false),
  isFirstPositionStep: jest.fn().mockReturnValue(false),
  isLastPositionStep: jest.fn().mockReturnValue(false),
  getParentStep: jest.fn().mockReturnValue(undefined),
  expandStepOrder: jest.fn().mockImplementation((order: string[]) => order),
  STEP_INPUT_SCHEMAS: {},
}));

import {
  getStepCategories,
  getAllStepIds,
  isSummaryTypeRegistered,
  isStatisticsTypeRegistered,
  isValidStep,
  isReportStep,
  isSubStep,
  getParentStep,
} from '@modules';

describe('agent validation schemas', () => {
  beforeEach(() => {
    // Re-apply mock implementations (resetMocks: true clears them)
    (getStepCategories as jest.Mock).mockReturnValue(['interview', 'learningDevelopment']);
    (getAllStepIds as jest.Mock).mockReturnValue(['intro', 'background', 'behavioral', 'work', 'conclusion', 'assessment']);
    (isSummaryTypeRegistered as jest.Mock).mockReturnValue(true);
    (isStatisticsTypeRegistered as jest.Mock).mockReturnValue(true);
    (isValidStep as jest.Mock).mockReturnValue(true);
    (isReportStep as jest.Mock).mockReturnValue(false);
    (isSubStep as jest.Mock).mockReturnValue(false);
    (getParentStep as jest.Mock).mockReturnValue(undefined);
  });

  // ============================================
  // VoiceConfigSchema
  // ============================================

  describe('VoiceConfigSchema', () => {
    it('should accept valid voice config', () => {
      const result = VoiceConfigSchema.safeParse({
        languageCode: 'en-US',
        name: 'Aria',
        gender: 'FEMALE',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing languageCode', () => {
      const result = VoiceConfigSchema.safeParse({ name: 'Aria', gender: 'MALE' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid gender', () => {
      const result = VoiceConfigSchema.safeParse({
        languageCode: 'en',
        name: 'Aria',
        gender: 'OTHER',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // AgentFeaturesSchema
  // ============================================

  describe('AgentFeaturesSchema', () => {
    it('should apply defaults', () => {
      const result = AgentFeaturesSchema.parse({});
      expect(result).toEqual({
        lipSync: false,
        sessionPersistence: true,
        autoSummary: true,
        videoRecording: false,
      });
    });

    it('should accept overrides', () => {
      const result = AgentFeaturesSchema.parse({ lipSync: true, videoRecording: true });
      expect(result.lipSync).toBe(true);
      expect(result.videoRecording).toBe(true);
    });
  });

  // ============================================
  // RenderConfigSchema
  // ============================================

  describe('RenderConfigSchema', () => {
    it('should accept avatar mode', () => {
      const result = RenderConfigSchema.safeParse({ mode: 'avatar' });
      expect(result.success).toBe(true);
    });

    it('should accept presentation mode with link', () => {
      const result = RenderConfigSchema.safeParse({
        mode: 'presentation',
        presentation: { link: 'https://example.com/slides' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid mode', () => {
      const result = RenderConfigSchema.safeParse({ mode: 'video' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // StepConfigSchema
  // ============================================

  describe('StepConfigSchema', () => {
    it('should accept valid step config', () => {
      const result = StepConfigSchema.safeParse({
        label: 'Introduction',
        order: 1,
        nextStep: 'background',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty label', () => {
      const result = StepConfigSchema.safeParse({
        label: '',
        order: 1,
        nextStep: null,
      });
      expect(result.success).toBe(false);
    });

    it('should accept null nextStep', () => {
      const result = StepConfigSchema.safeParse({
        label: 'Last',
        order: 3,
        nextStep: null,
      });
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // PromptConfigSchema
  // ============================================

  describe('PromptConfigSchema', () => {
    it('should accept valid prompt config', () => {
      const result = PromptConfigSchema.safeParse({
        system: 'You are an assistant.',
        model: 'gpt-4.1-nano',
        temperature: 0.7,
        maxTokens: 4096,
      });
      expect(result.success).toBe(true);
    });

    it('should reject temperature > 2', () => {
      const result = PromptConfigSchema.safeParse({
        system: 'prompt',
        model: 'gpt-4',
        temperature: 3,
        maxTokens: 100,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // AssessmentConfigSchema
  // ============================================

  describe('AssessmentConfigSchema', () => {
    it('should accept valid assessment config', () => {
      const result = AssessmentConfigSchema.safeParse({
        testContent: 'Test content here',
        language: 'en',
        durationSeconds: 1800,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-positive duration', () => {
      const result = AssessmentConfigSchema.safeParse({
        testContent: 'content',
        language: 'en',
        durationSeconds: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // AgentQuerySchema
  // ============================================

  describe('AgentQuerySchema', () => {
    it('should apply defaults for page and limit', () => {
      const result = AgentQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should coerce string numbers', () => {
      const result = AgentQuerySchema.parse({ page: '3', limit: '50' });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it('should accept valid status', () => {
      const result = AgentQuerySchema.parse({ status: 'active' });
      expect(result.status).toBe('active');
    });

    it('should reject invalid status', () => {
      const result = AgentQuerySchema.safeParse({ status: 'deleted' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // AgentIdParamSchema
  // ============================================

  describe('AgentIdParamSchema', () => {
    it('should accept valid ID', () => {
      const result = AgentIdParamSchema.safeParse({ id: 'abc123' });
      expect(result.success).toBe(true);
    });

    it('should reject empty ID', () => {
      const result = AgentIdParamSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // AgentGetByIdQuerySchema
  // ============================================

  describe('AgentGetByIdQuerySchema', () => {
    it('should return empty include array when not provided', () => {
      const result = AgentGetByIdQuerySchema.parse({});
      expect(result.include).toEqual([]);
      expect(result.collapse).toBe(false);
    });

    it('should parse comma-separated includes', () => {
      const result = AgentGetByIdQuerySchema.parse({ include: 'steps,prompts' });
      expect(result.include).toEqual(['steps', 'prompts']);
    });

    it('should filter out invalid includes', () => {
      const result = AgentGetByIdQuerySchema.parse({ include: 'steps,invalid,prompts' });
      expect(result.include).toEqual(['steps', 'prompts']);
    });

    it('should parse all include', () => {
      const result = AgentGetByIdQuerySchema.parse({ include: 'all' });
      expect(result.include).toEqual(['all']);
    });

    it('should parse collapse as boolean', () => {
      const result = AgentGetByIdQuerySchema.parse({ collapse: 'true' });
      expect(result.collapse).toBe(true);
    });

    it('should default collapse to false for non-true value', () => {
      const result = AgentGetByIdQuerySchema.parse({ collapse: 'false' });
      expect(result.collapse).toBe(false);
    });
  });

  // ============================================
  // parseIncludeQuery
  // ============================================

  describe('parseIncludeQuery', () => {
    it('should return all false for empty includes', () => {
      const result = parseIncludeQuery([]);
      expect(result).toEqual({
        includeSteps: false,
        includePrompts: false,
        includeAssessment: false,
        collapseSubSteps: false,
      });
    });

    it('should set individual flags based on includes', () => {
      const result = parseIncludeQuery(['steps', 'assessment']);
      expect(result.includeSteps).toBe(true);
      expect(result.includePrompts).toBe(false);
      expect(result.includeAssessment).toBe(true);
    });

    it('should set all flags when "all" is included', () => {
      const result = parseIncludeQuery(['all']);
      expect(result.includeSteps).toBe(true);
      expect(result.includePrompts).toBe(true);
      expect(result.includeAssessment).toBe(true);
    });

    it('should respect collapse parameter', () => {
      const result = parseIncludeQuery(['steps'], true);
      expect(result.collapseSubSteps).toBe(true);
    });
  });

  // ============================================
  // Nested route schemas
  // ============================================

  describe('AgentStepKeyParamSchema', () => {
    it('should accept valid params', () => {
      const result = AgentStepKeyParamSchema.safeParse({ id: 'agent1', key: 'intro' });
      expect(result.success).toBe(true);
    });
  });

  describe('AgentPromptKeyParamSchema', () => {
    it('should accept valid params', () => {
      const result = AgentPromptKeyParamSchema.safeParse({ id: 'agent1', key: 'intro' });
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateStepSchema', () => {
    it('should accept partial updates', () => {
      const result = UpdateStepSchema.safeParse({ label: 'New Label' });
      expect(result.success).toBe(true);
    });

    it('should accept inputs update', () => {
      const result = UpdateStepSchema.safeParse({ inputs: { question: 'What?' } });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = UpdateStepSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('UpdatePromptSchema', () => {
    it('should accept model update', () => {
      const result = UpdatePromptSchema.safeParse({ model: 'gpt-4o' });
      expect(result.success).toBe(true);
    });

    it('should accept temperature update', () => {
      const result = UpdatePromptSchema.safeParse({ temperature: 0.5 });
      expect(result.success).toBe(true);
    });

    it('should reject temperature > 2', () => {
      const result = UpdatePromptSchema.safeParse({ temperature: 5 });
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateAssessmentSchema', () => {
    it('should accept partial updates', () => {
      const result = UpdateAssessmentSchema.safeParse({ durationSeconds: 3600 });
      expect(result.success).toBe(true);
    });

    it('should reject non-positive duration', () => {
      const result = UpdateAssessmentSchema.safeParse({ durationSeconds: -1 });
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // AddStepSchema
  // ============================================

  describe('AddStepSchema', () => {
    it('should accept valid step addition', () => {
      const result = AddStepSchema.safeParse({ key: 'background' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid step key', () => {
      (isValidStep as jest.Mock).mockReturnValue(false);
      const result = AddStepSchema.safeParse({ key: 'invalid_step' });
      expect(result.success).toBe(false);
    });

    it('should reject report steps', () => {
      (isReportStep as jest.Mock).mockReturnValue(true);
      const result = AddStepSchema.safeParse({ key: 'reportBehavioral' });
      expect(result.success).toBe(false);
    });

    it('should reject sub-steps', () => {
      (isSubStep as jest.Mock).mockReturnValue(true);
      (getParentStep as jest.Mock).mockReturnValue('work');
      const result = AddStepSchema.safeParse({ key: 'introWork' });
      expect(result.success).toBe(false);
    });

    it('should accept draft mode without input validation', () => {
      const result = AddStepSchema.safeParse({
        key: 'background',
        draft: true,
        inputs: {},
      });
      expect(result.success).toBe(true);
    });

    it('should apply defaults for inputs and draft', () => {
      const result = AddStepSchema.parse({ key: 'background' });
      expect(result.inputs).toEqual({});
      expect(result.draft).toBe(false);
    });
  });

  // ============================================
  // GenerateStepSchema
  // ============================================

  describe('GenerateStepSchema', () => {
    it('should accept valid generation input', () => {
      const result = GenerateStepSchema.safeParse({
        summary: 'This is a job summary for testing',
        language: 'en',
        steps: ['intro', 'background'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject short summary', () => {
      const result = GenerateStepSchema.safeParse({
        summary: 'short',
        language: 'en',
        steps: ['intro'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty steps', () => {
      const result = GenerateStepSchema.safeParse({
        summary: 'This is a valid summary text',
        language: 'en',
        steps: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
