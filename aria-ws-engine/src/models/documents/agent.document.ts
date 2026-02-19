import { ObjectId } from 'mongodb';
export const AgentStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;
type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export type VoiceConfig = {
  languageCode: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
};

export type AgentFeatures = {
  lipSync: boolean;
  sessionPersistence: boolean;
  autoSummary: boolean;
  videoRecording: boolean;
};
export type RenderConfig = {
  mode: 'avatar' | 'presentation';
  presentation?: PresentationConfig;
};
export type PresentationConfig = {
  link: string;
  slides?: Record<string, number>;
};

export interface AgentDocument {
  _id: ObjectId;
  label: string;

  ownerId: ObjectId;
  organizationId?: ObjectId;

  voice: VoiceConfig;
  features: AgentFeatures;
  render: RenderConfig;

  /** Ordered list of step keys for execution sequence */
  stepOrder: string[];

  summaryTypeId?: string;
  statisticsTypeId?: string;

  status: AgentStatus;

  createdAt: Date;
  updatedAt: Date;
}
