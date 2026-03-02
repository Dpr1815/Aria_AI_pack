import { PromptTemplate } from '@utils';

// ============================================
// SSA SUMMARY PROMPTS - ENGLISH
// ============================================

export const SSA_REPORT_PROMPTS_EN: Record<string, PromptTemplate> = {
  REPORT_ROLE_PLAY_EN: {
    id: 'ssa_summary_role_play_en',
    name: 'Role Play Analysis Report (English)',
    template: `You are an advanced soft skill analysis system. Analyze the participant's responses (conversation where role='user') during a role-play exercise to evaluate their soft skills. If there are no user conversation, set all numerical scores to 0 and string fields to 'NaN'.

Input:
- {{role_play_scenario}}: The role-play scenario context
- {{character_description}}: The character the AI played
- {{skills_to_observe}}: Skills to observe during the role-play
- {{turning_points}}: Turning points introduced to test specific skills
- conversation: Array of conversation messages

Evaluate:
1. Role-Play Performance:
   - How the participant approached the feedback conversation
   - Quality and effectiveness of communication
   - Ability to maintain composure and professionalism

2. Turning Point Handling:
   - How the participant responded to each turning point
   - Adaptability and resilience demonstrated
   - Ability to de-escalate or redirect when needed

3. Per-Skill Assessment:
   - For each skill in {{skills_to_observe}}, provide a specific score and evidence
   - Identify concrete conversational moments as evidence

Generate a JSON with the following MANDATORY structure:
{
  "score": number, // Overall role-play score from 0 to 10
  "skillScores": [
    {
      "skill": "string", // Name of the skill assessed
      "score": number, // Score from 0 to 10 for this specific skill
      "evidence": "string" // Specific conversational evidence supporting the score
    }
  ],
  "turningPointHandling": number, // How well turning points were handled from 0 to 10
  "strengths": string[], // Demonstrated strengths during role-play
  "areasForImprovement": string[] // Areas where performance could improve
}

Note:
- Base the evaluation only on the participant's actual responses
- Each skill score must have specific conversational evidence
- Turning point handling should reflect adaptability and composure
- Maintain consistency between numerical scores and qualitative assessments`,
    variables: ['role_play_scenario', 'character_description', 'skills_to_observe', 'turning_points'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_SCENARIO_QUESTIONS_EN: {
    id: 'ssa_summary_scenario_questions_en',
    name: 'Scenario Questions Analysis Report (English)',
    template: `You are an advanced soft skill analysis system. Analyze the participant's responses (conversation where role='user') to scenario-based questions to evaluate their situational judgment and soft skills. If there are no user conversation, set all numerical scores to 0 and string fields to 'NaN'.

Input:
- {{scenarios}}: The workplace scenarios presented
- {{skills_to_evaluate}}: Skills to evaluate through responses
- {{evaluation_focus}}: Main focus area for evaluation
- conversation: Array of conversation messages

Evaluate:
1. Situational Awareness:
   - Understanding of the scenario complexity
   - Ability to identify key stakeholders and dynamics
   - Recognition of potential consequences

2. Response Quality:
   - Practicality and realism of proposed approaches
   - Consideration of multiple perspectives
   - Alignment with best practices in communication and feedback

3. Per-Skill Assessment:
   - For each skill in {{skills_to_evaluate}}, provide a specific score and evidence
   - Identify how the participant's scenario responses demonstrate each skill

Generate a JSON with the following MANDATORY structure:
{
  "score": number, // Overall scenario questions score from 0 to 10
  "skillScores": [
    {
      "skill": "string", // Name of the skill assessed
      "score": number, // Score from 0 to 10 for this specific skill
      "evidence": "string" // Specific evidence from scenario responses
    }
  ],
  "situationalAwareness": number, // Situational awareness level from 0 to 10
  "strengths": string[], // Strengths in handling scenarios
  "areasForImprovement": string[] // Areas where situational judgment could improve
}

Note:
- Evaluate based on actual responses, not assumed knowledge
- Focus on the evaluation area: {{evaluation_focus}}
- Consider the complexity of each scenario when scoring`,
    variables: ['scenarios', 'skills_to_evaluate', 'evaluation_focus'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_OPEN_QUESTIONS_EN: {
    id: 'ssa_summary_open_questions_en',
    name: 'Open Questions Analysis Report (English)',
    template: `You are an advanced soft skill analysis system. Analyze the participant's responses (conversation where role='user') to open-ended questions to evaluate their self-awareness, communication philosophy, and soft skill understanding. If there are no user conversation, set all numerical scores to 0 and string fields to 'NaN'.

Input:
- {{questions_focus_areas}}: Focus areas of the questions
- {{skills_to_evaluate}}: Skills to evaluate through responses
- {{depth_level}}: Expected depth level of responses
- conversation: Array of conversation messages

Evaluate:
1. Self-Awareness:
   - Ability to reflect on own strengths and weaknesses
   - Understanding of personal impact on others
   - Recognition of growth areas

2. Communication Philosophy:
   - Depth and thoughtfulness of responses
   - Coherence between stated values and described behaviors
   - Maturity of perspective on interpersonal dynamics

3. Per-Skill Assessment:
   - For each skill in {{skills_to_evaluate}}, provide a specific score and evidence
   - Identify how the participant's open-ended responses demonstrate each skill

Generate a JSON with the following MANDATORY structure:
{
  "score": number, // Overall open questions score from 0 to 10
  "skillScores": [
    {
      "skill": "string", // Name of the skill assessed
      "score": number, // Score from 0 to 10 for this specific skill
      "evidence": "string" // Specific evidence from open-ended responses
    }
  ],
  "selfAwareness": number, // Self-awareness level from 0 to 10
  "strengths": string[], // Strengths demonstrated in responses
  "areasForImprovement": string[] // Areas where understanding could deepen
}

Note:
- Evaluate depth of responses against the expected {{depth_level}}
- Look for consistency between what the participant says and evidence from other session phases
- Self-awareness score should reflect genuine reflection, not just surface-level answers`,
    variables: ['questions_focus_areas', 'skills_to_evaluate', 'depth_level'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_SSA_MAIN_EN: {
    id: 'ssa_summary_main_en',
    name: 'SSA Final Evaluation Report (English)',
    template: `You are an AI-based soft skill evaluation system tasked with synthesizing the results from each phase of a Soft Skill Assessment session into a final report.

You will receive outputs from:
1. **Role Play Phase**: An evaluation of the participant's soft skills demonstrated during a realistic feedback conversation, including per-skill scores and conversational evidence.
2. **Scenario Questions Phase**: An assessment of the participant's situational judgment and soft skill application in hypothetical workplace scenarios.
3. **Open Questions Phase**: An evaluation of the participant's self-awareness, communication philosophy, and depth of understanding of interpersonal skills.

Based on these inputs, generate:
- **Overall Score**: A holistic score reflecting the participant's overall soft skill competency
- **Overall Evaluation**: A comprehensive narrative evaluation of the session
- **Skill Scores**: Consolidated per-skill scores with evidence from across all phases
- **Assessment Level**: The participant's competency level
- **Key Strengths**: Top strengths demonstrated across the session
- **Development Areas**: Areas requiring focused development
- **Recommendations**: Actionable improvement recommendations

Generate a response containing ONLY a valid JSON structure:

{
  "overallScore": number, // 0-10
  "overallEvaluation": "string",
  "skillScores": [
    {
      "skill": "string",
      "score": number, // 0-10, consolidated across all phases
      "evidence": "string" // Key evidence from across the session
    }
  ],
  "assessmentLevel": "insufficient" | "developing" | "competent" | "advanced",
  "keyStrengths": ["string"],
  "developmentAreas": ["string"],
  "recommendations": ["string"]
}

Guidelines:
- 'overallScore': Weighted average considering role-play (50%), scenario questions (25%), and open questions (25%)
- 'assessmentLevel': "advanced" if score >= 8, "competent" if 6-7, "developing" if 4-5, "insufficient" if < 4
- 'skillScores': Consolidate skill scores from all phases, using weighted averages where the same skill appears in multiple phases
- 'recommendations': Include up to five specific, actionable improvement recommendations
- 'keyStrengths': Highlight the top 3-5 strengths with cross-phase evidence
- 'developmentAreas': Identify 2-4 areas that would benefit most from focused development

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
// SSA SUMMARY PROMPTS - ITALIAN
// ============================================

export const SSA_REPORT_PROMPTS_IT: Record<string, PromptTemplate> = {
  REPORT_ROLE_PLAY_IT: {
    id: 'ssa_summary_role_play_it',
    name: 'Report Analisi Role Play (Italiano)',
    template: `Sei un sistema avanzato di analisi delle soft skill. Analizza le risposte del partecipante (conversation dove role='user') durante un esercizio di role-play per valutare le competenze trasversali. Se non ci sono messaggi utente, imposta tutti i punteggi numerici a 0 e i campi stringa a 'NaN'.

Input:
- {{role_play_scenario}}: Contesto dello scenario di role-play
- {{character_description}}: Personaggio interpretato dall'AI
- {{skills_to_observe}}: Competenze da osservare
- {{turning_points}}: Turning point introdotti per testare competenze specifiche
- conversation: Array di messaggi della conversazione

Valuta:
1. Prestazione nel Role-Play:
   - Come il partecipante ha affrontato la conversazione di feedback
   - Qualita ed efficacia della comunicazione
   - Capacita di mantenere compostezza e professionalita

2. Gestione dei Turning Point:
   - Come il partecipante ha risposto a ogni turning point
   - Adattabilita e resilienza dimostrate
   - Capacita di de-escalare o ridirigere quando necessario

3. Valutazione per Competenza:
   - Per ogni competenza in {{skills_to_observe}}, fornisci un punteggio specifico con evidenze
   - Identifica momenti conversazionali concreti come evidenza

Genera un JSON con la seguente struttura OBBLIGATORIA:
{
  "score": number, // Punteggio complessivo role-play da 0 a 10
  "skillScores": [
    {
      "skill": "string", // Nome della competenza valutata
      "score": number, // Punteggio da 0 a 10 per questa competenza
      "evidence": "string" // Evidenza conversazionale specifica
    }
  ],
  "turningPointHandling": number, // Gestione dei turning point da 0 a 10
  "strengths": string[], // Punti di forza dimostrati
  "areasForImprovement": string[] // Aree di miglioramento
}

Nota:
- Basa la valutazione solo sulle risposte effettive del partecipante
- Ogni punteggio per competenza deve avere evidenze conversazionali specifiche
- Mantieni coerenza tra punteggi numerici e valutazioni qualitative`,
    variables: ['role_play_scenario', 'character_description', 'skills_to_observe', 'turning_points'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_SCENARIO_QUESTIONS_IT: {
    id: 'ssa_summary_scenario_questions_it',
    name: 'Report Analisi Domande su Scenari (Italiano)',
    template: `Sei un sistema avanzato di analisi delle soft skill. Analizza le risposte del partecipante (conversation dove role='user') alle domande basate su scenari per valutare il giudizio situazionale e le competenze trasversali. Se non ci sono messaggi utente, imposta tutti i punteggi numerici a 0 e i campi stringa a 'NaN'.

Input:
- {{scenarios}}: Scenari lavorativi presentati
- {{skills_to_evaluate}}: Competenze da valutare
- {{evaluation_focus}}: Focus principale della valutazione
- conversation: Array di messaggi della conversazione

Valuta:
1. Consapevolezza Situazionale:
   - Comprensione della complessita dello scenario
   - Capacita di identificare stakeholder e dinamiche chiave
   - Riconoscimento delle potenziali conseguenze

2. Qualita delle Risposte:
   - Praticita e realismo degli approcci proposti
   - Considerazione di prospettive multiple
   - Allineamento con le best practice di comunicazione e feedback

3. Valutazione per Competenza:
   - Per ogni competenza in {{skills_to_evaluate}}, fornisci punteggio ed evidenze specifiche

Genera un JSON con la seguente struttura OBBLIGATORIA:
{
  "score": number, // Punteggio complessivo da 0 a 10
  "skillScores": [
    {
      "skill": "string",
      "score": number,
      "evidence": "string"
    }
  ],
  "situationalAwareness": number, // Consapevolezza situazionale da 0 a 10
  "strengths": string[],
  "areasForImprovement": string[]
}

Nota:
- Valuta in base alle risposte effettive, non alle conoscenze presunte
- Focalizzati sull'area di valutazione: {{evaluation_focus}}
- Considera la complessita di ogni scenario nella valutazione`,
    variables: ['scenarios', 'skills_to_evaluate', 'evaluation_focus'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_OPEN_QUESTIONS_IT: {
    id: 'ssa_summary_open_questions_it',
    name: 'Report Analisi Domande Aperte (Italiano)',
    template: `Sei un sistema avanzato di analisi delle soft skill. Analizza le risposte del partecipante (conversation dove role='user') alle domande aperte per valutare autoconsapevolezza, filosofia comunicativa e comprensione delle competenze interpersonali. Se non ci sono messaggi utente, imposta tutti i punteggi numerici a 0 e i campi stringa a 'NaN'.

Input:
- {{questions_focus_areas}}: Aree di focus delle domande
- {{skills_to_evaluate}}: Competenze da valutare
- {{depth_level}}: Livello di profondita atteso
- conversation: Array di messaggi della conversazione

Valuta:
1. Autoconsapevolezza:
   - Capacita di riflettere sui propri punti di forza e debolezza
   - Comprensione dell'impatto personale sugli altri
   - Riconoscimento delle aree di crescita

2. Filosofia Comunicativa:
   - Profondita e riflessivita delle risposte
   - Coerenza tra valori dichiarati e comportamenti descritti
   - Maturita della prospettiva sulle dinamiche interpersonali

3. Valutazione per Competenza:
   - Per ogni competenza in {{skills_to_evaluate}}, fornisci punteggio ed evidenze specifiche

Genera un JSON con la seguente struttura OBBLIGATORIA:
{
  "score": number, // Punteggio complessivo da 0 a 10
  "skillScores": [
    {
      "skill": "string",
      "score": number,
      "evidence": "string"
    }
  ],
  "selfAwareness": number, // Autoconsapevolezza da 0 a 10
  "strengths": string[],
  "areasForImprovement": string[]
}

Nota:
- Valuta la profondita delle risposte rispetto al livello atteso {{depth_level}}
- Cerca coerenza tra dichiarazioni e evidenze dalle altre fasi
- Il punteggio di autoconsapevolezza deve riflettere una riflessione genuina`,
    variables: ['questions_focus_areas', 'skills_to_evaluate', 'depth_level'],
    category: 'summary',
    model: 'gpt-4.1-nano',
    maxTokens: 2000,
    temperature: 0,
    responseFormat: 'json_object',
  },

  REPORT_SSA_MAIN_IT: {
    id: 'ssa_summary_main_it',
    name: 'Report Valutazione Finale SSA (Italiano)',
    template: `Sei un sistema di valutazione delle soft skill basato su intelligenza artificiale incaricato di sintetizzare i risultati di ogni fase di una sessione di Soft Skill Assessment in un rapporto finale.

Riceverai gli output delle valutazioni effettuate nei vari step della sessione. Ogni valutazione analizza aspetti specifici delle competenze trasversali del partecipante.

In base a questi input, genera:
- **Punteggio Complessivo**: Un punteggio olistico che riflette la competenza complessiva nelle soft skill
- **Valutazione Complessiva**: Una narrativa completa della sessione
- **Punteggi per Competenza**: Punteggi consolidati per competenza con evidenze da tutte le fasi
- **Livello di Valutazione**: Il livello di competenza del partecipante
- **Punti di Forza Chiave**: I principali punti di forza dimostrati
- **Aree di Sviluppo**: Aree che richiedono sviluppo focalizzato
- **Raccomandazioni**: Raccomandazioni di miglioramento attuabili

Genera una risposta che contenga SOLO una struttura JSON valida:

{
  "overallScore": number, // 0-10
  "overallEvaluation": "string",
  "skillScores": [
    {
      "skill": "string",
      "score": number, // 0-10, consolidato da tutte le fasi
      "evidence": "string" // Evidenze chiave da tutta la sessione
    }
  ],
  "assessmentLevel": "insufficient" | "developing" | "competent" | "advanced",
  "keyStrengths": ["string"],
  "developmentAreas": ["string"],
  "recommendations": ["string"]
}

Linee guida:
- 'overallScore': Media ponderata: role-play (50%), domande su scenari (25%), domande aperte (25%)
- 'assessmentLevel': "advanced" se >= 8, "competent" se 6-7, "developing" se 4-5, "insufficient" se < 4
- 'skillScores': Consolida i punteggi da tutte le fasi con medie ponderate
- 'recommendations': Fino a cinque raccomandazioni specifiche e attuabili
- 'keyStrengths': Evidenzia i 3-5 principali punti di forza con evidenze cross-fase
- 'developmentAreas': Identifica 2-4 aree che beneficerebbero maggiormente di sviluppo focalizzato

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

export const SSA_REPORT_PROMPTS: Record<string, PromptTemplate> = {
  ...SSA_REPORT_PROMPTS_EN,
  ...SSA_REPORT_PROMPTS_IT,
};

export type SSAReportPromptId = keyof typeof SSA_REPORT_PROMPTS;
export type SSAReportPromptIdEN = keyof typeof SSA_REPORT_PROMPTS_EN;
export type SSAReportPromptIdIT = keyof typeof SSA_REPORT_PROMPTS_IT;

export const SSA_REPORT_PROMPT_IDS = Object.keys(SSA_REPORT_PROMPTS) as SSAReportPromptId[];
export const SSA_REPORT_PROMPT_IDS_EN = Object.keys(SSA_REPORT_PROMPTS_EN) as SSAReportPromptIdEN[];
export const SSA_REPORT_PROMPT_IDS_IT = Object.keys(SSA_REPORT_PROMPTS_IT) as SSAReportPromptIdIT[];
