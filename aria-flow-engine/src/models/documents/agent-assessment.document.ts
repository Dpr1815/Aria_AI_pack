import { ObjectId } from 'mongodb';

export interface AgentAssessmentDocument {
  _id: ObjectId;
  agentId: ObjectId;

  /** Assessment test content (markdown/JSON) */
  testContent: string;

  /** Programming language or test language */
  language: string;

  /** Time limit in seconds */
  durationSeconds: number;

  createdAt: Date;
  updatedAt: Date;
}
