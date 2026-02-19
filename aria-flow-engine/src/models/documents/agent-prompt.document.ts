import { ObjectId } from 'mongodb';

import { ReasoningEffort } from '@connectors/llm/model-capabilities';
export interface AgentPromptDocument {
  _id: ObjectId;
  agentId: ObjectId;
  key: string;
  system: string;
  model: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort?: ReasoningEffort;
  createdAt: Date;
  updatedAt: Date;
}
