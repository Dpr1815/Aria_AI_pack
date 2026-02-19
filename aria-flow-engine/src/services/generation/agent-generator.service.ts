/**
 * Agent Generator Service
 *
 * Orchestrates agent creation from user-selected steps.
 * Fully definition-driven - no hardcoded step-specific logic.
 *
 * @module services/generation
 */

import { ObjectId } from 'mongodb';
import { TenantContext } from '../../middleware/tenant.middleware';

import {
  AgentRepository,
  AgentStepRepository,
  AgentPromptRepository,
  AgentAssessmentRepository,
} from '@repositories';
import { AgentDocument, AgentStepDocument, AgentPromptDocument, AgentDTO } from '@models';
import { ReasoningEffort } from '@connectors/llm/model-capabilities';
import {
  PromptConfig,
  AgentFeatures,
  RenderConfig,
  StepConfig,
  GenerateAgentInput,
  GenerateStepInput,
} from '@validations';
import { StepGeneratorService } from './step-generator.service';
import { StepSequencer } from './step-sequencer';
import { PromptBuilderService } from '../ai/prompt-builder.service';
import { OpenAIService } from '../ai/openai.service';
import { getStepDefinition, getSystemPromptId } from '@modules';
import { AgentStatus } from '@constants';
import { PROMPT_CONFIG } from '@config/prompt.config';
import { createLogger, buildSlidesFromStepOrder } from '@utils';

const logger = createLogger('AgentGeneratorService');

/**
 * Service responsible for generating complete agents
 */
