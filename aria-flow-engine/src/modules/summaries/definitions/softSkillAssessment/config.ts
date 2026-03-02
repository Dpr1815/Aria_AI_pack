import { SummaryDefinition, SummarySectionDefinition } from '../../types';

import {
  SSASummaryDataSchema,
  RolePlaySectionSchema,
  ScenarioQuestionsSectionSchema,
  OpenQuestionsSectionSchema,
} from './schema';

/** Type ID owned by this definition. */
export const SSA_SUMMARY_ID = 'softSkillAssessment';

// ============================================
// SECTION DEFINITIONS
// ============================================

const rolePlaySection: SummarySectionDefinition = {
  key: 'ssaRolePlay',
  promptId: 'ssa_summary_role_play',
  required: false,
  variables: {
    fromStepCard: ['role_play_scenario', 'character_description', 'skills_to_observe', 'turning_points'],
    injectConversation: true,
  },
  outputSchema: RolePlaySectionSchema,
};

const scenarioQuestionsSection: SummarySectionDefinition = {
  key: 'ssaScenarioQuestions',
  promptId: 'ssa_summary_scenario_questions',
  required: false,
  variables: {
    fromStepCard: ['scenarios', 'skills_to_evaluate', 'evaluation_focus'],
    injectConversation: true,
  },
  outputSchema: ScenarioQuestionsSectionSchema,
};

const openQuestionsSection: SummarySectionDefinition = {
  key: 'ssaOpenQuestions',
  promptId: 'ssa_summary_open_questions',
  required: false,
  variables: {
    fromStepCard: ['questions_focus_areas', 'skills_to_evaluate', 'depth_level'],
    injectConversation: true,
  },
  outputSchema: OpenQuestionsSectionSchema,
};

// ============================================
// FULL DEFINITION
// ============================================

export const ssaSummaryConfig: SummaryDefinition = {
  id: SSA_SUMMARY_ID,
  name: 'Soft Skill Assessment Summary',
  description:
    'Summary of a soft skill assessment session including role-play performance, scenario-based evaluation, and open-ended question analysis with per-skill scores and conversational evidence',

  compatibleConversationTypes: ['softSkillAssessment'],

  sections: [rolePlaySection, scenarioQuestionsSection, openQuestionsSection],

  main: {
    promptId: 'ssa_summary_main',
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

  outputSchema: SSASummaryDataSchema,
};
