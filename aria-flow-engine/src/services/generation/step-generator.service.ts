/**
 * Step Generator Service
 *
 * Generates content for interview steps using AI.
 * Supports single-template and multi-stage pipeline generation.
 *
 * @module services/generation
 */

import { OpenAIService } from '../ai/openai.service';
import { PromptBuilderService } from '../ai/prompt-builder.service';
import {
  getStepDefinition,
  hasGenerationConfig,
  GenerationConfig,
  GenerationStage,
  VariableSource,
} from '@modules';
import { GenerateStepInput } from '@validations';
import { createLogger } from '@utils';
import { ValidationError } from '@utils/errors';

const logger = createLogger('StepGeneratorService');

/**
 * Service responsible for generating step content using AI
 */
export class StepGeneratorService {
  constructor(
    private readonly openaiService: OpenAIService,
    private readonly promptBuilder: PromptBuilderService
  ) {}

  /**
   * Generate content for multiple steps
   *
   * Deduplicates steps sharing the same generation template to avoid
   * redundant AI calls. Results are propagated to all related steps.
   *
   * @param stepIds - Array of step IDs to generate content for
   * @param input - Generation input containing summary, language, and additionalData
   * @returns Map of stepId to generated content
   */
  async generateMultipleSteps(
    stepIds: string[],
    input: GenerateStepInput
  ): Promise<Record<string, Record<string, unknown>>> {
    const results: Record<string, Record<string, unknown>> = {};

    // Deduplicate by generation template
    const uniqueSteps = this.deduplicateByTemplate(stepIds, input.additionalData);

    logger.info('Generating step content', {
      requestedCount: stepIds.length,
      uniqueCount: uniqueSteps.length,
      steps: uniqueSteps,
    });

    for (const stepId of uniqueSteps) {
      try {
        results[stepId] = await this.generateStep(stepId, input);
      } catch (error) {
        logger.error('Step generation failed', error as Error, { stepId });
        throw error;
      }
    }

    // Propagate results to steps sharing the same template
    this.propagateSharedResults(stepIds, results, input.additionalData);

    return results;
  }

  /**
   * Generate content for a single step
   *
   * Routes to single-template or pipeline generation based on step configuration.
   *
   * @param stepId - Step identifier
   * @param input - Generation input
   * @returns Generated content as flat key-value object
   */
  async generateStep(stepId: string, input: GenerateStepInput): Promise<Record<string, unknown>> {
    const def = getStepDefinition(stepId);

    if (!def?.generation) {
      logger.debug('No generation config for step', { stepId });
      return {};
    }

    // Route to appropriate generation method
    if (def.generation.stages?.length) {
      return this.executePipeline(stepId, def.generation.stages, input);
    }

    return this.executeSingleTemplate(stepId, def.generation, input);
  }

  /**
   * Execute single-template generation
   */
  private async executeSingleTemplate(
    stepId: string,
    config: GenerationConfig,
    input: GenerateStepInput
  ): Promise<Record<string, unknown>> {
    const templateId = this.resolveTemplateId(config, input.additionalData);

    if (!templateId) {
      logger.warn('Could not resolve template', { stepId });
      return {};
    }

    const variables = this.buildGenerationVariables(config, input);

    logger.debug('Executing single-template generation', {
      stepId,
      templateId,
      variableKeys: Object.keys(variables),
    });

    const builtPrompt = await this.promptBuilder.buildPrompt({
      templateId,
      variables,
      options: { responseFormat: 'json_object' },
    });

    const result = await this.openaiService.executePromptJSON<Record<string, unknown>>(builtPrompt);

    logger.info('Single-template generation completed', { stepId, templateId });

    return result.content;
  }

