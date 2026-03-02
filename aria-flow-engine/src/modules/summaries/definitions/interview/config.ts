import { SummaryDefinition, SummarySectionDefinition } from '../../types';

import {
  InterviewSummaryDataSchema,
  BackgroundSectionSchema,
  BehavioralSectionSchema,
  AssessmentSectionSchema,
  LinguisticSectionSchema,
  WorkplaceSafetySectionSchema,
  ScenarioSectionSchema,
} from './schema';

/** Type ID owned by this definition. */
export const INTERVIEW_SUMMARY_ID = 'interview';

// ============================================
// SECTION DEFINITIONS
// ============================================

const backgroundSection: SummarySectionDefinition = {
  key: 'background',
  promptId: 'interview_summary_background',
  required: false,
  variables: {
    fromStepCard: ['job_description', 'key_skills_required'],
    injectConversation: true,
  },
  outputSchema: BackgroundSectionSchema,
};

const workSection: SummarySectionDefinition = {
  key: 'work',
  promptId: 'interview_summary_work',
  required: false,
  variables: {
    fromStepCard: [
      'candidate_role',
      'required_skills',
      'scenario_context',
      'scenario_objective',
      'interviewer_role',
      'initial_interaction',
      'positive_outcome',
      'negative_outcome',
      'key_behaviors',
    ],
    injectConversation: true,
  },
  outputSchema: ScenarioSectionSchema,
};

const assessmentSection: SummarySectionDefinition = {
  key: 'assessment',
  promptId: 'interview_summary_assessment',
  required: false,
  variables: {
    fromStepCard: ['focus_areas', 'assessment_goals'],
    fromAssessmentCard: ['testContent'],
    injectConversation: true,
    injectSessiondata: true,
  },
  outputSchema: AssessmentSectionSchema,
};

const behavioralSection: SummarySectionDefinition = {
  key: 'behavioral',
  promptId: 'interview_summary_behavioral',
  required: false,
  variables: {
    fromStepCard: ['work_environment', 'desired_attributes'],
    injectConversation: true,
  },
  outputSchema: BehavioralSectionSchema,
};

const linguisticSection: SummarySectionDefinition = {
  key: 'linguisticTest',
  promptId: 'interview_summary_linguistic',
  required: false,
  variables: {
    fromStepCard: ['target_language', 'proficiency_level', 'assessment_criteria'],
    injectConversation: true,
  },
  outputSchema: LinguisticSectionSchema,
};

const workplaceSafetySection: SummarySectionDefinition = {
  key: 'workplaceSafety',
  promptId: 'interview_summary_workplace_safety',
  required: false,
  variables: {
    fromStepCard: ['expected_knowledge'],
    injectConversation: true,
  },
  outputSchema: WorkplaceSafetySectionSchema,
};

// ============================================
// FULL DEFINITION
// ============================================

export const interviewSummaryConfig: SummaryDefinition = {
  id: INTERVIEW_SUMMARY_ID,
  name: 'Interview Summary',
  description:
    'Comprehensive summary of an interview session including per-section scores, strengths, and hiring recommendations',

  compatibleConversationTypes: ['interview'],

  sections: [
    backgroundSection,
    workSection,
    assessmentSection,
    behavioralSection,
    linguisticSection,
    workplaceSafetySection,
  ],

  main: {
    promptId: 'interview_summary_main',
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

  outputSchema: InterviewSummaryDataSchema,
};