export class AgentGeneratorService {
  private readonly stepGenerator: StepGeneratorService;
  private readonly stepSequencer: StepSequencer;

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentStepRepository: AgentStepRepository,
    private readonly agentPromptRepository: AgentPromptRepository,
    private readonly agentAssessmentRepository: AgentAssessmentRepository,
    openaiService: OpenAIService,
    private readonly promptBuilder: PromptBuilderService
  ) {
    this.stepGenerator = new StepGeneratorService(openaiService, promptBuilder);
    this.stepSequencer = new StepSequencer();
  }

  /**
   * Generate a complete agent with all related documents
   *
   * Flow:
   * 1. Generate step content
   * 2. Build step order and configurations
   * 3. Create agent document
   * 4. Create step documents
   * 5. Create prompt documents
   * 6. Create artifact documents (definition-driven)
   */
  async generateAgent(tenant: TenantContext, input: GenerateAgentInput): Promise<AgentDTO> {
    const userId = tenant.userId;

    logger.info('Starting agent generation', {
      userId: userId.toString(),
      tenantType: tenant.type,
      label: input.label,
      steps: input.steps,
    });

    // 1. Generate step content
    const stepsRequiringGeneration = this.stepSequencer.getStepsRequiringGeneration(input.steps);
    const generationInput: GenerateStepInput = {
      summary: input.summary,
      language: input.voice.languageCode,
      steps: input.steps,
      additionalData: input.additionalData,
    };

    logger.info('Generating step content', { steps: stepsRequiringGeneration });
    const generatedInputs = await this.stepGenerator.generateMultipleSteps(
      stepsRequiringGeneration,
      generationInput
    );

    // 2. Build step order and configurations
    const stepOrder = this.stepSequencer.buildStepOrder(input.steps);
    const stepsConfig = this.stepSequencer.buildStepsConfig(stepOrder, input.voice.languageCode);
    const stepsConfigWithInputs = this.stepSequencer.mergeGeneratedInputs(
      stepsConfig,
      generatedInputs,
      input.additionalData
    );

    // 3. Create agent document
    const agentData: Partial<AgentDocument> = {
      label: input.label,
      ownerId: userId,
      voice: input.voice,
      features: this.buildFeatures(input.features),
      render: this.buildRenderConfig(input.render, stepOrder),
      conversationTypeId: input.conversationTypeId,
      summaryTypeId: input.summaryTypeId,
      statisticsTypeId: input.statisticsTypeId,
      stepOrder,
      status: AgentStatus.INACTIVE,
    };

    if (tenant.type === 'organization') {
      agentData.organizationId = tenant.organizationId;
    }

    const agent = await this.agentRepository.create(agentData as AgentDocument);

    const agentId = agent._id;

    // 4. Create step documents
    const stepsData = this.buildStepsData(stepOrder, stepsConfigWithInputs);
    await this.agentStepRepository.createManyForAgent(agentId, stepsData);

    // 5. Create prompt documents
    const promptsData = await this.buildPromptsData(
      stepOrder,
      stepsConfigWithInputs,
      input.voice.languageCode
    );
    await this.agentPromptRepository.createManyForAgent(agentId, promptsData);

    // 6. Create artifacts (definition-driven)
    const artifacts = await this.createArtifacts(
      agentId,
      input.steps,
      generatedInputs,
      input.additionalData
    );

    logger.info('Agent generated successfully', {
      agentId: agentId.toString(),
      stepsCount: stepsData.length,
      promptsCount: promptsData.length,
      hasAssessment: !!artifacts.assessment,
    });

    return this.assembleFullAgent(agent, stepsData, promptsData, artifacts.assessment);
  }

  /**
   * Build step documents data
   */
  private buildStepsData(
    stepOrder: string[],
    stepsConfig: Record<string, StepConfig>
  ): Omit<AgentStepDocument, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>[] {
    return stepOrder.map((key, index) => {
      const config = stepsConfig[key];
      return {
        key,
        label: config.label,
        order: config.order,
        nextStep: index < stepOrder.length - 1 ? stepOrder[index + 1] : null,
        inputs: config.inputs ?? {},
      };
    });
  }

  /**
   * Build prompt documents data
   *
   * Uses PromptBuilder to compile prompts with all step inputs.
   * PromptBuilder automatically substitutes only variables present in template.
   */
  private async buildPromptsData(
    stepOrder: string[],
    stepsConfig: Record<string, StepConfig>,
    language: string
  ): Promise<Omit<AgentPromptDocument, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>[]> {
    const prompts: Omit<AgentPromptDocument, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>[] = [];

    for (let i = 0; i < stepOrder.length; i++) {
      const stepKey = stepOrder[i];
      const config = stepsConfig[stepKey];

      const nextStepLabel = this.stepSequencer.getNextStepLabel(stepOrder, stepKey, language);

      const variables: Record<string, unknown> = {
        ...config.inputs,
        next_step_label: nextStepLabel,
        language,
      };

      const promptResult = await this.buildSystemPrompt(stepKey, variables, language);
      prompts.push({
        key: stepKey,
        system: promptResult.content,
        model: promptResult.model ?? PROMPT_CONFIG.DEFAULT_MODEL,
        temperature: promptResult.temperature ?? PROMPT_CONFIG.DEFAULT_TEMPERATURE,
        maxTokens: promptResult.maxTokens ?? PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
        reasoningEffort: promptResult.reasoningEffort,
      });
    }

    return prompts;
  }

  /**
   * Build system prompt for a step
   */
  private async buildSystemPrompt(
    stepKey: string,
    variables: Record<string, unknown>,
    language: string
  ): Promise<{
    content: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    reasoningEffort?: ReasoningEffort;
  }> {
    const templateId = getSystemPromptId(stepKey, language);

    if (!templateId) {
      logger.warn('No system prompt template found', { stepKey, language });
      return { content: this.getBasePrompt(language) };
    }

    try {
      const builtPrompt = await this.promptBuilder.buildPrompt({
        templateId,
        variables,
      });
      return {
        content: builtPrompt.content,
        model: builtPrompt.model,
        temperature: builtPrompt.temperature,
        maxTokens: builtPrompt.maxTokens,
        reasoningEffort: builtPrompt.reasoningEffort,
      };
    } catch (error) {
      logger.warn('Failed to build system prompt, using fallback', {
        stepKey,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { content: this.getBasePrompt(language) };
    }
  }

  /**
   * Create artifacts based on step definitions
   *
   * Fully definition-driven - reads artifact config from step definitions.
   * No hardcoded step-specific logic.
   */
  private async createArtifacts(
    agentId: ObjectId,
    steps: string[],
    generatedInputs: Record<string, Record<string, unknown>>,
    additionalData?: Record<string, unknown>
  ): Promise<{ assessment?: { testContent: string; language: string; durationSeconds: number } }> {
    const result: {
      assessment?: { testContent: string; language: string; durationSeconds: number };
    } = {};

    for (const stepId of steps) {
      const def = getStepDefinition(stepId);
      if (!def?.artifacts) continue;

      // Assessment artifact
      if (def.artifacts.assessment) {
        const artifactConfig = def.artifacts.assessment;
        const stepInputs = generatedInputs[stepId] ?? {};

        // Resolve test content
        const testContent = stepInputs[artifactConfig.testContentField];
        if (!testContent) {
          logger.warn('Assessment test content not found', {
            stepId,
            field: artifactConfig.testContentField,
          });
          continue;
        }

        // Resolve duration
        const duration = this.resolveArtifactValue(
          artifactConfig.durationField,
          stepInputs,
          additionalData
        );

        // Resolve language
        const language = artifactConfig.languageField
          ? (this.resolveArtifactValue(artifactConfig.languageField, stepInputs, additionalData) ??
            artifactConfig.languageFallback ??
            'en')
          : (artifactConfig.languageFallback ?? 'en');

        const assessmentData = {
          testContent: typeof testContent === 'string' ? testContent : JSON.stringify(testContent),
          language: String(language),
          durationSeconds: (Number(duration) || 30) * 60,
        };

        await this.agentAssessmentRepository.createForAgent(agentId, assessmentData);
        result.assessment = assessmentData;

        logger.info('Assessment artifact created', { agentId: agentId.toString(), stepId });
      }

      // Future artifact types can be added here following the same pattern
    }

    return result;
  }

  /**
   * Resolve artifact configuration value
   *
   * Checks generated inputs first, then additionalData.
   */
  private resolveArtifactValue(
    field: string,
    generatedInputs: Record<string, unknown>,
    additionalData?: Record<string, unknown>
  ): unknown {
    return generatedInputs[field] ?? additionalData?.[field];
  }

  /**
   * Build features configuration with defaults
   */
  private buildFeatures(features?: Partial<AgentFeatures>): AgentFeatures {
    return {
      lipSync: features?.lipSync ?? false,
      sessionPersistence: features?.sessionPersistence ?? true,
      autoSummary: features?.autoSummary ?? true,
      videoRecording: features?.videoRecording ?? false,
    };
  }

  /**
   * Build render configuration
   */
  private buildRenderConfig(render: RenderConfig, stepOrder: string[]): RenderConfig {
    let builtRender: RenderConfig;
    if (render.mode === 'presentation' && render.presentation?.link) {
      builtRender = {
        mode: 'presentation',
        presentation: {
          link: render.presentation.link,
          slides: buildSlidesFromStepOrder(stepOrder),
        },
      };
    } else {
      builtRender = { mode: 'avatar' };
    }
    return builtRender;
  }

  /**
   * Get base fallback prompt
   */
  private getBasePrompt(language: string): string {
    return `You are an AI interview assistant conducting a professional interview in ${language}.`;
  }

  /**
   * Assemble full agent response
   */
  private assembleFullAgent(
    agent: AgentDocument,
    stepsData: Omit<AgentStepDocument, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>[],
    promptsData: Omit<AgentPromptDocument, '_id' | 'agentId' | 'createdAt' | 'updatedAt'>[],
    assessment?: { testContent: string; language: string; durationSeconds: number }
  ): AgentDTO {
    const steps: Record<string, StepConfig> = {};
    for (const step of stepsData) {
      steps[step.key] = {
        label: step.label,
        order: step.order,
        nextStep: step.nextStep,
        inputs: step.inputs,
      };
    }

    const prompts: Record<string, PromptConfig> = {};
    for (const prompt of promptsData) {
      prompts[prompt.key] = {
        system: prompt.system,
        model: prompt.model,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        reasoningEffort: prompt.reasoningEffort,
      };
    }

    const dto: AgentDTO = {
      _id: agent._id.toString(),
      label: agent.label,
      ownerId: agent.ownerId.toString(),
      organizationId: agent.organizationId?.toString(),
      voice: agent.voice,
      features: agent.features,
      render: agent.render,
      conversationTypeId: agent.conversationTypeId,
      stepOrder: agent.stepOrder,
      summaryTypeId: agent.summaryTypeId,
      statisticsTypeId: agent.statisticsTypeId,
      status: agent.status,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
      steps,
      prompts,
    };

    if (assessment) {
      dto.assessment = assessment;
    }

    return dto;
  }
}
