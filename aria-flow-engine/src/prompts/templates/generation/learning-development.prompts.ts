import { PromptTemplate } from '@utils';

export const LD_GENERATION_PROMPTS: Record<string, PromptTemplate> = {
  // ============================================
  // L&D STEP GENERATION PROMPTS
  // ============================================

  GENERATE_LD_INTRO: {
    id: 'generate_ld_intro',
    name: 'Generate L&D Introduction',
    template: `Generate the introduction section for a Learning & Development training session.

<context>
Training Summary: {{summary}}
Session Structure: {{steps}}
Language: {{language}}
</context>

<task>
Create a professional L&D session introduction that:
1. Clearly states the training topic
2. Defines measurable learning objectives
3. Outlines the session structure
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "topic": "The main topic or subject of the training session",
  "learning_objectives": "Clear, measurable learning objectives for the session",
  "session_structure": "Brief summary of how the session will be structured"
}
</output_format>

<rules>
1. Use ONLY data from the provided summary - do not invent information
2. If data cannot be inferred, use "NaN"
3. Write all content in {{language}}
4. Learning objectives should be specific and measurable (use action verbs like: understand, apply, demonstrate, analyze)
5. Keep descriptions professional and engaging
</rules>`,
    variables: ['summary', 'steps', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_LD_KNOWLEDGE_TRANSFER: {
    id: 'generate_ld_knowledge_transfer',
    name: 'Generate Knowledge Transfer Section',
    template: `Generate the knowledge transfer section for a Learning & Development training session.

<context>
Training Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a knowledge transfer phase that identifies the core concepts to teach, expected learning outcomes, and appropriate difficulty level.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "topic": "The main subject being taught",
  "key_concepts": ["Array of core concepts and theories to cover during the session. Each concept should be specific and teachable."],
  "learning_outcomes": "Expected learning outcomes after this phase, written as measurable statements",
  "difficulty_level": "beginner" | "intermediate" | "advanced"
}
</output_format>

<rules>
1. Extract key concepts directly from the training summary
2. Each concept should be distinct and teachable in a conversational format
3. Learning outcomes should be measurable and specific
4. Difficulty level should match the target audience described in the summary
5. Use ONLY data from the provided summary
6. If data cannot be inferred, use "NaN"
7. Write all content in {{language}}
8. Include 3-5 key concepts
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_LD_PRACTICAL_APPLICATION: {
    id: 'generate_ld_practical_application',
    name: 'Generate Practical Application Section',
    template: `Generate the practical application section for a Learning & Development training session.

<context>
Training Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a practical exercise scenario that allows the learner to apply the concepts taught in the knowledge transfer phase. The scenario should be realistic and relevant to the training topic.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "scenario_context": "Background situation and context for the practice scenario. Should be realistic and relatable.",
  "scenario_objective": "What the learner needs to achieve or demonstrate in this exercise",
  "expected_behaviors": ["Array of specific behaviors or skills the learner should demonstrate during the exercise"],
  "evaluation_criteria": "Criteria used to evaluate learner performance, including what good performance looks like"
}
</output_format>

<rules>
1. Create a scenario directly related to the training content
2. The scenario should test application of knowledge, not just recall
3. Expected behaviors should be observable and specific
4. Evaluation criteria should be clear and fair
5. Use ONLY data from the provided summary
6. If data cannot be inferred, use "NaN"
7. Write all content in {{language}}
8. Include 3-5 expected behaviors
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_LD_CONCLUSION: {
    id: 'generate_ld_conclusion',
    name: 'Generate L&D Conclusion',
    template: `Generate the conclusion section for a Learning & Development training session.

<context>
Training Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a professional session conclusion that summarizes the learning journey and sets up next steps for continued development.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "topic": "The main topic covered in the session",
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

export type LDGenerationPromptId = keyof typeof LD_GENERATION_PROMPTS;

export const LD_GENERATION_PROMPT_IDS = Object.keys(LD_GENERATION_PROMPTS) as LDGenerationPromptId[];
