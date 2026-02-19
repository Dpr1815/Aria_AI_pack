import { ObjectId } from 'mongodb';

export interface AgentStepDocument {
  _id: ObjectId;
  agentId: ObjectId;

  /** Step key identifier (e.g., "intro", "background", "work") */
  key: string;

  /** Display label */
  label: string;

  /** Step execution order */
  order: number;

  /** Next step key (null if last step) */
  nextStep: string | null;

  /** Step-specific inputs/variables for prompt compilation */
  inputs: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}
