import { ObjectId } from 'mongodb';
import {
  AgentRepository,
  AgentStepRepository,
  AgentPromptRepository,
  AgentAssessmentRepository,
} from '@repositories';
import { TenantContext } from '../middleware/tenant.middleware';

import {
  AgentDocument,
  AgentStepDocument,
  AgentPromptDocument,
  AgentAssessmentDocument,
  AgentListItemDTO,
  AgentDTO,
} from '@models';
import {
  CreateAgentInput,
  UpdateAgentInput,
  AgentQueryInput,
  UpdateStepInput,
  AddStepInput,
  UpdatePromptInput,
  UpdateAssessmentInput,
  GetAgentOptions,
  RenderConfig,
  StepConfig,
  PromptConfig,
  AssessmentConfig,
} from '@validations';
import { AgentStatus } from '../constants';
import {
  NotFoundError,
  ValidationError,
  buildSlidesFromStepOrder,
  createLogger,
  toObjectId,
} from '@utils';
import { PaginatedResult } from '@utils';
import { validateStepInputs, buildStepSkeleton } from '@modules';
import { PromptBuilderService } from './ai/prompt-builder.service';
import { StepSequencer } from './generation/step-sequencer';
import { PROMPT_CONFIG } from '../config/prompt.config';
import {
  getSystemPromptId,
  getStepDefinition,
  getStepLabel,
  isSubStep,
  getParentStep,
  isLastPositionStep,
  expandStep,
} from '@modules';

const logger = createLogger('AgentService');

export class AgentService {
  private readonly agentRepository: AgentRepository;
  private readonly agentStepRepository: AgentStepRepository;
  private readonly agentPromptRepository: AgentPromptRepository;
  private readonly agentAssessmentRepository: AgentAssessmentRepository;
  private readonly promptBuilder: PromptBuilderService;
  private readonly stepSequencer: StepSequencer;

  constructor(
    agentRepository: AgentRepository,
    agentStepRepository: AgentStepRepository,
    agentPromptRepository: AgentPromptRepository,
    agentAssessmentRepository: AgentAssessmentRepository,
    promptBuilder: PromptBuilderService
  ) {
    this.agentRepository = agentRepository;
    this.agentStepRepository = agentStepRepository;
    this.agentPromptRepository = agentPromptRepository;
    this.agentAssessmentRepository = agentAssessmentRepository;
    this.promptBuilder = promptBuilder;
    this.stepSequencer = new StepSequencer();
  }

  // ============================================
  // AGENT CRUD
  // ============================================

