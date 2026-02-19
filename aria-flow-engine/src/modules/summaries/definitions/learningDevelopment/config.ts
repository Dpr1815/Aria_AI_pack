import { SummaryDefinition, SummarySectionDefinition } from '../../types';

import {
  LDSummaryDataSchema,
  KnowledgeTransferSectionSchema,
  PracticalApplicationSectionSchema,
} from './schema';

/** Type ID owned by this definition. */
export const LD_SUMMARY_ID = 'learningDevelopment';

// ============================================
// SECTION DEFINITIONS
// ============================================

const knowledgeTransferSection: SummarySectionDefinition = {
  key: 'knowledgeTransfer',
  promptId: 'ld_summary_knowledge_transfer',
  required: false,
  variables: {
    fromStepCard: ['topic', 'key_concepts', 'learning_outcomes', 'difficulty_level'],
    injectConversation: true,
  },
  outputSchema: KnowledgeTransferSectionSchema,
};

const practicalApplicationSection: SummarySectionDefinition = {
  key: 'practicalApplication',
  promptId: 'ld_summary_practical_application',
  required: false,
  variables: {
    fromStepCard: ['scenario_context', 'scenario_objective', 'expected_behaviors', 'evaluation_criteria'],
    injectConversation: true,
  },
  outputSchema: PracticalApplicationSectionSchema,
};

// ============================================
// FULL DEFINITION
// ============================================

export const ldSummaryConfig: SummaryDefinition = {
  id: LD_SUMMARY_ID,
  name: 'Learning & Development Summary',
  description:
    'Summary of a learning and development session including knowledge comprehension, practical application performance, and readiness assessment',

  compatibleConversationTypes: ['learningDevelopment'],

  sections: [knowledgeTransferSection, practicalApplicationSection],

  main: {
    promptId: 'ld_summary_main',
    variables: {
      injectSectionResults: true,
      injectTimeAnalysis: false,
      fromContext: {
        agentLabel: 'agent.label',
        language: 'agent.voice.languageCode',
        steps: 'agent.stepOrder',
      },
    },
  },

  outputSchema: LDSummaryDataSchema,
};
