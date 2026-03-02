import { PromptTemplate } from '@utils';

export const SSA_GENERATION_PROMPTS: Record<string, PromptTemplate> = {
  // ============================================
  // SSA STEP GENERATION PROMPTS
  // ============================================

  GENERATE_SSA_INTRO: {
    id: 'generate_ssa_intro',
    name: 'Generate SSA Introduction',
    template: `Generate the introduction section for a Soft Skill Assessment session.

<context>
Assessment Summary: {{summary}}
Session Structure: {{steps}}
Language: {{language}}
</context>

<task>
Create a professional soft skill assessment introduction that:
1. Identifies the specific soft skills to be assessed
2. Provides context for the assessment (role, department, purpose)
3. Outlines the session structure
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "skills_to_assess": ["Array of specific soft skills to evaluate (e.g., active listening, empathy, constructive feedback, clarity, assertiveness, adaptability)"],
  "assessment_context": "Context for the assessment including role, department, and purpose of the evaluation",
  "session_structure": "Brief summary of how the session will be structured"
}
</output_format>

<rules>
1. Use ONLY data from the provided summary - do not invent information
2. If data cannot be inferred, use "NaN"
3. Write all content in {{language}}
4. Include 3-6 specific, measurable soft skills
5. Keep descriptions professional and encouraging
6. The assessment context should explain why this assessment is being conducted
</rules>`,
    variables: ['summary', 'steps', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_SSA_ROLE_PLAY: {
    id: 'generate_ssa_role_play',
    name: 'Generate SSA Role Play',
    template: `Generate the role-play exercise section for a Soft Skill Assessment session.

<context>
Assessment Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a realistic role-play scenario where the participant must demonstrate soft skills in a feedback conversation. Design a character for the AI to play and define turning points that will test specific skills.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "role_play_scenario": "Detailed description of the scenario and context for the role-play exercise. Should be realistic and relevant to the workplace.",
  "character_description": "Description of the character the AI will play, including personality, emotional state, and relationship to the participant in the scenario.",
  "skills_to_observe": ["Array of specific soft skills to observe during the role-play interaction"],
  "turning_points": ["Array of specific moments or reactions the AI character will introduce to test particular skills. Each turning point should challenge a different aspect of the participant's soft skills."]
}
</output_format>

<rules>
1. Create a scenario directly related to giving or receiving feedback in the workplace
2. The character should be realistic and have believable motivations
3. Turning points should create moments that reveal specific skills (e.g., the character becomes defensive, emotional, dismissive)
4. Include 3-5 turning points, each testing a different skill
5. Skills to observe should be specific and observable
6. Use ONLY data from the provided summary
7. If data cannot be inferred, use "NaN"
8. Write all content in {{language}}
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_SSA_SCENARIO_QUESTIONS: {
    id: 'generate_ssa_scenario_questions',
    name: 'Generate SSA Scenario Questions',
    template: `Generate the scenario-based questions section for a Soft Skill Assessment session.

<context>
Assessment Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create workplace scenarios that test the participant's situational judgment and soft skills. Each scenario should present a realistic challenge related to feedback, communication, or interpersonal dynamics.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "scenarios": ["Array of workplace scenario descriptions. Each scenario should present a specific situation requiring soft skills to navigate effectively."],
  "skills_to_evaluate": ["Array of soft skills to evaluate through the scenario responses"],
  "evaluation_focus": "The main aspect or theme to focus on when evaluating responses (e.g., conflict resolution approach, empathy demonstration, communication clarity)"
}
</output_format>

<rules>
1. Create 3-4 distinct scenarios covering different aspects of soft skills
2. Each scenario should be realistic, relatable, and challenging
3. Scenarios should test application of skills, not just knowledge
4. Skills to evaluate should be specific and measurable
5. Use ONLY data from the provided summary
6. If data cannot be inferred, use "NaN"
7. Write all content in {{language}}
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_SSA_OPEN_QUESTIONS: {
    id: 'generate_ssa_open_questions',
    name: 'Generate SSA Open Questions',
    template: `Generate the open-ended questions section for a Soft Skill Assessment session.

<context>
Assessment Summary: {{summary}}
Language: {{language}}
</context>

<task>
Define focus areas for open-ended questions that evaluate the participant's self-awareness, communication philosophy, and understanding of interpersonal dynamics.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "questions_focus_areas": ["Array of focus areas for the open-ended questions (e.g., feedback culture, conflict management, team dynamics, personal growth)"],
  "skills_to_evaluate": ["Array of soft skills to evaluate through the open-ended responses"],
  "depth_level": "surface" | "moderate" | "deep"
}
</output_format>

<rules>
1. Include 3-5 diverse focus areas related to soft skills
2. Focus areas should enable questions that reveal self-awareness and reflection
3. Depth level should match the seniority or experience expected from the target audience
4. Skills to evaluate should be specific and measurable
5. Use ONLY data from the provided summary
6. If data cannot be inferred, use "NaN"
7. Write all content in {{language}}
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_SSA_CONCLUSION: {
    id: 'generate_ssa_conclusion',
    name: 'Generate SSA Conclusion',
    template: `Generate the conclusion section for a Soft Skill Assessment session.

<context>
Assessment Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a professional session conclusion that summarizes the assessment and prepares for the feedback report.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "skills_assessed": ["Array of skills that were assessed during the session"],
  "session_structure": "Summary of what was covered in the session, suitable for a recap"
}
</output_format>

<rules>
1. Keep the recap concise but comprehensive
2. Use ONLY data from the provided summary
3. If data cannot be inferred, use "NaN"
4. Write all content in {{language}}
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },
};

// ============================================
// HELPER TYPES
// ============================================

export type SSAGenerationPromptId = keyof typeof SSA_GENERATION_PROMPTS;

export const SSA_GENERATION_PROMPT_IDS = Object.keys(SSA_GENERATION_PROMPTS) as SSAGenerationPromptId[];