  async createAgent(tenant: TenantContext, input: CreateAgentInput): Promise<AgentDTO> {
    const userId = tenant.userId;
    const organizationId = tenant.type === 'organization' ? tenant.organizationId : undefined;

    const stepOrder = Object.entries(input.steps)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key]) => key);

    let render: RenderConfig;
    if (input.render.mode === 'presentation' && input.render.presentation?.link) {
      render = {
        mode: 'presentation',
        presentation: {
          link: input.render.presentation.link,
          slides: buildSlidesFromStepOrder(stepOrder),
        },
      };
    } else {
      render = { mode: 'avatar' };
    }

    const agentData: Partial<AgentDocument> = {
      label: input.label,
      ownerId: userId,
      voice: input.voice,
      features: input.features || {
        lipSync: false,
        sessionPersistence: true,
        autoSummary: true,
        videoRecording: false,
      },
      render,
      conversationTypeId: input.conversationTypeId,
      stepOrder,
      summaryTypeId: input.summaryTypeId,
      statisticsTypeId: input.statisticsTypeId,
      status: AgentStatus.INACTIVE,
    };

    if (organizationId) {
      agentData.organizationId = organizationId;
    }

    const agent = await this.agentRepository.create(agentData as AgentDocument);
    const agentId = agent._id;

    const stepsToCreate = Object.entries(input.steps).map(([key, step]) => ({
      key,
      label: step.label,
      order: step.order,
      nextStep: this.stepSequencer.getNextStepKey(key, stepOrder),
      inputs: step.inputs || {},
    }));
    await this.agentStepRepository.createManyForAgent(agentId, stepsToCreate);

    const promptsToCreate = Object.entries(input.prompts).map(([key, prompt]) => ({
      key,
      system: prompt.system,
      model: prompt.model,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      messages: prompt.messages,
    }));
    await this.agentPromptRepository.createManyForAgent(agentId, promptsToCreate);

    if (input.assessment) {
      await this.agentAssessmentRepository.createForAgent(agentId, {
        testContent: input.assessment.testContent,
        language: input.assessment.language,
        durationSeconds: input.assessment.durationSeconds,
      });
    }

    logger.info('Agent created', {
      agentId: agentId.toString(),
      ownerId: userId.toString(),
      organizationId: organizationId?.toString(),
      tenantType: tenant.type,
      stepsCount: stepsToCreate.length,
      promptsCount: promptsToCreate.length,
    });

    return this.toResponse(agentId);
  }

  /**
   * Get agent metadata only (lightweight)
   */
  async getAgentById(agentId: string | ObjectId): Promise<AgentDocument> {
    return this.agentRepository.findByIdOrThrow(agentId, 'Agent');
  }

  /**
   * Get agent with optional expansions (sparse fieldsets)
   */
  async getAgent(agentId: string | ObjectId, options: GetAgentOptions = {}): Promise<AgentDTO> {
    const objectId = toObjectId(agentId);
    return this.toResponse(objectId, options);
  }

  /**
   * Get agent public profile (no steps, no prompts, no assessment)
   * Used by the public entry modal before session join.
   */
  async getAgentPublicProfile(agentId: string | ObjectId): Promise<AgentDTO> {
    const objectId = toObjectId(agentId);

    const agent = await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    if (agent.status !== AgentStatus.ACTIVE) {
      throw new NotFoundError('Agent', objectId.toString());
    }

    // Reuse toResponse with all expansions disabled — metadata only
    return this.toResponse(objectId, {
      includeSteps: false,
      includePrompts: false,
      includeAssessment: false,
    });
  }
  /**
   * List agents
   */
  async listAgents(
    tenant: TenantContext,
    query: AgentQueryInput
  ): Promise<PaginatedResult<AgentListItemDTO>> {
    const { status, page, limit } = query;

    let result: PaginatedResult<AgentDocument>;

    if (tenant.type === 'personal') {
      result = await this.agentRepository.findPersonalAgents(tenant.userId, {
        status,
        page,
        limit,
      });
    } else {
      result = await this.agentRepository.findOrganizationAgents(tenant.organizationId, {
        status,
        page,
        limit,
      });
    }

    return {
      ...result,
      data: result.data.map((agent) => this.toListItemDTO(agent)),
    };
  }

  /**
   * Update agent configuration
   *
   * Handles:
   * - Basic fields (label, voice, features, render, summaryTypeId, statisticsTypeId)
   * - Language changes (recompiles all labels and prompts)
   * - Step order changes (validates and updates step documents)
   */
  async updateAgent(agentId: string | ObjectId, input: UpdateAgentInput): Promise<AgentDTO> {
    const objectId = toObjectId(agentId);

    const existingAgent = await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    // Build update data for basic fields
    const agentUpdateData: Record<string, unknown> = {};
    if (input.label !== undefined) agentUpdateData.label = input.label;
    if (input.voice !== undefined) agentUpdateData.voice = input.voice;
    if (input.conversationTypeId !== undefined)
      agentUpdateData.conversationTypeId = input.conversationTypeId;
    if (input.summaryTypeId !== undefined) agentUpdateData.summaryTypeId = input.summaryTypeId;
    if (input.statisticsTypeId !== undefined)
      agentUpdateData.statisticsTypeId = input.statisticsTypeId;

    if (input.features !== undefined) {
      agentUpdateData.features = { ...existingAgent.features, ...input.features };
    }

    // Handle render config changes
    if (input.render !== undefined) {
      if (input.render.mode === 'avatar') {
        agentUpdateData.render = { mode: 'avatar' };
      } else if (input.render.mode === 'presentation' && input.render.presentation?.link) {
        const stepOrderForSlides = input.stepOrder ?? existingAgent.stepOrder;
        const slides = buildSlidesFromStepOrder(stepOrderForSlides);
        agentUpdateData.render = {
          mode: 'presentation',
          presentation: {
            link: input.render.presentation.link,
            slides,
          },
        };
      }
    }

    // Detect changes that require additional processing
    const languageChanged =
      input?.voice?.languageCode !== undefined &&
      input?.voice?.languageCode !== existingAgent?.voice?.languageCode;

    const stepOrderChanged =
      input.stepOrder !== undefined &&
      !this.stepSequencer.stepOrderEquals(input.stepOrder, existingAgent.stepOrder);

    // Validate and handle step order change
    if (stepOrderChanged) {
      await this.validateAndApplyStepOrderChange(
        objectId,
        existingAgent.stepOrder,
        input.stepOrder!,
        input?.voice?.languageCode ?? existingAgent?.voice?.languageCode
      );
      agentUpdateData.stepOrder = input.stepOrder;

      // Rebuild slides if in presentation mode (and not already handled above)
      if (input.render === undefined && existingAgent.render?.mode === 'presentation') {
        const slides = buildSlidesFromStepOrder(input.stepOrder!);
        agentUpdateData['render.presentation.slides'] = slides;
      }
    }

    // Apply agent updates
    if (Object.keys(agentUpdateData).length > 0) {
      await this.agentRepository.updateByIdOrThrow(objectId, agentUpdateData, 'Agent');
    }

    // Handle language change (recompile all labels and prompts)
    if (languageChanged) {
      const finalStepOrder = input.stepOrder ?? existingAgent.stepOrder;
      await this.recompileAllForLanguageChange(
        objectId,
        input?.voice?.languageCode!,
        finalStepOrder
      );
      logger.info('Agent updated with language change - all prompts recompiled', {
        agentId: objectId.toString(),
        oldLanguage: existingAgent?.voice?.languageCode,
        newLanguage: input?.voice?.languageCode,
      });
    } else if (stepOrderChanged) {
      logger.info('Agent updated with step order change', {
        agentId: objectId.toString(),
        oldOrder: existingAgent.stepOrder,
        newOrder: input.stepOrder,
      });
    } else {
      logger.info('Agent updated', { agentId: objectId.toString() });
    }
    return this.toResponse(objectId);
  }

  async deleteAgent(agentId: string | ObjectId): Promise<void> {
    const objectId = toObjectId(agentId);

    await Promise.all([
      this.agentStepRepository.deleteByAgentId(objectId),
      this.agentPromptRepository.deleteByAgentId(objectId),
      this.agentAssessmentRepository.deleteByAgentId(objectId),
    ]);

    await this.agentRepository.deleteByIdOrThrow(objectId, 'Agent');

    logger.info('Agent deleted with cascade', { agentId: objectId.toString() });
  }

  async activateAgent(agentId: string | ObjectId): Promise<AgentDTO> {
    const objectId = toObjectId(agentId);
    const agent = await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    if (agent.status === AgentStatus.ACTIVE) {
      return this.toResponse(objectId);
    }

    const updated = await this.agentRepository.updateStatus(objectId, AgentStatus.ACTIVE);
    if (!updated) {
      throw new NotFoundError('Agent', objectId.toString());
    }

    logger.info('Agent activated', { agentId: objectId.toString() });

    return this.toResponse(objectId);
  }

  async deactivateAgent(agentId: string | ObjectId): Promise<AgentDTO> {
    const objectId = toObjectId(agentId);
    const agent = await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    if (agent.status === AgentStatus.INACTIVE) {
      return this.toResponse(objectId);
    }

    const updated = await this.agentRepository.updateStatus(objectId, AgentStatus.INACTIVE);
    if (!updated) {
      throw new NotFoundError('Agent', objectId.toString());
    }

    logger.info('Agent deactivated', { agentId: objectId.toString() });

    return this.toResponse(objectId);
  }

  // ============================================
  // STEP ORDER VALIDATION & APPLICATION
  // ============================================

  /**
   * Validate and apply step order change
   *
   * Delegates pure validation to StepSequencer, then updates
   * step documents and recompiles affected prompts.
   */
  private async validateAndApplyStepOrderChange(
    agentId: ObjectId,
    currentOrder: string[],
    newOrder: string[],
    language: string
  ): Promise<void> {
    // Pure validation (same steps, position constraints, sub-step grouping)
    this.stepSequencer.validateStepOrderChange(currentOrder, newOrder);

    // Update step documents (order and nextStep)
    await this.updateStepPointersAndOrder(agentId, newOrder);

    // Find and recompile steps whose next_step_label changed
    const stepsToRecompile = this.stepSequencer.findStepsWithChangedNextStep(
      currentOrder,
      newOrder
    );

    for (const stepKey of stepsToRecompile) {
      const step = await this.agentStepRepository.findByAgentAndKey(agentId, stepKey);
      if (step) {
        await this.recompilePromptForStep(agentId, stepKey, step.inputs, language, newOrder);
      }
    }

    logger.debug('Step order validated and applied', {
      agentId: agentId.toString(),
    });
  }

  // ============================================
  // STEP OPERATIONS
  // ============================================

  async getAgentSteps(agentId: string | ObjectId): Promise<Record<string, unknown>[]> {
    const objectId = toObjectId(agentId);
    await this.agentRepository.findByIdOrThrow(objectId, 'Agent');
    const steps = await this.agentStepRepository.findByAgentId(objectId);
    return this.stepsToResponse(steps);
  }

  async getAgentStep(
    agentId: string | ObjectId,
    stepKey: string
  ): Promise<Record<string, unknown>> {
    const objectId = toObjectId(agentId);
    await this.agentRepository.findByIdOrThrow(objectId, 'Agent');
    const step = await this.agentStepRepository.findByAgentAndKeyOrThrow(objectId, stepKey);
    return this.stepToResponse(step);
  }

  /**
   * Update a step's label or inputs
   *
   * If inputs are updated, validates against step schema and recompiles the prompt.
   */
  async updateAgentStep(
    agentId: string | ObjectId,
    stepKey: string,
    input: UpdateStepInput
  ): Promise<{ step: Record<string, unknown>; promptRecompiled: boolean }> {
    const objectId = toObjectId(agentId);

    const agent = await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    if (input.inputs !== undefined) {
      const validation = validateStepInputs(stepKey, input.inputs);
      if (!validation.success) {
        throw new ValidationError(
          `Invalid inputs for step "${stepKey}": ${validation.errors?.join('; ')}`
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (input.label !== undefined) updateData.label = input.label;
    if (input.inputs !== undefined) updateData.inputs = input.inputs;

    const updated = await this.agentStepRepository.updateByAgentAndKey(
      objectId,
      stepKey,
      updateData
    );

    if (!updated) {
      throw new NotFoundError('Step', stepKey);
    }

    let promptRecompiled = false;
    if (input.inputs !== undefined) {
      await this.recompilePromptForStep(
        objectId,
        stepKey,
        updated.inputs,
        agent?.voice?.languageCode,
        agent.stepOrder
      );
      promptRecompiled = true;
      logger.info('Step updated with prompt recompilation', {
        agentId: objectId.toString(),
        stepKey,
      });
    } else {
      logger.info('Step updated', { agentId: objectId.toString(), stepKey });
    }

    return { step: this.stepToResponse(updated), promptRecompiled };
  }

  /**
   * Add a new step to an agent
   *
   * Creates the step, its prompt, and any sub-steps if the step expands.
   * Validates inputs against the step's schema.
   */
  async addAgentStep(
    agentId: string | ObjectId,
    input: AddStepInput
  ): Promise<Record<string, unknown>> {
    const objectId = toObjectId(agentId);

    const agent = await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    const stepsToAdd = expandStep(input.key);
    for (const stepKey of stepsToAdd) {
      const existingStep = await this.agentStepRepository.findByAgentAndKey(objectId, stepKey);
      if (existingStep) {
        throw new ValidationError(`Step "${stepKey}" already exists for this agent`);
      }
    }

    const newStepOrder = [...agent.stepOrder];
    let insertIndex: number;

    if (input.order !== undefined) {
      const maxOrder = newStepOrder.length + 1;
      if (input.order < 1 || input.order > maxOrder) {
        throw new ValidationError(
          `Invalid order: ${input.order}. Must be between 1 and ${maxOrder}`
        );
      }

      this.stepSequencer.validateInsertionPosition(input.key, input.order, newStepOrder);
      insertIndex = input.order - 1;
    } else {
      const conclusionIndex = newStepOrder.findIndex((key) => isLastPositionStep(key));
      insertIndex = conclusionIndex !== -1 ? conclusionIndex : newStepOrder.length;
    }

    newStepOrder.splice(insertIndex, 0, ...stepsToAdd);

    // Resolve inputs: draft → skeleton from schema, otherwise use provided inputs
    const resolveInputs = (stepKey: string): Record<string, unknown> => {
      if (input.draft) return buildStepSkeleton(stepKey);
      return stepKey === input.key ? (input.inputs ?? {}) : buildStepSkeleton(stepKey);
    };

    const stepsData = stepsToAdd.map((stepKey: string, idx: number) => ({
      key: stepKey,
      label: getStepLabel(stepKey, agent?.voice?.languageCode),
      order: insertIndex + idx + 1,
      nextStep: this.stepSequencer.getNextStepKey(stepKey, newStepOrder),
      inputs: resolveInputs(stepKey),
    }));

    await this.agentStepRepository.createManyForAgent(objectId, stepsData);

    const promptsData: {
      key: string;
      system: string;
      model: string;
      temperature: number;
      maxTokens: number;
    }[] = [];

    for (const stepKey of stepsToAdd) {
      const stepInputs = resolveInputs(stepKey);
      const nextStepLabel = this.stepSequencer.getNextStepLabel(
        newStepOrder,
        stepKey,
        agent?.voice?.languageCode
      );

      const systemPrompt = await this.buildSystemPromptForStep(
        stepKey,
        stepInputs,
        agent?.voice?.languageCode,
        nextStepLabel
      );

      promptsData.push({
        key: stepKey,
        system: systemPrompt,
        model: PROMPT_CONFIG.DEFAULT_MODEL,
        temperature: PROMPT_CONFIG.DEFAULT_TEMPERATURE,
        maxTokens: PROMPT_CONFIG.DEFAULT_MAX_TOKENS,
      });
    }

    await this.agentPromptRepository.createManyForAgent(objectId, promptsData);

    await this.agentRepository.updateByIdOrThrow(objectId, { stepOrder: newStepOrder }, 'Agent');

    await this.updateStepPointersAndOrder(objectId, newStepOrder);

    await this.recompileAffectedPrompts(
      objectId,
      newStepOrder,
      insertIndex,
      agent?.voice?.languageCode
    );

    await this.rebuildSlidesIfNeeded(objectId, newStepOrder, agent.render);

    logger.info('Step(s) added to agent', {
      agentId: objectId.toString(),
      stepKey: input.key,
      stepsAdded: stepsToAdd,
      draft: input.draft,
      order: insertIndex + 1,
    });

    const step = await this.agentStepRepository.findByAgentAndKeyOrThrow(objectId, input.key);
    return this.stepToResponse(step);
  }

  /**
   * Remove a step from an agent
   *
   * If the step has sub-steps, all sub-steps are removed as well.
   */
  async removeAgentStep(agentId: string | ObjectId, stepKey: string): Promise<void> {
    const objectId = toObjectId(agentId);

    const agent = await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    if (!agent.stepOrder.includes(stepKey)) {
      throw new NotFoundError('Step', stepKey);
    }

    if (isSubStep(stepKey)) {
      const parentStep = getParentStep(stepKey);
      throw new ValidationError(
        `Cannot remove sub-step "${stepKey}" individually. Remove the parent step "${parentStep}" instead.`
      );
    }

    const def = getStepDefinition(stepKey);
    if (def?.position === 'first') {
      throw new ValidationError(`Cannot remove required step "${stepKey}" (must be first)`);
    }
    if (def?.position === 'last') {
      throw new ValidationError(`Cannot remove required step "${stepKey}" (must be last)`);
    }

    const stepsToRemove = this.stepSequencer.getStepsToRemove(stepKey, agent.stepOrder);
    const firstRemovedIndex = agent.stepOrder.indexOf(stepsToRemove[0]);

    await Promise.all(
      stepsToRemove.flatMap((key: string) => [
        this.agentStepRepository.deleteByAgentAndKey(objectId, key),
        this.agentPromptRepository.deleteByAgentAndKey(objectId, key),
      ])
    );

    const newStepOrder = agent.stepOrder.filter((key) => !stepsToRemove.includes(key));
    await this.agentRepository.updateByIdOrThrow(objectId, { stepOrder: newStepOrder }, 'Agent');

    await this.updateStepPointersAndOrder(objectId, newStepOrder);

    if (firstRemovedIndex > 0) {
      const previousStepKey = newStepOrder[firstRemovedIndex - 1];
      if (previousStepKey) {
        const previousStep = await this.agentStepRepository.findByAgentAndKey(
          objectId,
          previousStepKey
        );
        if (previousStep) {
          await this.recompilePromptForStep(
            objectId,
            previousStepKey,
            previousStep.inputs,
            agent?.voice?.languageCode,
            newStepOrder
          );
        }
      }
    }

    await this.rebuildSlidesIfNeeded(objectId, newStepOrder, agent.render);

    logger.info('Step(s) removed from agent', {
      agentId: objectId.toString(),
      stepKey,
      stepsRemoved: stepsToRemove,
    });
  }

  // ============================================
  // PROMPT OPERATIONS
  // ============================================

  async getAgentPrompts(agentId: string | ObjectId): Promise<Record<string, unknown>[]> {
    const objectId = toObjectId(agentId);
    await this.agentRepository.findByIdOrThrow(objectId, 'Agent');
    const prompts = await this.agentPromptRepository.findByAgentId(objectId);
    return this.promptsToResponse(prompts);
  }

  async getAgentPrompt(
    agentId: string | ObjectId,
    promptKey: string
  ): Promise<Record<string, unknown>> {
    const objectId = toObjectId(agentId);
    await this.agentRepository.findByIdOrThrow(objectId, 'Agent');
    const prompt = await this.agentPromptRepository.findByAgentAndKeyOrThrow(objectId, promptKey);
    return this.promptToResponse(prompt);
  }

  /**
   * Update prompt model settings
   *
   * NOTE: System prompt cannot be directly edited - it's derived from step inputs.
   */
  async updateAgentPrompt(
    agentId: string | ObjectId,
    promptKey: string,
    input: UpdatePromptInput
  ): Promise<Record<string, unknown>> {
    const objectId = toObjectId(agentId);

    await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    const updateData: Record<string, unknown> = {};
    if (input.model !== undefined) updateData.model = input.model;
    if (input.temperature !== undefined) updateData.temperature = input.temperature;
    if (input.maxTokens !== undefined) updateData.maxTokens = input.maxTokens;

    if (Object.keys(updateData).length === 0) {
      const prompt = await this.agentPromptRepository.findByAgentAndKeyOrThrow(objectId, promptKey);
      return this.promptToResponse(prompt);
    }

    const updated = await this.agentPromptRepository.updateByAgentAndKey(
      objectId,
      promptKey,
      updateData
    );

    if (!updated) {
      throw new NotFoundError('Prompt', promptKey);
    }

    logger.info('Prompt updated', { agentId: objectId.toString(), promptKey });

    return this.promptToResponse(updated);
  }

  // ============================================
  // ASSESSMENT OPERATIONS
  // ============================================

  async getAgentAssessment(agentId: string | ObjectId): Promise<Record<string, unknown> | null> {
    const objectId = toObjectId(agentId);
    await this.agentRepository.findByIdOrThrow(objectId, 'Agent');
    const assessment = await this.agentAssessmentRepository.findByAgentId(objectId);
    return assessment ? this.assessmentToResponse(assessment) : null;
  }

  async updateAgentAssessment(
    agentId: string | ObjectId,
    input: UpdateAssessmentInput
  ): Promise<Record<string, unknown>> {
    const objectId = toObjectId(agentId);

    await this.agentRepository.findByIdOrThrow(objectId, 'Agent');

    const updateData: Record<string, unknown> = {};
    if (input.testContent !== undefined) updateData.testContent = input.testContent;
    if (input.language !== undefined) updateData.language = input.language;
    if (input.durationSeconds !== undefined) updateData.durationSeconds = input.durationSeconds;

    const updated = await this.agentAssessmentRepository.updateByAgentId(objectId, updateData);

    if (!updated) {
      throw new NotFoundError('Assessment', objectId.toString());
    }

    logger.info('Assessment updated', { agentId: objectId.toString() });

    return this.assessmentToResponse(updated);
  }

  // ============================================
  // COMBINED OPERATIONS
  // ============================================

  async getStepWithPrompt(
    agentId: string | ObjectId,
    stepKey: string
  ): Promise<{ step: AgentStepDocument; prompt: AgentPromptDocument }> {
    const objectId = toObjectId(agentId);

    const [step, prompt] = await Promise.all([
      this.agentStepRepository.findByAgentAndKeyOrThrow(objectId, stepKey),
      this.agentPromptRepository.findByAgentAndKeyOrThrow(objectId, stepKey),
    ]);

    return { step, prompt };
  }

  // ============================================
  // PROMPT COMPILATION HELPERS
  // ============================================

  private buildPromptVariables(
    inputs: Record<string, unknown>,
    language: string,
    nextStepLabel: string
  ): Record<string, unknown> {
    return {
      ...inputs,
      language,
      next_step_label: nextStepLabel,
    };
  }

  private async recompilePromptForStep(
    agentId: ObjectId,
    stepKey: string,
    stepInputs: Record<string, unknown>,
    language: string,
    stepOrder: string[]
  ): Promise<void> {
    const templateId = getSystemPromptId(stepKey, language);

    if (!templateId) {
      logger.warn('No system prompt template for step, skipping recompilation', { stepKey });
      return;
    }

    try {
      const nextStepLabel = this.stepSequencer.getNextStepLabel(stepOrder, stepKey, language);
      const variables = this.buildPromptVariables(stepInputs, language, nextStepLabel);

      const builtPrompt = await this.promptBuilder.buildPrompt({
        templateId,
        variables,
      });

      await this.agentPromptRepository.updateByAgentAndKey(agentId, stepKey, {
        system: builtPrompt.content,
      });

      logger.debug('Prompt recompiled for step', {
        agentId: agentId.toString(),
        stepKey,
        templateId,
      });
    } catch (error) {
      logger.error('Failed to recompile prompt', error instanceof Error ? error : undefined, {
        stepKey,
        templateId,
      });
      throw new ValidationError(
        `Failed to recompile prompt for step "${stepKey}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async recompileAllForLanguageChange(
    agentId: ObjectId,
    newLanguage: string,
    stepOrder: string[]
  ): Promise<void> {
    logger.info('Recompiling all steps and prompts for language change', {
      agentId: agentId.toString(),
      newLanguage,
      stepCount: stepOrder.length,
    });

    const steps = await this.agentStepRepository.findByAgentId(agentId);
    const stepsMap = new Map(steps.map((s) => [s.key, s]));

    for (const stepKey of stepOrder) {
      const step = stepsMap.get(stepKey);
      if (!step) {
        logger.warn('Step not found during language recompilation', { stepKey });
        continue;
      }

      const newLabel = getStepLabel(stepKey, newLanguage);
      await this.agentStepRepository.updateByAgentAndKey(agentId, stepKey, {
        label: newLabel,
      });

      try {
        await this.recompilePromptForStep(agentId, stepKey, step.inputs, newLanguage, stepOrder);
      } catch (error) {
        logger.error(
          'Failed to recompile prompt during language change',
          error instanceof Error ? error : undefined,
          { stepKey, newLanguage }
        );
      }
    }

    logger.info('Language recompilation completed', {
      agentId: agentId.toString(),
      newLanguage,
    });
  }

  private async buildSystemPromptForStep(
    stepKey: string,
    inputs: Record<string, unknown>,
    language: string,
    nextStepLabel: string
  ): Promise<string> {
    const templateId = getSystemPromptId(stepKey, language);

    if (!templateId) {
      logger.warn('No system prompt template for step, using base prompt', { stepKey });
      return this.getBasePrompt(language);
    }

    try {
      const variables = this.buildPromptVariables(inputs, language, nextStepLabel);

      const builtPrompt = await this.promptBuilder.buildPrompt({
        templateId,
        variables,
      });

      return builtPrompt.content;
    } catch (error) {
      logger.warn('Failed to build system prompt from template, using base prompt', {
        stepKey,
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return this.getBasePrompt(language);
    }
  }

  private getBasePrompt(language: string): string {
    return `You are an AI interview assistant conducting a professional interview in ${language}.`;
  }

  private async recompileAffectedPrompts(
    agentId: ObjectId,
    stepOrder: string[],
    insertedIndex: number,
    language: string
  ): Promise<void> {
    if (insertedIndex > 0) {
      const previousStepKey = stepOrder[insertedIndex - 1];
      if (previousStepKey) {
        const previousStep = await this.agentStepRepository.findByAgentAndKey(
          agentId,
          previousStepKey
        );
        if (previousStep) {
          await this.recompilePromptForStep(
            agentId,
            previousStepKey,
            previousStep.inputs,
            language,
            stepOrder
          );
        }
      }
    }
  }

  private async updateStepPointersAndOrder(agentId: ObjectId, stepOrder: string[]): Promise<void> {
    const updatePromises = stepOrder.map((key, index) => {
      const nextStep = this.stepSequencer.getNextStepKey(key, stepOrder);
      return this.agentStepRepository.updateByAgentAndKey(agentId, key, {
        nextStep,
        order: index + 1,
      });
    });

    await Promise.all(updatePromises);
  }

  // ============================================
  // GENERAL HELPER METHODS
  // ============================================

  private stepsToRecord(steps: AgentStepDocument[]): Record<string, StepConfig> {
    return steps.reduce(
      (acc, step) => {
        acc[step.key] = {
          label: step.label,
          order: step.order,
          nextStep: step.nextStep,
          inputs: step.inputs,
        };
        return acc;
      },
      {} as Record<string, StepConfig>
    );
  }

  private promptsToRecord(prompts: AgentPromptDocument[]): Record<string, PromptConfig> {
    return prompts.reduce(
      (acc, prompt) => {
        acc[prompt.key] = {
          system: prompt.system,
          model: prompt.model,
          temperature: prompt.temperature,
          maxTokens: prompt.maxTokens,
          reasoningEffort: prompt.reasoningEffort,
        };
        return acc;
      },
      {} as Record<string, PromptConfig>
    );
  }

  private assessmentToConfig(assessment: AgentAssessmentDocument): AssessmentConfig {
    return {
      testContent: assessment.testContent,
      language: assessment.language,
      durationSeconds: assessment.durationSeconds,
    };
  }

  private async rebuildSlidesIfNeeded(
    agentId: ObjectId,
    stepOrder: string[],
    render?: AgentDocument['render']
  ): Promise<void> {
    if (render?.mode !== 'presentation' || !render.presentation?.link) return;

    const slides = buildSlidesFromStepOrder(stepOrder);

    await this.agentRepository.updateByIdOrThrow(
      agentId,
      {
        'render.presentation.slides': slides,
      },
      'Agent'
    );
  }
  /**
   * Collapse step order to only parent/selectable steps
   * Reverses expandStepOrder: ["intro", "introWork", "work", "conclusionWork", "conclusion"]
   * becomes: ["intro", "work", "conclusion"]
   */
  private collapseStepOrder(stepOrder: string[]): string[] {
    return stepOrder.filter((key) => !isSubStep(key));
  }
  // ============================================
  // RESPONSE TRANSFORMERS
  // ============================================

  private async toResponse(
    agentId: ObjectId,
    options: GetAgentOptions = { includeSteps: true, includePrompts: true, includeAssessment: true }
  ): Promise<AgentDTO> {
    const agent = await this.agentRepository.findByIdOrThrow(agentId, 'Agent');

    const fetchPromises: Promise<unknown>[] = [];
    const fetchKeys: ('steps' | 'prompts' | 'assessment')[] = [];

    if (options.includeSteps) {
      fetchPromises.push(this.agentStepRepository.findByAgentId(agentId));
      fetchKeys.push('steps');
    }
    if (options.includePrompts) {
      fetchPromises.push(this.agentPromptRepository.findByAgentId(agentId));
      fetchKeys.push('prompts');
    }
    if (options.includeAssessment) {
      fetchPromises.push(this.agentAssessmentRepository.findByAgentId(agentId));
      fetchKeys.push('assessment');
    }

    const results = await Promise.all(fetchPromises);

    const dto: AgentDTO = {
      _id: agent._id.toString(),
      label: agent.label,
      ownerId: agent.ownerId.toString(),
      organizationId: agent.organizationId?.toString(),
      voice: agent.voice,
      features: agent.features,
      render: agent.render,
      conversationTypeId: agent.conversationTypeId,
      stepOrder: options.collapseSubSteps
        ? this.collapseStepOrder(agent.stepOrder)
        : agent.stepOrder,
      summaryTypeId: agent.summaryTypeId,
      statisticsTypeId: agent.statisticsTypeId,
      status: agent.status,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    };

    fetchKeys.forEach((key, index) => {
      if (key === 'steps') {
        let steps = results[index] as AgentStepDocument[];
        if (options.collapseSubSteps) {
          steps = steps.filter((step) => !isSubStep(step.key));
        }
        dto.steps = this.stepsToRecord(steps);
      } else if (key === 'prompts') {
        dto.prompts = this.promptsToRecord(results[index] as AgentPromptDocument[]);
      } else if (key === 'assessment') {
        const assessment = results[index] as AgentAssessmentDocument | null;
        if (assessment) dto.assessment = this.assessmentToConfig(assessment);
      }
    });

    return dto;
  }

  toListItems(agents: AgentDocument[]): AgentListItemDTO[] {
    return agents.map((agent) => this.toListItemDTO(agent));
  }

  private toListItemDTO(agent: AgentDocument): AgentListItemDTO {
    return {
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
    };
  }

  // ============================================
  // SUB-RESOURCE RESPONSE TRANSFORMERS
  // ============================================

  private stepToResponse(step: AgentStepDocument): Record<string, unknown> {
    return {
      _id: step._id.toString(),
      agentId: step.agentId.toString(),
      key: step.key,
      label: step.label,
      order: step.order,
      nextStep: step.nextStep,
      inputs: step.inputs,
      createdAt: step.createdAt.toISOString(),
      updatedAt: step.updatedAt.toISOString(),
    };
  }

  private stepsToResponse(steps: AgentStepDocument[]): Record<string, unknown>[] {
    return steps.map((step) => this.stepToResponse(step));
  }

  private promptToResponse(prompt: AgentPromptDocument): Record<string, unknown> {
    return {
      _id: prompt._id.toString(),
      agentId: prompt.agentId.toString(),
      key: prompt.key,
      system: prompt.system,
      model: prompt.model,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    };
  }

  private promptsToResponse(prompts: AgentPromptDocument[]): Record<string, unknown>[] {
    return prompts.map((prompt) => this.promptToResponse(prompt));
  }

  private assessmentToResponse(assessment: AgentAssessmentDocument): Record<string, unknown> {
    return {
      _id: assessment._id.toString(),
      agentId: assessment.agentId.toString(),
      testContent: assessment.testContent,
      language: assessment.language,
      durationSeconds: assessment.durationSeconds,
      createdAt: assessment.createdAt.toISOString(),
      updatedAt: assessment.updatedAt.toISOString(),
    };
  }
}
