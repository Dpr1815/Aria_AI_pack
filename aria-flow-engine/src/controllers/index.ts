import { Services } from '@services';
import { Connectors } from '@connectors';

import { UserController } from './user.controller';
import { OrganizationController } from './organization.controller';
import { AgentController } from './agent.controller';
import { SessionController } from './session.controller';
import { ParticipantController } from './participant.controller';
import { ConversationController } from './conversation.controller';
import { SummaryController } from './summary.controller';
import { StatisticsController } from './statistics.controller';
import { CategoryController } from './category.controller';

export interface Controllers {
  user: UserController;
  organization: OrganizationController;
  agent: AgentController;
  session: SessionController;
  participant: ParticipantController;
  conversation: ConversationController;
  summary: SummaryController;
  statistics: StatisticsController;
  stepCategory: CategoryController;
}

export function createControllers(services: Services, connectors: Connectors): Controllers {
  return {
    user: new UserController(services.user),
    organization: new OrganizationController(services.organization),
    agent: new AgentController(
      services.agent,
      services.agentGenerator,
      services.session,
      services.participant,
      services.conversation
    ),
    session: new SessionController(services.session, services.video),
    participant: new ParticipantController(services.participant),
    conversation: new ConversationController(services.conversation),
    summary: new SummaryController(services.summary),
    statistics: new StatisticsController(services.statistics),
    stepCategory: new CategoryController(connectors.tts),
  };
}

export * from './user.controller';
export * from './organization.controller';
export * from './agent.controller';
export * from './session.controller';
export * from './participant.controller';
export * from './conversation.controller';
export * from './summary.controller';
export * from './statistics.controller';
