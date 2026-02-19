import { IDatabase } from '@connectors';
import { UserRepository } from './user.repository';
import { OrganizationRepository } from './organization.repository';
import { AgentRepository } from './agent.repository';
import { AgentStepRepository } from './agent-step.repository';
import { AgentPromptRepository } from './agent-prompt.repository';
import { AgentAssessmentRepository } from './agent-assessment.repository';
import { SessionRepository } from './session.repository';
import { ParticipantRepository } from './participant.repository';
import { ConversationRepository } from './conversation.repository';
import { SummaryRepository } from './summary.repository';
import { AgentStatisticsRepository } from './agent-statistics.repository';

export interface Repositories {
  user: UserRepository;
  organization: OrganizationRepository;
  agent: AgentRepository;
  agentStep: AgentStepRepository;
  agentPrompt: AgentPromptRepository;
  agentAssessment: AgentAssessmentRepository;
  session: SessionRepository;
  participant: ParticipantRepository;
  conversation: ConversationRepository;
  summary: SummaryRepository;
  agentStatistics: AgentStatisticsRepository;
}

export function createRepositories(db: IDatabase): Repositories {
  return {
    user: new UserRepository(db),
    organization: new OrganizationRepository(db),
    agent: new AgentRepository(db),
    agentStep: new AgentStepRepository(db),
    agentPrompt: new AgentPromptRepository(db),
    agentAssessment: new AgentAssessmentRepository(db),
    session: new SessionRepository(db),
    participant: new ParticipantRepository(db),
    conversation: new ConversationRepository(db),
    summary: new SummaryRepository(db),
    agentStatistics: new AgentStatisticsRepository(db),
  };
}

export * from './base.repository';
export * from './user.repository';
export * from './organization.repository';
export * from './agent.repository';
export * from './agent-step.repository';
export * from './agent-prompt.repository';
export * from './agent-assessment.repository';
export * from './participant.repository';
export * from './session.repository';
export * from './conversation.repository';
export * from './summary.repository';
export * from './agent-statistics.repository';
