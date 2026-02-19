import { ObjectId } from 'mongodb';
import { AgentStatus } from '../../constants';
// agent.document.ts
import type { VoiceConfig, AgentFeatures, RenderConfig } from '@validations';

export interface AgentDocument {
  _id: ObjectId;
  label: string;

  ownerId: ObjectId;
  organizationId?: ObjectId;

  voice: VoiceConfig;
  features: AgentFeatures;
  render: RenderConfig;

  /** Step category ID (e.g. 'interview') — links to STEP_REGISTRY_BY_CATEGORY */
  conversationTypeId?: string;

  /** Ordered list of step keys for execution sequence */
  stepOrder: string[];

  summaryTypeId?: string;
  statisticsTypeId?: string;

  status: AgentStatus;

  createdAt: Date;
  updatedAt: Date;
}
