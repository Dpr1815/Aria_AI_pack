import { PromptTemplate } from '@utils';

export const RECRUITING_PROMPTS: Record<string, PromptTemplate> = {
  // ============================================
  // CAMPAIGN PART GENERATION PROMPTS
  // ============================================

  GENERATE_INTRO: {
    id: 'generate_intro',
    name: 'Generate Interview Introduction',
    template: `Generate the introduction section for an interview campaign.

<context>
Job Summary: {{summary}}
Interview Structure: {{steps}}
Language: {{language}}
</context>

<task>
Create a professional interview introduction that:
1. Sets clear expectations for the candidate
2. Provides company and role context
3. Outlines the interview structure briefly
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "job_title": "The specific position being interviewed for",
  "company_name": "Name of the hiring organization",
  "interview_struct": "Brief summary of the interview structure"
}
</output_format>

<rules>
1. Use ONLY data from the provided summary - do not invent information
2. If data cannot be inferred, use "NaN"
3. Write all content in {{language}}
4. Keep descriptions professional and concise
</rules>`,
    variables: ['summary', 'steps', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_BACKGROUND: {
    id: 'generate_background',
    name: 'Generate Professional Background Section',
    template: `Generate the professional background section for an interview campaign.

<context>
Job Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a professional background assessment section that evaluates the candidate's relevant experience and qualifications.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
 {

  "job_title": "The specific position being interviewed for",
  "company_name": "Name of the hiring organization",
  "job_description": "In-depth description of the job position in third person",
  "key_skills_required": ["List ONLY technical/hard skills directly related to professional background. Include specific, measurable abilities verifiable through experience, qualifications, or training. DO NOT include soft skills, personality traits, or interpersonal qualities."],
  
  }
</output_format>

<rules>
1. Focus exclusively on HARD SKILLS - technical abilities, certifications, tools, methodologies
2. Skills must be specific and measurable (e.g., "Python programming", "Financial modeling in Excel", "AWS certification")
3. Do NOT include: communication, teamwork, leadership, problem-solving, or other soft skills
4. Use ONLY data from the provided summary
5. If data cannot be inferred, use "NaN"
6. Write all content in {{language}}
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_WORK_SCENARIO: {
    id: 'generate_work_scenario',
    name: 'Generate Work Scenario Simulation',
    template: `You are an AI specialized in creating realistic work scenario simulations for job interviews.

<context>
Job Summary: {{summary}}
Language: {{language}}
</context>

<role_assignment_rule>
The AI must play the PRIMARY TARGET of the position's core function:
- Sales positions → AI plays the potential customer/client
- Customer service → AI plays the customer needing assistance
- Teaching positions → AI plays the student
- Management positions → AI plays the team member
- Technical support → AI plays the user needing help
- Consulting roles → AI plays the client seeking advice
- HR positions → AI plays the employee seeking HR assistance
</role_assignment_rule>

<scenario_guidelines>
1. Identify the position's primary function and who they primarily serve/interact with
2. Make the AI play that target recipient role to directly test core competencies
3. Create a realistic scenario where the candidate must demonstrate their key skills
4. Design the interaction to naturally reveal the candidate's abilities
5. Create success/failure conditions based on target recipient satisfaction
6. Keep scenario details generic while maintaining professional realism
7. Match interaction complexity to role seniority level
8. The initial_interaction must be the FIRST LINE the AI character says to start the conversation
</scenario_guidelines>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "job_title": "The specific position being interviewed for",
  "company_name": "Name of the hiring company",
  "job_description": "Brief description of the position and its responsibilities",
  "candidate_role": "The role the candidate will play in the simulation",
  "scenario_context": "Background situation and business context for the scenario",
  "scenario_objective": "What the candidate needs to achieve in this simulation",
  "interviewer_role": "A SINGLE STRING containing in-depth AI character info: name, job title, personality, and background",
  "initial_interaction": "The AI character's opening line that starts the conversation",
  "positive_outcome": "Complete 'You...' in third person describing the AI character's positive state (e.g., 'feel reassured', 'feel confident')",
  "negative_outcome": "Complete 'You...' in third person describing the AI character's negative state (e.g., 'feel uncertain', 'feel frustrated')",
  "required_skills": ["Array of specific skills being evaluated"],
  "key_behaviors": ["Array of desired behaviors the candidate should demonstrate"]
}
</output_format>

<critical_rules>
1. The AI must ALWAYS play the role of who receives/experiences the candidate's primary job function
2. Never have the AI play a supervisory or colleague role unless the position specifically requires it
3. Focus on creating opportunities for the candidate to demonstrate core job skills
4. Success conditions should reflect satisfaction/results from the target recipient's perspective
5. The initial_interaction MUST be the first line spoken by the AI character
6. Write all content in {{language}}
</critical_rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_WORKPLACE_SAFETY: {
    id: 'generate_workplace_safety',
    name: 'Generate Workplace Safety Section',
    template: `Generate the workplace safety section for an interview campaign.

<context>
Job Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a workplace safety assessment section that evaluates the candidate's knowledge of safety protocols, hazards, and PPE requirements relevant to the position.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "job_title": "The specific position being interviewed for",
  "company_name": "Name of the hiring organization",
  "industry_sector": "The specific industry sector that determines safety protocols (e.g., 'Construction', 'Manufacturing', 'Healthcare')",
  "specific_risks": ["Array of specific workplace hazards and risks associated with the position"],
  "required_ppe": ["Array of required Personal Protective Equipment for the role"],
  "expected_knowledge": "Description of expected candidate knowledge regarding workplace safety"
}
</output_format>

<rules>
1. Identify industry-specific safety requirements
2. List realistic hazards for the specific role
3. Include only PPE relevant to the position
4. Use ONLY data from the provided summary
5. If data cannot be inferred, use "NaN"
6. Write all content in {{language}}
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_ASSESSMENT_SECTION: {
    id: 'generate_assessment_section',
    name: 'Generate Assessment Section Metadata',
    template: `Generate the assessment section metadata for an interview where the candidate completes a test.

<context>
Test Content: {{test_text}}
Language: {{language}}
</context>

<task>
Create metadata for the assessment phase that describes what the test evaluates and its objectives.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "job_title": "The specific position being interviewed for",
  "company_name": "Name of the hiring organization",
  "assessment_goals": "Specific objectives of this assessment phase",
  "focus_areas": ["Array of skills assessed during the test"]
}
</output_format>

<rules>
1. Derive goals and focus areas from the actual test content
2. Be specific about what competencies are being measured
3. Use ONLY data from the provided test
4. Write all content in {{language}}
</rules>`,
    variables: ['test_text', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_BEHAVIORAL: {
    id: 'generate_behavioral',
    name: 'Generate Behavioral Assessment Section',
    template: `Generate the behavioral assessment section for an interview campaign.

<context>
Job Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a behavioral assessment section that evaluates the candidate's soft skills, cultural fit, and alignment with company values.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "job_title": "The specific position being interviewed for",
  "company_name": "The organization conducting the interview",
  "key_competencies": ["Array of critical behavioral competencies to assess"],
  "company_values": ["Array of organization's core values"],
  "work_environment": "Description of workplace culture and environment",
  "desired_attributes": ["Specific behavioral traits sought in candidates - must be derived from provided requirements or company values"]
}
</output_format>

<rules>
1. Focus on soft skills and interpersonal competencies
2. Align assessment criteria with company values
3. Include realistic cultural fit indicators
4. Use ONLY data from the provided summary
5. If data cannot be inferred, use "NaN"
6. Write all content in {{language}}
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_LINGUISTIC_TEST: {
    id: 'generate_linguistic_test',
    name: 'Generate Linguistic Test Section',
    template: `Generate the linguistic test section for an interview campaign.

<context>
Job Summary: {{summary}}
Target Language: {{target_language}}
Output Language: {{language}}
</context>

<task>
Create a language proficiency assessment section that evaluates the candidate's abilities in the target language.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "target_language": "The language being tested",
  "proficiency_level": "Expected proficiency level (e.g., 'B1', 'B2', 'C1')",
  "topic": "Main topic or theme of the passage to be read during the test",
  "assessment_criteria": "String defining expectations for candidate comprehension"
}
</output_format>

<rules>
1. Set appropriate proficiency level based on job requirements
2. Choose a topic relevant to the job role
3. Define clear assessment criteria
4. Use ONLY data from the provided summary
5. Write metadata in {{language}}
</rules>`,
    variables: ['summary', 'target_language', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  GENERATE_CONCLUSION: {
    id: 'generate_conclusion',
    name: 'Generate Interview Conclusion',
    template: `Generate the conclusion section for an interview campaign.

<context>
Job Summary: {{summary}}
Language: {{language}}
</context>

<task>
Create a professional interview conclusion that thanks the candidate and outlines next steps in the selection process.
</task>

<output_format>
Return ONLY valid JSON matching this exact structure:
{
  "job_title": "The specific position the candidate interviewed for",
  "company_name": "Name of the hiring organization",
  "next_steps": "Structured description of the upcoming selection process phases"
}
</output_format>

<rules>
1. Keep the tone professional and appreciative
2. Provide clear next steps information
3. Use ONLY data from the provided summary
4. If data cannot be inferred, use "NaN"
5. Write all content in {{language}}
</rules>`,
    variables: ['summary', 'language'],
    category: 'generation',
    model: 'gpt-4.1-nano',
    maxTokens: 4000,
    temperature: 0.5,
    responseFormat: 'json_object',
  },

  // ============================================
  // ASSESSMENT GENERATION PROMPTS
  // ============================================

  GENERATE_HARD_SKILL_TEST: {
    id: 'generate_hard_skill_test',
    name: 'Generate Hard Skill Assessment Test',
    template: `You are an expert assessment designer creating practical work-scenario tests that evaluate real job skills.

<context>
Job Description: {{summary}}
Duration: {{time_minutes}} minutes
Language: {{language}}
</context>

<output_requirements>
Return ONLY valid JSON with this exact structure:
{
  "test_text": "Markdown string with complete test description",
  "test_specs": "What this test evaluates",
  "further_specifications": "Key skills being tested",
  "time_minutes": "number (from input {{time_minutes}})"
}
</output_requirements>

<language_requirements>
- ALL content MUST be in {{language}}
- Use proper {{language}} grammar, punctuation, and formatting
- Use standard UTF-8 encoding with no special characters causing encoding issues
- Keep sentences clear, professional, and well-structured
</language_requirements>

<markdown_formatting>
- ALWAYS use ### (triple hash) for all headings and titles
- NEVER use # or ## (single or double hash) - they render too large
- For subsections, use ### or #### only
- Use **bold** for emphasis where needed
- Use bullet points with - or * for lists
- NEVER create tables in any format (Markdown or HTML)
- ALWAYS present data as structured bullet-point lists
</markdown_formatting>

<test_design_principles>
1. COMPLETENESS - The test must be fully self-contained:
   - Include ALL data, numbers, and information needed to solve the test
   - Provide specific metrics, figures, constraints, and initial conditions
   - Do NOT reference external tools, calculators, or software
   - Do NOT assume the candidate has access to anything except a text editor
   - Every question must be answerable using only the information provided

2. APPROPRIATE COMPLEXITY:
   - Calculations should match the role's requirements (can be complex for technical roles)
   - For analytical roles: include multi-step calculations, data analysis, or statistical reasoning
   - For technical roles: include realistic technical problem-solving with appropriate math
   - Complexity should test competence, not be artificially simplified
   - Candidate should be able to perform calculations with pen and paper or basic mental math

3. TIME-BOUND SOLVABILITY:
   - Test MUST be completable in exactly {{time_minutes}} minutes by a competent professional
   - Account for: reading scenario (2-3 min), analyzing data (20-30%), calculating (20-30%), writing response (30-40%)
   - Question count based on time:
     * ≤15 minutes: 1 multi-part question
     * ≤30 minutes: 2-3 focused questions
     * >30 minutes: 3-4 comprehensive questions
   - Questions should test depth of understanding, not just speed
</test_design_principles>

<test_structure>
1. **Scenario Context** (2-3 paragraphs):
   - Realistic work situation directly related to the job description
   - Clear description of current state, challenges, or objectives
   - Specific role-appropriate constraints and resources

2. **Data Section** - COMPLETE information including:
   - All relevant metrics, numbers, and measurements
   - Current performance indicators
   - Budget/resource limitations
   - Timeline requirements
   - Any formulas or rates needed for calculations
   - Industry-standard benchmarks or targets

3. **Tasks/Questions**:
   - Each question should test PRIMARY skills from the job description
   - Require analysis, calculation, and professional judgment
   - Ask for clear deliverables (recommendations, decisions, plans)
   - Request explanation of reasoning and assumptions
   - Questions should build upon each other logically

4. **Expected Response Format**:
   - Specify what format the answer should take
   - Clarify if calculations should be shown
   - Indicate desired level of detail
</test_structure>

<validation_checklist>
Before returning output, confirm:
- [ ] Test is completable in {{time_minutes}} minutes
- [ ] ALL necessary data is included to answer every question
- [ ] Skills tested align with the job description
- [ ] Qualified professional can demonstrate competence through this test
- [ ] Complexity is appropriate for the role level
- [ ] Calculations are realistic for the role
- [ ] All headings use ### or #### (never # or ##)
</validation_checklist>`,
    variables: ['summary', 'time_minutes', 'language'],
    category: 'generation',
    model: 'gpt-4.1-mini',
    maxTokens: 4000,
    temperature: 0.7,
    responseFormat: 'json_object',
  },

  GENERATE_CODING_CHALLENGE: {
    id: 'generate_coding_challenge',
    name: 'Generate Coding Challenge',
    template: `You are an expert coding challenge designer creating practical programming exercises.

<context>
Job Summary: {{summary}}
Programming Language: {{language_coding}}
Duration: {{time_minutes}} minutes
Output Language: {{language}}
</context>

<output_requirements>
Return ONLY valid JSON with this exact structure:
{
  "test_text": "Markdown string with complete challenge description",
  "test_specs": "What this challenge evaluates",
  "further_specifications": "Key skills and technologies being tested",
  "time_minutes": "number (from input {{time_minutes}})"
}
</output_requirements>

<language_requirements>
- All content MUST be in {{language}}
- Use proper {{language}} grammar and formatting
- Use standard UTF-8 encoding
- Keep sentences clear and professional
</language_requirements>

<markdown_formatting>
- Use ### for all headings (never # or ##)
- Use #### for subsections
- Use **bold** for emphasis
- Use bullet points with - or *
- Never create tables
- Present data as structured lists
- Use code blocks with proper syntax highlighting
</markdown_formatting>

<challenge_requirements>
1. COMPLETENESS:
   - Include all data, specifications, and requirements needed
   - Provide sample inputs, expected outputs, and edge cases
   - Specify exact data structures, formats, and constraints
   - Do not reference external APIs or services unless explicitly allowed
   - Ensure challenge is solvable with only provided information

2. APPROPRIATE COMPLEXITY:
   - Junior: fundamentals, basic algorithms, clean code
   - Mid-level: design patterns, data structures, problem-solving
   - Senior: architectural decisions, optimization, edge cases
   - Match complexity to role requirements and time limit

3. TIME SCOPE:
   - Challenge must be completable in {{time_minutes}} minutes by a competent {{language_coding}} developer
   - Include: reading (2-3 min), design (15-20%), implementation (50-60%), testing (15-20%)
   - Scope based on time:
     * ≤15 minutes: 1 small function
     * ≤30 minutes: 1-2 related functions
     * ≤60 minutes: 2-3 functions or small module
     * >60 minutes: complete small feature with multiple components
</challenge_requirements>

<challenge_structure>
1. **Context**: Real-world scenario for {{language_coding}} development
2. **Requirements**: Exact function signatures, input/output formats, constraints, edge cases
3. **Technical Details**: Sample input data, expected outputs, test cases, performance requirements
4. **Evaluation Criteria**: Functionality, code quality, error handling, efficiency
</challenge_structure>`,
    variables: ['summary', 'language_coding', 'time_minutes', 'language'],
    category: 'generation',
    model: 'gpt-4.1-mini',
    maxTokens: 6000,
    temperature: 0.7,
    responseFormat: 'json_object',
  },

  GENERATE_EXCEL_CHALLENGE: {
    id: 'generate_excel_challenge',
    name: 'Generate Excel Assessment Challenge',
    template: `You are an expert Excel assessment designer creating practical spreadsheet exercises.

<context>
Job Summary: {{summary}}
Duration: {{time_minutes}} minutes
Output Language: {{language}}
</context>

<output_requirements>
Return ONLY valid JSON with this exact structure:
{
  "test": "markdown string with complete challenge description",
  "test_specs": "what this challenge evaluates",
  "further_specifications": "key Excel skills being tested"
}
</output_requirements>

<language_requirements>
- All descriptive content MUST be in {{language}}
- Use proper {{language}} grammar for descriptions
</language_requirements>

<markdown_formatting>
- Use ### for all headings (never # or ##)
- Use #### for subsections
- Use **bold** for emphasis
- Use bullet points with - or *
- Never create tables
- Present data as structured lists with cell references
</markdown_formatting>

<supported_features>
SUPPORTED: basic formulas, cell formatting, multiple sheets
NOT SUPPORTED: pivot tables, charts, macros, VBA, Power Query
Design challenges using only supported features.
</supported_features>

<data_presentation>
Present data with clear cell references ready to copy into spreadsheet.
Format: "Cell A1: value" or "Row 1: value1, value2, value3"
Group data by rows or columns clearly.
</data_presentation>

<challenge_requirements>
1. COMPLETENESS:
   - Include all data needed with exact cell locations
   - Describe WHAT needs to be calculated, not HOW (no formulas in requirements)
   - Specify which cells should contain results

2. APPROPRIATE COMPLEXITY:
   - Junior: basic calculations (sums, averages, simple conditions)
   - Mid-level: conditional logic, lookups, multi-step calculations
   - Senior: complex nested conditions, multiple data relationships, validation
   - Match complexity to role and {{time_minutes}} minutes timeframe

3. TIME SCOPE:
   - Challenge must be completable in {{time_minutes}} minutes
   - Include: reading (2-3 min), data setup (20-25%), formulas (50-60%), verification (10-15%)
   - Scope based on time:
     * ≤15 minutes: 2-3 simple calculations
     * ≤30 minutes: 4-6 moderate calculations
     * ≤60 minutes: 8-12 complex calculations
     * >60 minutes: 15+ calculations across multiple sheets
</challenge_requirements>

<challenge_structure>
1. **Context**: Business scenario requiring Excel analysis
2. **Data Section**: Exact data with cell references
3. **Required Calculations**: Describe WHAT to calculate (e.g., "calculate conversion rate", "find average cost"), specify output cell locations, do NOT provide formulas
4. **Evaluation Criteria**: Formula correctness, data organization, accuracy, appropriate function usage
</challenge_structure>

<critical_rule>
NEVER include actual formulas in the challenge description. Only describe what calculations are needed and where results should appear.
</critical_rule>`,
    variables: ['summary', 'time_minutes', 'language'],
    category: 'generation',
    model: 'gpt-4.1-mini',
    maxTokens: 6000,
    temperature: 0.7,
    responseFormat: 'json_object',
  },
};

// ============================================
// HELPER TYPES
// ============================================

export type RecruitingPromptId = keyof typeof RECRUITING_PROMPTS;

export const RECRUITING_PROMPT_IDS = Object.keys(RECRUITING_PROMPTS) as RecruitingPromptId[];
