/**
 * Application Bootstrap
 *
 * Composition root — the single place where all dependencies
 * are created and connected together.
 */

import { createServer, type Server as HttpServer } from 'http';
import type { WebSocketServer } from 'ws';

import {
  appConfig,
  validateConfig,
  logConfigSummary,
  serverConfig,
  tokenManagerConfig,
  sttConfig,
  ttsConfig,
  cacheConfig,
} from '@config';

import { createConnectors, type Connectors } from '@connectors';

import {
  AgentRepository,
  AgentPromptRepository,
  AgentAssessmentRepository,
  AgentStepRepository,
  SessionRepository,
  ConversationRepository,
  ParticipantRepository,
} from '@repositories';
import type { IDatabase } from '@connectors';

import { AuthService } from './services/auth/AuthService';
import { ConversationService } from './services/conversation/ConversationService';
import { ActionHandler } from './services/conversation/ActionHandler';
import {
  TranscriptionService,
  createTranscriptionService,
} from './services/speech/TranscriptionService';
import { SynthesisService, createSynthesisService } from './services/speech/SynthesisService';

import { createWebSocketController, type WebSocketController } from '@controllers';
import { WebSocketRateLimiter } from './middleware/WebSocketRateLimiter';

import { setupWebSocketRoute, createHealthHandler, createReadyHandler, createHttpRouter } from '@routes';

import type { HandlerServices, HandlerRepositories } from '@types';
import { createLogger } from '@utils';

// ============================================================================
// Types
// ============================================================================

export interface Repositories {
  agent: AgentRepository;
  prompt: AgentPromptRepository;
  assessment: AgentAssessmentRepository;
  step: AgentStepRepository;
  session: SessionRepository;
  conversation: ConversationRepository;
  participant: ParticipantRepository;
}

export interface AppServices {
  auth: AuthService;
  conversation: ConversationService;
  transcription: TranscriptionService;
  synthesis: SynthesisService;
}

export interface AppCore {
  connectors: Connectors;
  repositories: Repositories;
  services: AppServices;
  controller: WebSocketController;
}

export interface ServerInstance {
  httpServer: HttpServer;
  wss: WebSocketServer;
  port: number;
  host: string;
}

export interface AppInstance {
  core: AppCore;
  server: ServerInstance;
  shutdown: () => Promise<void>;
}

export interface BootstrapOptions {
  skipValidation?: boolean;
}

const log = createLogger('Bootstrap');

// ============================================================================
// Bootstrap
// ============================================================================

export async function createApp(options: BootstrapOptions = {}): Promise<AppCore> {
  log.info('Creating Aria Realtime Engine...');

  if (!options.skipValidation) {
    log.info('Validating configuration...');
    validateConfig();
    logConfigSummary();
  }

  log.info('Creating connectors...');
  const connectors = createConnectors({
    database: appConfig.database,
    google: tokenManagerConfig,
    stt: sttConfig,
    tts: ttsConfig,
    llm: appConfig.openai,
    lipSync: {
      enabled: appConfig.lipSync.enabled,
      config: appConfig.lipSync.config,
    },
    api: {
      baseUrl: serverConfig.api.baseUrl,
      serviceToken: serverConfig.api.serviceToken,
    },
    cache: cacheConfig,
  });
  log.info('All connectors created');

  log.info('Connecting to database...');
  await connectors.database.connect();
  log.info('Database connected');

  log.info('Connecting to cache...');
  try {
    await connectors.cache.connect();
    log.info('Cache connected');
  } catch (error) {
    log.warn('Cache connection failed, using in-memory fallback', { error });
  }

  log.info('Initializing Google authentication...');
  await connectors.tokenManager.initialize();
  log.info('Token manager ready');

  log.info('Creating repositories...');
  const repositories = createRepositories(connectors.database);
  log.info('Repositories ready');

  log.info('Creating services...');
  const services = createServices(connectors, repositories);
  log.info('All services ready');

  log.info('Creating WebSocket controller...');
  const controller = createController(services, repositories, connectors);
  log.info('Controller ready');

  return { connectors, repositories, services, controller };
}

// ============================================================================
// Repositories
// ============================================================================

function createRepositories(db: IDatabase): Repositories {
  return {
    agent: new AgentRepository(db),
    prompt: new AgentPromptRepository(db),
    assessment: new AgentAssessmentRepository(db),
    step: new AgentStepRepository(db),
    session: new SessionRepository(db),
    conversation: new ConversationRepository(db),
    participant: new ParticipantRepository(db),
  };
}

// ============================================================================
// Services
// ============================================================================