  /**
   * Execute multi-stage pipeline generation
   *
   * Each stage can reference outputs from previous stages.
   * Results are deep-merged into a single output object.
   */
  private async executePipeline(
    stepId: string,
    stages: GenerationStage[],
    input: GenerateStepInput
  ): Promise<Record<string, unknown>> {
    const stageOutputs: Record<string, Record<string, unknown>> = {};
    let mergedOutput: Record<string, unknown> = {};

    logger.info('Starting pipeline generation', {
      stepId,
      stageCount: stages.length,
      stageIds: stages.map((s) => s.id),
    });

    for (const stage of stages) {
      const stageResult = await this.executeStage(stage, input, stageOutputs);
      stageOutputs[stage.id] = stageResult;
      mergedOutput = this.deepMerge(mergedOutput, stageResult);

      logger.debug('Pipeline stage completed', {
        stepId,
        stageId: stage.id,
        outputKeys: Object.keys(stageResult),
      });
    }

    logger.info('Pipeline generation completed', { stepId });

    return mergedOutput;
  }

  /**
   * Execute a single pipeline stage
   */
  private async executeStage(
    stage: GenerationStage,
    input: GenerateStepInput,
    previousOutputs: Record<string, Record<string, unknown>>
  ): Promise<Record<string, unknown>> {
    const templateId = this.resolveStageTemplateId(stage, input.additionalData);

    if (!templateId) {
      throw new ValidationError(`Could not resolve template for stage "${stage.id}"`);
    }

    // Validate stage-specific requirements
    this.validateStageRequirements(stage, input.additionalData);

    // Build variables for this stage
    const variables = stage.variableMapping
      ? this.resolveVariableMapping(stage.variableMapping, input, previousOutputs)
      : this.buildGenerationVariables({ template: templateId }, input);

    const builtPrompt = await this.promptBuilder.buildPrompt({
      templateId,
      variables,
      options: { responseFormat: 'json_object' },
    });

    const result = await this.openaiService.executePromptJSON<Record<string, unknown>>(builtPrompt);

    return result.content;
  }

  /**
   * Resolve template ID from generation config
   *
   * Handles both simple string templates and conditional template maps.
   */
  private resolveTemplateId(
    config: GenerationConfig,
    additionalData?: Record<string, unknown>
  ): string | undefined {
    // Simple template
    if (config.template && typeof config.template === 'string') {
      return config.template;
    }

    // Conditional templates
    if (config.templates && config.templateSelector && additionalData) {
      const selector = additionalData[config.templateSelector] as string;
      return config.templates[selector] ?? config.templates.default;
    }

    return undefined;
  }

  /**
   * Resolve template ID for a pipeline stage
   */
  private resolveStageTemplateId(
    stage: GenerationStage,
    additionalData?: Record<string, unknown>
  ): string | undefined {
    const { template, templateSelector } = stage;

    if (typeof template === 'string') {
      return template;
    }

    if (templateSelector && additionalData) {
      const selector = additionalData[templateSelector] as string;
      if (selector && template[selector]) {
        return template[selector];
      }
    }

    return template.default;
  }

  /**
   * Build variables for generation template
   *
   * Combines base input (summary, language) with additionalData.
   */
  private buildGenerationVariables(
    config: GenerationConfig,
    input: GenerateStepInput
  ): Record<string, unknown> {
    const variables: Record<string, unknown> = {
      summary: input.summary,
      language: input.language,
    };

    // Include steps array if configured
    if (config.includeSteps && input.steps) {
      variables.steps = JSON.stringify(input.steps);
    }

    // Merge additionalData (flat structure)
    if (input.additionalData) {
      Object.assign(variables, input.additionalData);
    }

    return variables;
  }

  /**
   * Resolve variable mapping for pipeline stages
   *
   * Supports sources: input, additionalData, stage:<id>
   */
  private resolveVariableMapping(
    mapping: Record<string, VariableSource>,
    input: GenerateStepInput,
    previousOutputs: Record<string, Record<string, unknown>>
  ): Record<string, unknown> {
    const variables: Record<string, unknown> = {};

    for (const [varName, source] of Object.entries(mapping)) {
      const value = this.resolveVariableSource(source, input, previousOutputs);
      if (value !== undefined) {
        variables[varName] = value;
      }
    }

    return variables;
  }

