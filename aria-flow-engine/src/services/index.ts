import { AppConfig } from '@config';
import { Connectors } from '@connectors';
import { Repositories } from '@repositories';
import { UserService } from './user.service';
import { OrganizationService } from './organization.service';
import { AgentService } from './agent.service';
import { SessionService } from './session.service';
import { ParticipantService } from './participant.service';
import { ConversationService } from './conversation.service';
import { SummaryService } from './summary.service';
import { StatisticsService } from './statistics.service';
import { OpenAIService } from './ai/openai.service';
import { PromptBuilderService } from './ai/prompt-builder.service';
import { AgentGeneratorService } from './generation/agent-generator.service';
import { VideoService } from './video.service';
export interface Services {
  user: UserService;
  organization: OrganizationService;
  agent: AgentService;
  session: SessionService;
  participant: ParticipantService;
  conversation: ConversationService;
  summary: SummaryService;
  statistics: StatisticsService;
  agentGenerator: AgentGeneratorService;
  video: VideoService;
}

export function createServices(
  config: AppConfig,
  connectors: Connectors,
  repositories: Repositories
): Services {
  const openaiService = new OpenAIService(connectors.llm);
  const promptBuilder = new PromptBuilderService();

  // ============================================
  // Core Services (no cross-service dependencies)
  // ============================================

  const userService = new UserService(repositories.user, {
    jwtSecret: config.server.accessTokenSecret,
    jwtRefreshSecret: config.server.refreshTokenSecret,
  });

  const organizationService = new OrganizationService(repositories.organization, repositories.user);

  const agentService = new AgentService(
    repositories.agent,
    repositories.agentStep,
    repositories.agentPrompt,
    repositories.agentAssessment,
    promptBuilder
  );

  // ============================================
  // Session Management Services (ordered by dependencies)
  // ============================================

  // ConversationService - only needs repository
  const conversationService = new ConversationService(repositories.conversation);

  // ParticipantService - needs repositories only
  const participantService = new ParticipantService(
    repositories.participant,
    repositories.session,
    repositories.conversation
  );

  // SessionService - needs other services
  const sessionService = new SessionService(
    repositories.session,
    participantService,
    conversationService,
    agentService,
    {
      jwtSecret: config.server.sessionTokenSecret,
    }
  );
  // Video Services -
  const videoService = new VideoService(connectors.storage, repositories.session, {
    signedUrlExpirySeconds: config.storage.signedUrlExpirySeconds,
    maxFileSizeBytes: config.storage.maxFileSizeBytes,
  });

  // ============================================
  // Analytics Services
  // ============================================

  const summaryService = new SummaryService(
    repositories.summary,
    repositories.session,
    repositories.agent,
    repositories.agentStep,
    repositories.agentAssessment,
    conversationService,
    openaiService,
    promptBuilder
  );

  const statisticsService = new StatisticsService(
    repositories.agentStatistics,
    repositories.summary,
    repositories.session,
    repositories.agent
  );

  // ============================================
  // Generation Services
  // ============================================

  const agentGeneratorService = new AgentGeneratorService(
    repositories.agent,
    repositories.agentStep,
    repositories.agentPrompt,
    repositories.agentAssessment,
    openaiService,
    promptBuilder
  );

  return {
    user: userService,
    organization: organizationService,
    agent: agentService,
    session: sessionService,
    participant: participantService,
    conversation: conversationService,
    summary: summaryService,
    statistics: statisticsService,
    agentGenerator: agentGeneratorService,
    video: videoService,
  };
}

export * from './user.service';
export * from './organization.service';
export * from './agent.service';
export * from './participant.service';
export * from './session.service';
export * from './conversation.service';
export * from './summary.service';
export * from './statistics.service';
export * from './ai';
export * from './generation';
