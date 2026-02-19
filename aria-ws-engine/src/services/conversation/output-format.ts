/**
 * Output Format Injection
 *
 * Appended to every system prompt to enforce structured JSON output from the LLM.
 *
 * IMPORTANT: This block must NOT list specific action values.
 * Each step's system prompt already defines which actions are valid and when to use them.
 * action names across steps (e.g. START_LINGUISTIC vs STOP_LINGUISTIC).
 */

export const OUTPUT_FORMAT_INJECTION = `
<output_format>
Respond with ONLY valid JSON. No markdown, no code blocks, no extra text.

{ "text": "your message", "action": "" }

- "text": your conversational message to the candidate.
- "action": leave empty ("") unless the instructions above specify an action for this turn. Use EXACTLY the action string written in the instructions.
</output_format>`;
