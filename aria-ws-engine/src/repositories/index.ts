import { IDatabase } from '@connectors';

import { AgentRepository } from './agent.repository';
import { AgentStepRepository } from './agent-step.repository';
import { AgentPromptRepository } from './agent-prompt.repository';
import { AgentAssessmentRepository } from './agent-assessment.repository';
import { SessionRepository } from './session.repository';
import { ParticipantRepository } from './participant.repository';
import { ConversationRepository } from './conversation.repository';

export interface Repositories {
  agent: AgentRepository;
  agentStep: AgentStepRepository;
  agentPrompt: AgentPromptRepository;
  agentAssessment: AgentAssessmentRepository;
  session: SessionRepository;
  participant: ParticipantRepository;
  conversation: ConversationRepository;
}

export function createRepositories(db: IDatabase): Repositories {
  return {
    agent: new AgentRepository(db),
    agentStep: new AgentStepRepository(db),
    agentPrompt: new AgentPromptRepository(db),
    agentAssessment: new AgentAssessmentRepository(db),
    session: new SessionRepository(db),
    participant: new ParticipantRepository(db),
    conversation: new ConversationRepository(db),
  };
}

export * from './base.repository';
export * from './agent.repository';
export * from './agent-step.repository';
export * from './agent-prompt.repository';
export * from './agent-assessment.repository';
export * from './participant.repository';
export * from './session.repository';
export * from './conversation.repository';
