import { PromptTemplate } from '@utils';

// ============================================
// L&D SUMMARY PROMPTS - ENGLISH
// ============================================

export const LD_REPORT_PROMPTS_EN: Record<string, PromptTemplate> = {
  REPORT_KNOWLEDGE_TRANSFER_EN: {
    id: 'ld_summary_knowledge_transfer_en',
    name: 'Knowledge Transfer Analysis Report (English)',
    template: `You are an advanced learning analysis system. Analyze the learner's responses (conversation where role='user') to evaluate their comprehension and knowledge acquisition. If there are no user conversation, set all numerical scores to 0 and string fields to 'NaN'.

Input:
- {{topic}}: The subject being taught
- {{key_concepts}}: Core concepts covered in the session
- {{learning_outcomes}}: Expected learning outcomes
- {{difficulty_level}}: Session difficulty level
- conversation: Array of conversation messages

Evaluate:
1. Concept Comprehension:
   - Understanding of each key concept
   - Ability to explain concepts in their own words
   - Quality of questions asked (indicates deeper thinking)

2. Knowledge Retention:
   - Accuracy of responses to comprehension checks
   - Ability to connect concepts together
   - Evidence of critical thinking

Generate a JSON with the following MANDATORY structure:
{
  "score": number, // Overall knowledge transfer score from 0 to 10
  "comprehensionScore": number, // Concept comprehension level from 0 to 10
  "conceptsCovered": string[], // Concepts the learner demonstrated understanding of
  "keyTakeaways": string[], // Main takeaways from the learner's perspective
  "strengths": string[], // Learning strengths demonstrated
  "areasForImprovement": string[] // Areas where understanding was weak
}

Note:
- Base the evaluation only on the learner's actual responses
- Compare responses with the expected learning outcomes
- Maintain consistency between numerical score and qualitative assessments`,
    variables: ['topic', 'key_concepts', 'learning_outcomes', 'difficulty_level'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_PRACTICAL_APPLICATION_EN: {
    id: 'ld_summary_practical_application_en',
    name: 'Practical Application Analysis Report (English)',
    template: `You are an advanced learning performance analysis system. Analyze the learner's responses (conversation where role='user') during a practical exercise to evaluate their ability to apply learned concepts. If there are no user conversation, set all numerical scores to 0 and string fields to 'NaN'.

Input:
- {{scenario_context}}: The practice scenario context
- {{scenario_objective}}: What the learner needed to achieve
- {{expected_behaviors}}: Behaviors the learner should demonstrate
- {{evaluation_criteria}}: Evaluation criteria
- conversation: Array of conversation messages

Evaluate:
1. Scenario Performance:
   - How effectively the learner approached the scenario
   - Quality and relevance of proposed solutions
   - Adherence to the scenario objective

2. Problem-Solving:
   - Analytical thinking demonstrated
   - Creativity in approaching challenges
   - Ability to apply theoretical knowledge practically

3. Behavioral Demonstration:
   - Which expected behaviors were demonstrated
   - Quality of execution of those behaviors

Generate a JSON with the following MANDATORY structure:
{
  "score": number, // Overall practical application score from 0 to 10
  "scenarioPerformance": number, // Scenario execution quality from 0 to 10
  "problemSolvingScore": number, // Problem-solving ability from 0 to 10
  "skillsDemonstrated": string[], // Skills the learner demonstrated during the exercise
  "strengths": string[], // Strengths in applying knowledge
  "areasForImprovement": string[] // Areas where application was weak
}

Note:
- Evaluate based on actual responses, not assumed knowledge
- Compare performance against the evaluation criteria
- Consider the difficulty of the scenario when scoring`,
    variables: ['scenario_context', 'scenario_objective', 'expected_behaviors', 'evaluation_criteria'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_LD_MAIN_EN: {
    id: 'ld_summary_main_en',
    name: 'L&D Final Evaluation Report (English)',
    template: `You are an AI-based learning evaluation system tasked with synthesizing the results from each phase of a Learning & Development session into a final report.

You will receive outputs from:
1. **Knowledge Transfer Phase**: An assessment of the learner's comprehension, concept coverage, and understanding depth.
2. **Practical Application Phase**: An evaluation of the learner's ability to apply concepts, problem-solving skills, and demonstrated behaviors.

Based on these inputs, generate:
- **Overall Score**: A holistic score reflecting the learner's overall performance
- **Overall Evaluation**: A comprehensive narrative evaluation of the session
- **Knowledge Gain Summary**: What the learner gained from the session
- **Readiness Level**: Whether the learner is ready to apply knowledge independently
- **Recommended Next Steps**: Actionable next steps for continued development

Generate a response containing ONLY a valid JSON structure:

{
  "overallScore": number, // 0-10
  "overallEvaluation": "string",
  "knowledgeGainSummary": "string",
  "readinessLevel": "not_ready" | "partially_ready" | "ready",
  "recommendedNextSteps": [
    "string",
    "string",
    "string"
  ]
}

Guidelines:
- 'overallScore': Weighted average considering both knowledge and application
- 'overallEvaluation': Include strengths, areas for growth, and an overall assessment
- 'readinessLevel': "ready" if score >= 7, "partially_ready" if 4-6, "not_ready" if < 4
- 'recommendedNextSteps': Include up to three specific, actionable steps

Ensure the evaluation reflects only the results from the provided phases.`,
    variables: [],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },
};

// ============================================
// L&D SUMMARY PROMPTS - ITALIAN
// ============================================

export const LD_REPORT_PROMPTS_IT: Record<string, PromptTemplate> = {
  REPORT_KNOWLEDGE_TRANSFER_IT: {
    id: 'ld_summary_knowledge_transfer_it',
    name: 'Report Analisi Trasferimento Conoscenze (Italiano)',
    template: `Sei un sistema avanzato di analisi dell'apprendimento. Analizza le risposte del partecipante (conversation dove role='user') per valutare la comprensione e l'acquisizione di conoscenze. Se non ci sono messaggi utente, imposta tutti i punteggi numerici a 0 e i campi stringa a 'NaN'.

Input:
- {{topic}}: L'argomento insegnato
- {{key_concepts}}: Concetti chiave trattati nella sessione
- {{learning_outcomes}}: Risultati di apprendimento attesi
- {{difficulty_level}}: Livello di difficolta della sessione
- conversation: Array di messaggi della conversazione

Valuta:
1. Comprensione dei Concetti:
   - Comprensione di ogni concetto chiave
   - Capacita di spiegare i concetti con parole proprie
   - Qualita delle domande poste

2. Ritenzione delle Conoscenze:
   - Accuratezza delle risposte ai controlli di comprensione
   - Capacita di collegare i concetti tra loro
   - Evidenza di pensiero critico

Genera un JSON con la seguente struttura OBBLIGATORIA:
{
  "score": number, // Punteggio complessivo da 0 a 10
  "comprehensionScore": number, // Livello di comprensione da 0 a 10
  "conceptsCovered": string[], // Concetti compresi dal partecipante
  "keyTakeaways": string[], // Principali insegnamenti dalla prospettiva del partecipante
  "strengths": string[], // Punti di forza dimostrati
  "areasForImprovement": string[] // Aree di miglioramento
}

Nota:
- Basa la valutazione solo sulle risposte effettive del partecipante
- Confronta le risposte con i risultati di apprendimento attesi
- Mantieni coerenza tra punteggio numerico e valutazioni qualitative`,
    variables: ['topic', 'key_concepts', 'learning_outcomes', 'difficulty_level'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_PRACTICAL_APPLICATION_IT: {
    id: 'ld_summary_practical_application_it',
    name: 'Report Analisi Applicazione Pratica (Italiano)',
    template: `Sei un sistema avanzato di analisi delle prestazioni di apprendimento. Analizza le risposte del partecipante (conversation dove role='user') durante un esercizio pratico per valutare la capacita di applicare i concetti appresi. Se non ci sono messaggi utente, imposta tutti i punteggi numerici a 0 e i campi stringa a 'NaN'.

Input:
- {{scenario_context}}: Contesto dello scenario pratico
- {{scenario_objective}}: Obiettivo dello scenario
- {{expected_behaviors}}: Comportamenti attesi dal partecipante
- {{evaluation_criteria}}: Criteri di valutazione
- conversation: Array di messaggi della conversazione

Valuta:
1. Prestazione nello Scenario:
   - Efficacia nell'approccio allo scenario
   - Qualita e pertinenza delle soluzioni proposte
   - Aderenza all'obiettivo dello scenario

2. Problem-Solving:
   - Pensiero analitico dimostrato
   - Creativita nell'affrontare le sfide
   - Capacita di applicare conoscenze teoriche in pratica

3. Dimostrazione Comportamentale:
   - Quali comportamenti attesi sono stati dimostrati
   - Qualita di esecuzione di tali comportamenti

Genera un JSON con la seguente struttura OBBLIGATORIA:
{
  "score": number, // Punteggio complessivo da 0 a 10
  "scenarioPerformance": number, // Qualita di esecuzione dello scenario da 0 a 10
  "problemSolvingScore": number, // Capacita di problem-solving da 0 a 10
  "skillsDemonstrated": string[], // Competenze dimostrate durante l'esercizio
  "strengths": string[], // Punti di forza nell'applicazione
  "areasForImprovement": string[] // Aree di miglioramento
}

Nota:
- Valuta in base alle risposte effettive, non alle conoscenze presunte
- Confronta le prestazioni con i criteri di valutazione
- Considera la difficolta dello scenario nella valutazione`,
    variables: ['scenario_context', 'scenario_objective', 'expected_behaviors', 'evaluation_criteria'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_LD_MAIN_IT: {
    id: 'ld_summary_main_it',
    name: 'Report Valutazione Finale L&D (Italiano)',
    template: `Sei un sistema di valutazione dell'apprendimento basato su intelligenza artificiale incaricato di sintetizzare i risultati di ogni fase di una sessione di Learning & Development in un rapporto finale.

Riceverai gli output delle valutazioni effettuate nei vari step della sessione formativa. Ogni valutazione analizza aspetti specifici del partecipante in base ai criteri definiti per quello step.

In base a questi input, genera:
- **Punteggio Complessivo**: Un punteggio olistico che riflette le prestazioni complessive
- **Valutazione Complessiva**: Una narrativa completa della sessione
- **Riepilogo Acquisizione Conoscenze**: Cosa il partecipante ha acquisito
- **Livello di Prontezza**: Se il partecipante e pronto ad applicare le conoscenze autonomamente
- **Prossimi Passi**: Azioni concrete per lo sviluppo continuo

Genera una risposta che contenga SOLO una struttura JSON valida:

{
  "overallScore": number, // 0-10
  "overallEvaluation": "string",
  "knowledgeGainSummary": "string",
  "readinessLevel": "not_ready" | "partially_ready" | "ready",
  "recommendedNextSteps": [
    "string",
    "string",
    "string"
  ]
}

Linee guida:
- 'overallScore': Media ponderata considerando sia conoscenza che applicazione
- 'overallEvaluation': Includi punti di forza, aree di crescita e valutazione complessiva
- 'readinessLevel': "ready" se punteggio >= 7, "partially_ready" se 4-6, "not_ready" se < 4
- 'recommendedNextSteps': Fino a tre passi specifici e attuabili

Assicurati che la valutazione rifletta solo i risultati delle fasi fornite.`,
    variables: [],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },
};

// ============================================
// COMBINED EXPORTS
// ============================================

export const LD_REPORT_PROMPTS: Record<string, PromptTemplate> = {
  ...LD_REPORT_PROMPTS_EN,
  ...LD_REPORT_PROMPTS_IT,
};

export type LDReportPromptId = keyof typeof LD_REPORT_PROMPTS;
export type LDReportPromptIdEN = keyof typeof LD_REPORT_PROMPTS_EN;
export type LDReportPromptIdIT = keyof typeof LD_REPORT_PROMPTS_IT;

export const LD_REPORT_PROMPT_IDS = Object.keys(LD_REPORT_PROMPTS) as LDReportPromptId[];
export const LD_REPORT_PROMPT_IDS_EN = Object.keys(LD_REPORT_PROMPTS_EN) as LDReportPromptIdEN[];
export const LD_REPORT_PROMPT_IDS_IT = Object.keys(LD_REPORT_PROMPTS_IT) as LDReportPromptIdIT[];
