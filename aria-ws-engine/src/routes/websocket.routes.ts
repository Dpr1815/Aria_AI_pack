/**
 * WebSocket Route
 *
 * Sets up WebSocket server and attaches controller.
 */

import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { WebSocketController } from '@controllers';
import { createLogger } from '@utils';

const logger = createLogger('WebSocketRoute');

/**
 * WebSocket route configuration
 */
export interface WebSocketRouteConfig {
  /** WebSocket path (default: '/ws') */
  path?: string;

  /** Maximum payload size in bytes */
  maxPayload?: number;

  /** Enable per-message deflate compression */
  perMessageDeflate?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: WebSocketRouteConfig = {
  path: '/ws',
  maxPayload: 10 * 1024 * 1024, // 10MB
  perMessageDeflate: false, // Disabled for real-time audio
};

/**
 * Setup WebSocket route
 *
 * Creates a WebSocketServer and attaches the controller.
 *
 * @param server - HTTP server instance
 * @param controller - WebSocket controller instance
 * @param config - Optional configuration
 * @returns WebSocketServer instance
 *
 * @example
 * ```typescript
 * const wss = setupWebSocketRoute(httpServer, wsController);
 * ```
 */
export function setupWebSocketRoute(
  server: Server,
  controller: WebSocketController,
  config?: WebSocketRouteConfig
): WebSocketServer {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Create WebSocket server
  const wss = new WebSocketServer({
    server,
    path: mergedConfig.path,
    maxPayload: mergedConfig.maxPayload,
    perMessageDeflate: mergedConfig.perMessageDeflate,
  });

  // Attach controller to handle connections
  controller.attach(wss);

  logger.info('WebSocket server listening', { path: mergedConfig.path });

  return wss;
}

/**
 * Create standalone WebSocket server (without HTTP server)
 *
 * Useful for testing or when WebSocket runs on separate port.
 *
 * @param port - Port number
 * @param controller - WebSocket controller instance
 * @param config - Optional configuration
 * @returns WebSocketServer instance
 */
export function createStandaloneWebSocketServer(
  port: number,
  controller: WebSocketController,
  config?: Omit<WebSocketRouteConfig, 'path'>
): WebSocketServer {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const wss = new WebSocketServer({
    port,
    maxPayload: mergedConfig.maxPayload,
    perMessageDeflate: mergedConfig.perMessageDeflate,
  });

  controller.attach(wss);

  logger.info('Standalone WebSocket server listening', { port });

  return wss;
}
