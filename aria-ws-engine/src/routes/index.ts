// src/routes/index.ts

export {
  setupWebSocketRoute,
  createStandaloneWebSocketServer,
  type WebSocketRouteConfig,
} from './websocket.routes';

export {
  createHealthHandler,
  createHttpRouter,
  type HealthCheckData,
  type HealthRouteConfig,
} from './health.routes';