function createServices(connectors: Connectors, repositories: Repositories): AppServices {
  const auth = new AuthService(repositories.session);

  const actionHandler = new ActionHandler({
    sessionRepo: repositories.session,
    conversationRepo: repositories.conversation,
    promptRepo: repositories.prompt,
    assessmentRepo: repositories.assessment,
    stepRepo: repositories.step,
  });

  const conversation = new ConversationService({
    agentRepo: repositories.agent,
    sessionRepo: repositories.session,
    conversationRepo: repositories.conversation,
    participantRepo: repositories.participant,
    promptRepo: repositories.prompt,
    llmConnector: connectors.llm,
    actionHandler,
  });

  const transcription = createTranscriptionService(connectors.stt);
  const synthesis = createSynthesisService(connectors.tts, connectors.lipSync);

  return { auth, conversation, transcription, synthesis };
}

// ============================================================================
// Controller
// ============================================================================

function createController(
  services: AppServices,
  repositories: Repositories,
  connectors: Connectors
): WebSocketController {
  const handlerServices: HandlerServices = {
    auth: services.auth,
    conversation: services.conversation,
    transcription: services.transcription,
    synthesis: services.synthesis,
  };

  const handlerRepositories: HandlerRepositories = {
    session: repositories.session,
    agent: repositories.agent,
    participant: repositories.participant,
    conversation: repositories.conversation,
    prompt: repositories.prompt,
    assessment: repositories.assessment,
  };

  const rateLimiter = new WebSocketRateLimiter(connectors.cache);

  return createWebSocketController({
    services: handlerServices,
    repositories: handlerRepositories,
    apiConnector: connectors.api,
    rateLimiter,
    config: {
      pingIntervalMs: serverConfig.websocket.pingIntervalMs,
      pongTimeoutMs: serverConfig.websocket.pongTimeoutMs,
      trustedProxyIpHeader: serverConfig.trustedProxyIpHeader || undefined,
    },
  });
}

// ============================================================================
// Server
// ============================================================================

export async function startServer(app: AppCore): Promise<ServerInstance> {
  log.info('Setting up HTTP server...');

  const healthHandler = createHealthHandler({
    getConnectionCount: () => app.controller.getConnectionCount(),
    version: process.env.npm_package_version,
    includeMemoryStats: true,
  });

  const readyHandler = createReadyHandler({
    pingDb: () => app.connectors.database.ping(),
    pingCache: () => app.connectors.cache.ping(),
  });

  const httpServer = createServer(createHttpRouter([healthHandler, readyHandler]));

  const wss = setupWebSocketRoute(httpServer, app.controller, {
    path: serverConfig.websocket.path,
    maxPayload: serverConfig.websocket.maxMessageSize,
  });
  log.info('WebSocket route configured');

  const { port, host } = serverConfig;

  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => resolve());
  });

  log.info('Aria Realtime Engine started', {
    http: `http://${host}:${port}`,
    websocket: `ws://${host}:${port}${serverConfig.websocket.path}`,
    health: `http://${host}:${port}/health`,
  });

  return { httpServer, wss, port, host };
}

// ============================================================================
// Shutdown
// ============================================================================

const STEP_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) =>
      setTimeout(() => {
        log.warn(`Shutdown step "${label}" timed out after ${STEP_TIMEOUT_MS}ms, continuing`);
        resolve();
      }, STEP_TIMEOUT_MS)
    ),
  ]);
}

export function createShutdown(
  app: AppCore,
  server: ServerInstance
): () => Promise<void> {
  return async () => {
    log.info('Shutting down...');

    await withTimeout(app.controller.closeAll('Server shutting down'), 'closeAll');
    log.info('WebSocket connections closed');

    await withTimeout(
      new Promise<void>((resolve) => server.wss.close(() => resolve())),
      'wss.close'
    );
    log.info('WebSocket server closed');

    await withTimeout(
      new Promise<void>((resolve) => server.httpServer.close(() => resolve())),
      'httpServer.close'
    );
    log.info('HTTP server closed');

    await withTimeout(app.connectors.database.disconnect(), 'database.disconnect');
    log.info('Database disconnected');

    await withTimeout(app.connectors.cache.disconnect(), 'cache.disconnect');
    log.info('Cache disconnected');

    log.info('Shutdown complete');
  };
}

// ============================================================================
// Convenience
// ============================================================================

export async function bootstrap(options: BootstrapOptions = {}): Promise<AppInstance> {
  const core = await createApp(options);
  const server = await startServer(core);
  const shutdown = createShutdown(core, server);

  return { core, server, shutdown };
}