  /**
   * Resolve a single variable from its source
   */
  private resolveVariableSource(
    source: VariableSource,
    input: GenerateStepInput,
    previousOutputs: Record<string, Record<string, unknown>>
  ): unknown {
    let value: unknown;

    switch (source.from) {
      case 'input':
        value = this.getNestedValue(input as unknown as Record<string, unknown>, source.path);
        break;

      case 'additionalData':
        value = this.getNestedValue(input.additionalData ?? {}, source.path);
        if (value === undefined && source.fallback) {
          value = this.getNestedValue(input.additionalData ?? {}, source.fallback);
        }
        break;

      default:
        // Handle stage:<stageId> references
        if (source.from.startsWith('stage:')) {
          const stageId = source.from.slice(6);
          const stageOutput = previousOutputs[stageId];
          if (stageOutput) {
            value = this.getNestedValue(stageOutput, source.path);
          }
        }
    }

    return value;
  }

  /**
   * Validate stage-specific requirements
   */
  private validateStageRequirements(
    stage: GenerationStage,
    additionalData?: Record<string, unknown>
  ): void {
    const required = [...(stage.requiredVariables ?? [])];

    // Add conditional requirements based on template selection
    if (stage.conditionalVariables && stage.templateSelector && additionalData) {
      const selector = additionalData[stage.templateSelector] as string;
      const conditional = stage.conditionalVariables[selector];
      if (conditional) {
        required.push(...conditional);
      }
    }

    const missing = required.filter((field) => additionalData?.[field] === undefined);

    if (missing.length > 0) {
      throw new ValidationError(
        `Stage "${stage.id}" requires additionalData fields: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Deduplicate steps by generation template
   *
   * Multiple steps may share the same template (e.g., work sub-steps).
   * Only generate content once per unique template.
   */
  private deduplicateByTemplate(
    stepIds: string[],
    additionalData?: Record<string, unknown>
  ): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const stepId of stepIds) {
      if (!hasGenerationConfig(stepId)) continue;

      const def = getStepDefinition(stepId);
      const templateKey = this.getTemplateKey(def?.generation, additionalData) ?? stepId;

      if (!seen.has(templateKey)) {
        seen.add(templateKey);
        unique.push(stepId);
      }
    }

    return unique;
  }

  /**
   * Get unique key for a generation config (for deduplication)
   */
  private getTemplateKey(
    config?: GenerationConfig,
    additionalData?: Record<string, unknown>
  ): string | undefined {
    if (!config) return undefined;

    if (config.stages?.length) {
      // For pipelines, use first stage template as key
      return this.resolveStageTemplateId(config.stages[0], additionalData);
    }

    return this.resolveTemplateId(config, additionalData);
  }

  /**
   * Propagate generated results to steps sharing the same template
   */
  private propagateSharedResults(
    allStepIds: string[],
    results: Record<string, Record<string, unknown>>,
    additionalData?: Record<string, unknown>
  ): void {
    for (const stepId of allStepIds) {
      if (results[stepId]) continue;

      const def = getStepDefinition(stepId);
      const templateKey = this.getTemplateKey(def?.generation, additionalData);
      if (!templateKey) continue;

      // Find step with matching template that has results
      for (const [otherStepId, otherResults] of Object.entries(results)) {
        const otherDef = getStepDefinition(otherStepId);
        const otherTemplateKey = this.getTemplateKey(otherDef?.generation, additionalData);

        if (otherTemplateKey === templateKey) {
          results[stepId] = otherResults;
          break;
        }
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Deep merge two objects
   *
   * Arrays are replaced, not concatenated.
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      const targetValue = result[key];

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          value as Record<string, unknown>
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
