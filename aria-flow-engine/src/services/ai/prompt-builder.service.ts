// src/services/ai/prompt-builder.service.ts

import { getPromptTemplate } from '../../prompts';
import { PROMPT_CONFIG } from '@config';
import { BuildPromptParams, BuiltPrompt, PromptTemplate, NotFoundError, ValidationError } from '@utils';
import { logger } from '../../utils/logger';
import { ReasoningEffort } from '@connectors/llm/model-capabilities';
export class PromptBuilderService {
  constructor() {}

  /**
   * Build a prompt from template with dynamic variable substitution
   */
  async buildPrompt(params: BuildPromptParams): Promise<BuiltPrompt> {
    const { templateId, variables, context, options } = params;

    try {
      // Get the prompt template
      const template = getPromptTemplate(templateId);
      if (!template) {
        throw new NotFoundError('PromptTemplate', templateId);
      }

      // Validate required variables
      this.validateTemplateVariables(template, variables);

      // Substitute variables in the template
      const promptContent = this.substituteVariables(template.template, variables);

      // Apply any custom instructions
      const finalContent = this.applyCustomInstructions(promptContent, options?.customInstructions);

      // Build the complete prompt configuration
      const builtPrompt: BuiltPrompt = {
        content: finalContent,
        model: options?.model || template.model || this.getDefaultModel(),
        maxTokens: options?.maxTokens || template.maxTokens || this.getDefaultMaxTokens(),
        temperature: options?.temperature || template.temperature || this.getDefaultTemperature(),
        reasoningEffort: options?.reasoningEffort || this.getDefaultReasoning(),
        responseFormat: options?.responseFormat || template.responseFormat,
        templateId: templateId,
        originalVariables: variables,
        originalTemplate: template.template,
      };

      logger.info('Prompt built successfully', {
        templateId,
        variableCount: Object.keys(variables).length,
        contentLength: finalContent.length,
        model: builtPrompt.model,
      });

      return builtPrompt;
    } catch (error) {
      logger.error('Failed to build prompt', error instanceof Error ? error : undefined, {
        templateId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        variables: Object.keys(variables),
      });
      throw error;
    }
  }

  /**
   * Build multiple prompts in batch
   */
  async buildMultiplePrompts(requests: BuildPromptParams[]): Promise<BuiltPrompt[]> {
    const results = await Promise.allSettled(requests.map((request) => this.buildPrompt(request)));

    const builtPrompts: BuiltPrompt[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        builtPrompts.push(result.value);
      } else {
        errors.push(`Request ${index}: ${result.reason}`);
      }
    });

    if (errors.length > 0) {
      logger.warn('Some prompts failed to build', { errors });
    }

    return builtPrompts;
  }

  /**
   * Preview a prompt without building (useful for debugging)
   */
  previewPrompt(templateId: string, variables: Record<string, any>): string {
    const template = getPromptTemplate(templateId);
    if (!template) {
      throw new NotFoundError('PromptTemplate', templateId);
    }

    return this.substituteVariables(template.template, variables);
  }

  /**
   * Validate that all required variables are provided
   * Supports dot notation for nested objects
   */
  private validateTemplateVariables(
    template: PromptTemplate,
    variables: Record<string, any>
  ): void {
    const missingVariables = template.variables.filter((varName) => {
      const value = this.getNestedValue(variables, varName);
      return value === undefined || value === null;
    });

    if (missingVariables.length > 0) {
      throw new ValidationError(
        `Missing required variables for template "${template.id}": ${missingVariables.join(', ')}`
      );
    }
  }
  /**
   * Substitute variables in template using {{variable}} syntax
   * Supports dot notation for nested objects: {{scenario.candidate_role}}
   */
  private substituteVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    // Find all {{variable}} patterns including dot notation
    const variablePattern = /{{([^}]+)}}/g;

    result = result.replace(variablePattern, (match, varPath) => {
      const value = this.getNestedValue(variables, varPath.trim());

      if (value === undefined || value === null) {
        // Return original placeholder if value not found
        return match;
      }

      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    });

    // Check if there are any unreplaced variables
    const unreplacedVariables = result.match(/{{[^}]+}}/g);
    if (unreplacedVariables) {
      logger.warn('Unreplaced variables found in prompt', {
        unreplacedVariables: unreplacedVariables.map((v) => v.replace(/[{}]/g, '')),
      });
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   * e.g., getNestedValue({scenario: {role: "test"}}, "scenario.role") => "test"
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Apply custom instructions to the prompt
   */
  private applyCustomInstructions(content: string, customInstructions?: string): string {
    if (!customInstructions) {
      return content;
    }

    return `${content}\n\nAdditional Instructions:\n${customInstructions}`;
  }

  /**
   * Get default model
   */
  private getDefaultModel(): string {
    return PROMPT_CONFIG.DEFAULT_MODEL;
  }

  /**
   * Get default max tokens
   */
  private getDefaultMaxTokens(): number {
    return PROMPT_CONFIG.DEFAULT_MAX_TOKENS;
  }

  /**
   * Get default temperature
   */
  private getDefaultTemperature(): number {
    return PROMPT_CONFIG.DEFAULT_TEMPERATURE;
  }

  /**
   * Get default reasoning
   */
  private getDefaultReasoning(): ReasoningEffort {
    return 'low';
  }
}
export const promptBuilder = new PromptBuilderService();
