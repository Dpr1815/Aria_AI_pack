/**
 * Health Routes
 *
 * HTTP health check endpoint for monitoring and load balancers.
 * Returns server status, uptime, and connection metrics.
 */

import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Health check response data
 */
export interface HealthCheckData {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  connections?: number;
  version?: string;
  memory?: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

/**
 * Health route configuration
 */
export interface HealthRouteConfig {
  /** Function to get current WebSocket connection count */
  getConnectionCount?: () => number;
  /** Application version */
  version?: string;
  /** Include memory stats in response */
  includeMemoryStats?: boolean;
}

/**
 * Creates a health check request handler
 *
 * @param config - Health route configuration
 * @returns Request handler function that returns true if request was handled
 *
 * @example
 * ```typescript
 * const healthHandler = createHealthHandler({
 *   getConnectionCount: () => wsController.getConnectionCount(),
 *   version: '1.0.0',
 * });
 * ```
 */
export function createHealthHandler(config: HealthRouteConfig = {}) {
  const startTime = Date.now();

  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (req.url === '/health' && req.method === 'GET') {
      const memoryUsage = config.includeMemoryStats ? process.memoryUsage() : null;

      const healthData: HealthCheckData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        ...(config.getConnectionCount !== undefined && {
          connections: config.getConnectionCount(),
        }),
        ...(config.version && { version: config.version }),
        ...(memoryUsage && {
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
          },
        }),
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthData));
      return true;
    }

    return false;
  };
}

/**
 * Request handler type
 * Returns true if the request was handled, false to continue to next handler
 */
export type HttpRequestHandler = (req: IncomingMessage, res: ServerResponse) => boolean;

/**
 * Creates a simple HTTP request router
 *
 * Iterates through handlers until one returns true (handled).
 * If no handler matches, returns 404.
 *
 * @param handlers - Array of request handlers to try in order
 * @returns Combined request handler for http.createServer
 *
 * @example
 * ```typescript
 * const router = createHttpRouter([
 *   healthHandler,
 *   metricsHandler,
 * ]);
 * const server = createServer(router);
 * ```
 */
export function createHttpRouter(
  handlers: HttpRequestHandler[]
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req: IncomingMessage, res: ServerResponse): void => {
    for (const handler of handlers) {
      if (handler(req, res)) {
        return;
      }
    }

    // No handler matched - return 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  };
}
