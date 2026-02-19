import { PromptTemplate, PromptCategory, ValidationError, NotFoundError } from '@utils';
import { allPromptTemplates } from './templates';

const promptRegistry: Map<string, PromptTemplate> = new Map();

Object.values(allPromptTemplates).forEach((template) => {
  if (promptRegistry.has(template.id)) {
    throw new ValidationError(`Duplicate prompt template ID: ${template.id}`);
  }
  promptRegistry.set(template.id, template);
});

export const getPromptTemplate = (templateId: string): PromptTemplate | undefined => {
  return promptRegistry.get(templateId);
};

export const getPromptTemplateOrThrow = (templateId: string): PromptTemplate => {
  const template = promptRegistry.get(templateId);
  if (!template) {
    throw new NotFoundError('PromptTemplate', templateId);
  }
  return template;
};

export const getPromptsByCategory = (category: PromptCategory): PromptTemplate[] => {
  return Array.from(promptRegistry.values()).filter((t) => t.category === category);
};

export const getAvailableTemplateIds = (): string[] => {
  return Array.from(promptRegistry.keys());
};

export const isTemplateRegistered = (templateId: string): boolean => {
  return promptRegistry.has(templateId);
};

export * from './templates';
