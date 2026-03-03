/**
 * WebSocket Controller
 *
 * Main WebSocket connection manager.
 * Routes incoming messages through the handler registry.
 *
 * Design:
 * - No switch statements — all routing via registry
 * - Per-connection state management
 * - Automatic ping/pong for connection health
 * - Auth via access token on init → session lookup
 * - Auto-summary trigger on disconnect (if agent.features.autoSummary is enabled)
 */

import type { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import {
  ErrorCode,
  type WebSocketControllerConfig,
  type ClientMessage,
  type HandlerContext,
  type ConnectionState,
  type HandlerServices,
  type HandlerRepositories,
} from '@types';
import type { IApiConnector } from '@connectors';
import { handlerRegistry, hasHandler, getRegisteredTypes } from './handlers/registry';
import { sendError, sendSafeError } from './handlers/ws.utils';
import { createLogger, ValidationError } from '@utils';
import { safeParseClientMessage, formatValidationError } from '@validations';
import { WebSocketRateLimiter } from '../middleware/WebSocketRateLimiter';

const logger = createLogger('WebSocketController');

// ============================================
// Config
// ============================================

const DEFAULT_CONFIG: WebSocketControllerConfig = {
  pingIntervalMs: 30000,
  pongTimeoutMs: 10000,
  maxMessageSize: 10 * 1024 * 1024, // 10MB
};

// ============================================
// Dependencies
// ============================================

export interface WebSocketControllerDependencies {
  services: HandlerServices;
  repositories: HandlerRepositories;
  apiConnector: IApiConnector;
  config?: Partial<WebSocketControllerConfig>;
  rateLimiter?: WebSocketRateLimiter;
}

// ============================================
// Connection State Factory
// ============================================

function createConnectionState(ip: string): ConnectionState {
  return {
    sessionId: null,
    session: null,
    agent: null,
    isAuthenticated: false,
    transcriptionSessionId: null,
    ip,
    connectedAt: new Date(),
    lastActivityAt: new Date(),
  };
}

// ============================================
// Controller
// ============================================

export class WebSocketController {
  private readonly services: HandlerServices;
  private readonly repositories: HandlerRepositories;
  private readonly apiConnector: IApiConnector;
  private readonly config: WebSocketControllerConfig;
  private readonly rateLimiter?: WebSocketRateLimiter;
  private readonly connections: Map<WebSocket, ConnectionState> = new Map();

  constructor(deps: WebSocketControllerDependencies) {
    this.services = deps.services;
    this.repositories = deps.repositories;
    this.apiConnector = deps.apiConnector;
    this.config = { ...DEFAULT_CONFIG, ...deps.config };
    this.rateLimiter = deps.rateLimiter;
  }

  attach(wss: WebSocketServer): void {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => this.handleConnection(ws, req));
    logger.info('WebSocket controller attached');
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const ip = this.extractIP(req);
    logger.info('New WebSocket connection', { ip });

    // Connection rate limiting
    if (this.rateLimiter) {
      const result = await this.rateLimiter.checkConnectionRate(ip);
      if (!result.allowed) {
        sendError(ws, 'Too many connections. Please try again later.', ErrorCode.RATE_LIMITED);
        ws.close(1008, 'Rate limited');
        return;
      }
    }

    const connectionState = createConnectionState(ip);
    this.connections.set(ws, connectionState);

    let pongTimeout: ReturnType<typeof setTimeout> | null = null;

    const pingInterval = setInterval(() => {
      if (ws.readyState !== ws.OPEN) return;

      ws.ping();

      pongTimeout = setTimeout(() => {
        logger.warn('Pong timeout — terminating dead connection');
        ws.terminate();
      }, this.config.pongTimeoutMs);
    }, this.config.pingIntervalMs);

    const context = this.createContext(connectionState);

    ws.on('message', async (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const message = this.parseMessage(data);
        await this.routeMessage(ws, message, context);
      } catch (error) {
        logger.error('Message handling error', error as Error);
        sendSafeError(ws, error, ErrorCode.MESSAGE_ERROR);
      }
    });

    ws.on('close', async (code: number) => {
      logger.info(`WebSocket closed (code: ${code})`);
      clearInterval(pingInterval);
      if (pongTimeout) clearTimeout(pongTimeout);
      await this.handleDisconnect(connectionState);
      this.connections.delete(ws);
    });

    ws.on('error', (error: Error) => {
      logger.error('WebSocket error', error);
    });

    ws.on('pong', () => {
      if (pongTimeout) clearTimeout(pongTimeout);
      pongTimeout = null;
      connectionState.lastActivityAt = new Date();
    });
  }

  private parseMessage(data: Buffer | ArrayBuffer | Buffer[]): ClientMessage {
    let rawBytes: Buffer;

    if (Buffer.isBuffer(data)) {
      rawBytes = data;
    } else if (data instanceof ArrayBuffer) {
      rawBytes = Buffer.from(data);
    } else if (Array.isArray(data)) {
      rawBytes = Buffer.concat(data);
    } else {
      throw new Error('Unsupported message format');
    }

    if (this.config.maxMessageSize && rawBytes.byteLength > this.config.maxMessageSize) {
      throw new Error(
        `Message too large: ${rawBytes.byteLength} bytes (max ${this.config.maxMessageSize})`
      );
    }

    const raw = rawBytes.toString('utf8');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ValidationError('Invalid JSON');
    }

    const result = safeParseClientMessage(parsed);
    if (!result.success) {
      throw new ValidationError(`Invalid message: ${formatValidationError(result.error)}`);
    }
    return result.data;
  }

  private async routeMessage(
    ws: WebSocket,
    message: ClientMessage,
    context: HandlerContext
  ): Promise<void> {
    // Rate limiting — separate buckets for control messages vs audio chunks
    if (this.rateLimiter) {
      const rateLimitKey = context.connectionState.sessionId?.toString() || context.connectionState.ip;
      const result = message.type === 'audio'
        ? await this.rateLimiter.checkAudioRate(rateLimitKey)
        : await this.rateLimiter.checkMessageRate(rateLimitKey);
      if (!result.allowed) {
        sendError(ws, 'Too many messages. Please slow down.', ErrorCode.RATE_LIMITED);
        return;
      }
    }

    const { type } = message;

    if (!hasHandler(type)) {
      const valid = getRegisteredTypes().join(', ');
      sendError(ws, `Unknown message type: ${type}. Valid: ${valid}`, ErrorCode.UNKNOWN_TYPE);
      return;
    }

    const handlerConfig = handlerRegistry[type];

    if (handlerConfig.requiresAuth !== false && !context.connectionState.isAuthenticated) {
      sendError(ws, 'Please initialize the session first', ErrorCode.AUTH_REQUIRED);
      return;
    }

    await handlerConfig.execute(ws, message, context);
  }

  /**
   * Clean up on disconnect.
   * Destroys transcription session and triggers auto-summary if enabled.
   */
  private async handleDisconnect(state: ConnectionState): Promise<void> {
    if (state.transcriptionSessionId) {
      try {
        this.services.transcription.destroySession(state.transcriptionSessionId);
      } catch (error) {
        logger.error('Error destroying transcription session', error as Error);
      }
    }

    await this.triggerAutoSummary(state);

    await this.triggerStatisticsRefresh(state);
  }

  /**
   * Trigger summary generation via the API server if autoSummary is enabled.
   * Fire-and-forget — errors are logged but never block disconnect cleanup.
   */
  private async triggerAutoSummary(state: ConnectionState): Promise<void> {
    const { agent, sessionId } = state;

    if (!agent || !sessionId) {
      return;
    }

    if (!agent.features.autoSummary) {
      return;
    }

    if (!agent.summaryTypeId) {
      logger.warn(`Auto-summary enabled but no summaryTypeId configured for agent ${agent._id}`);
      return;
    }

    try {
      const summary_result = await this.apiConnector.generateSummary(sessionId.toString());

      if (!summary_result.success) {
        logger.error(`Auto-summary failed for session ${sessionId}: ${summary_result.error}`);
      }
    } catch (error) {
      logger.error('Unexpected error triggering auto-summary', error as Error);
    }
  }
  /**
   * Trigger statistics refresh  via the API server if autoSummary is enabled.
   * Fire-and-forget — errors are logged but never block disconnect cleanup.
   */
  private async triggerStatisticsRefresh(state: ConnectionState): Promise<void> {
    const { agent, sessionId } = state;

    if (!agent || !sessionId) {
      return;
    }

    if (!agent.statisticsTypeId) {
      logger.warn(`No statisticsTypeId configured for agent ${agent._id}`);
      return;
    }

    try {
      const statistics_result = await this.apiConnector.refreshStatistics(agent._id.toString());

      if (!statistics_result.success) {
        logger.error(
          `Statistics refresh failed for session ${sessionId}: ${statistics_result.error}`
        );
      }
    } catch (error) {
      logger.error('Unexpected error triggering auto-summary', error as Error);
    }
  }
  private createContext(connectionState: ConnectionState): HandlerContext {
    return {
      services: this.services,
      repositories: this.repositories,
      connectionState,
    };
  }

  private extractIP(req: IncomingMessage): string {
    const header = this.config.trustedProxyIpHeader;
    if (header) {
      const value = req.headers[header];
      if (typeof value === 'string') {
        return value.split(',')[0].trim();
      }
    }
    return req.socket.remoteAddress || 'unknown';
  }

  // ============================================
  // Monitoring
  // ============================================

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnectionStates(): ConnectionState[] {
    return Array.from(this.connections.values());
  }

  async closeAll(reason = 'Server shutting down'): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(
      (ws) =>
        new Promise<void>((resolve) => {
          ws.close(1001, reason);
          ws.once('close', () => resolve());
          setTimeout(() => {
            ws.terminate();
            resolve();
          }, 5000);
        })
    );

    await Promise.all(promises);

    // Run cleanup for connections that timed out — their 'close' event
    // handler didn't fire, so handleDisconnect was never called.
    for (const [, state] of this.connections) {
      await this.handleDisconnect(state);
    }
    this.connections.clear();
  }
}

// ============================================
// Factory
// ============================================

export function createWebSocketController(
  deps: WebSocketControllerDependencies
): WebSocketController {
  return new WebSocketController(deps);
}
