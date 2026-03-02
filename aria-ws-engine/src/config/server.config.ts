/**
 * Server Configuration
 *
 * HTTP and WebSocket server settings.
 */

import { logger } from '@utils';

// ============================================
// Environment Variables
// ============================================

const {
  PORT = '3000',
  HOST = '0.0.0.0',
  NODE_ENV = 'development',
  SESSION_JWT_SECRET = '',
  WS_PATH = '/ws',
  WS_PING_INTERVAL_MS = '30000',
  WS_PONG_TIMEOUT_MS = '10000',
  WS_MAX_MESSAGE_SIZE = '1048576', // 1MB
  CORS_ORIGIN = '*',
  API_SERVER_URL = 'http://localhost:8080',
  SERVICE_TOKEN = '',
} = process.env;

// ============================================
// Server Configuration
// ============================================

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  jwtSecret: string;
  cors: CorsConfig;
  websocket: WebSocketConfig;
  api: ApiConfig;
}

export interface CorsConfig {
  origin: string | string[];
  credentials: boolean;
}

export interface WebSocketConfig {
  path: string;
  pingIntervalMs: number;
  pongTimeoutMs: number;
  maxMessageSize: number;
}

/** Configuration for service-to-service communication with the API server */
export interface ApiConfig {
  baseUrl: string;
  serviceToken: string;
}

// ============================================
// Configuration Object
// ============================================

export const serverConfig: ServerConfig = {
  port: parseInt(PORT, 10),
  host: HOST,
  nodeEnv: NODE_ENV as 'development' | 'production' | 'test',
  jwtSecret: SESSION_JWT_SECRET,
  cors: {
    origin: CORS_ORIGIN.includes(',') ? CORS_ORIGIN.split(',').map((s) => s.trim()) : CORS_ORIGIN,
    credentials: true,
  },
  websocket: {
    path: WS_PATH,
    pingIntervalMs: parseInt(WS_PING_INTERVAL_MS, 10),
    pongTimeoutMs: parseInt(WS_PONG_TIMEOUT_MS, 10),
    maxMessageSize: parseInt(WS_MAX_MESSAGE_SIZE, 10),
  },
  api: {
    baseUrl: API_SERVER_URL,
    serviceToken: SERVICE_TOKEN,
  },
};

// ============================================
// Helper Functions
// ============================================

export function isDevelopment(): boolean {
  return serverConfig.nodeEnv === 'development';
}

export function isProduction(): boolean {
  return serverConfig.nodeEnv === 'production';
}

export function isTest(): boolean {
  return serverConfig.nodeEnv === 'test';
}

export function getServerUrl(): string {
  const protocol = isProduction() ? 'https' : 'http';
  return `${protocol}://${serverConfig.host}:${serverConfig.port}`;
}

export function getWebSocketUrl(): string {
  const protocol = isProduction() ? 'wss' : 'ws';
  return `${protocol}://${serverConfig.host}:${serverConfig.port}${serverConfig.websocket.path}`;
}

// ============================================
// Validation
// ============================================

export function validateServerConfig(): void {
  if (!serverConfig.jwtSecret) {
    if (isProduction()) {
      throw new Error('SESSION_JWT_SECRET is required in production');
    }
    logger.warn('SESSION_JWT_SECRET not set - using insecure default for development');
  }

  if (!serverConfig.api.serviceToken) {
    if (isProduction()) {
      throw new Error('SERVICE_TOKEN is required in production');
    }
    logger.warn('SERVICE_TOKEN not set - internal API calls will fail');
  }

  if (serverConfig.port < 1 || serverConfig.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }
}
