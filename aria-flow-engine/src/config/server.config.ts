import { ConfigurationError } from '@utils';

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  sessionTokenSecret: string;
  serviceTokenSecret: string;
  corsOrigin: string | string[];
}

export const loadServerConfig = (): ServerConfig => {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  const sessionTokenSecret = process.env.SESSION_TOKEN_SECRET;
  const serviceTokenSecret = process.env.SERVICE_TOKEN_SECRET;

  if (!accessTokenSecret) {
    throw new ConfigurationError('ACCESS_TOKEN_SECRET is required');
  }

  if (!refreshTokenSecret) {
    throw new ConfigurationError('REFRESH_TOKEN_SECRET is required');
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (!sessionTokenSecret) {
    if (isProduction) {
      throw new ConfigurationError('SESSION_TOKEN_SECRET is required in production');
    }
    console.warn(
      'Warning: SESSION_TOKEN_SECRET not set, falling back to ACCESS_TOKEN_SECRET. ' +
        'This is not allowed in production.'
    );
  }

  if (!serviceTokenSecret) {
    if (isProduction) {
      throw new ConfigurationError('SERVICE_TOKEN_SECRET is required in production');
    }
    console.warn(
      'Warning: SERVICE_TOKEN_SECRET not set, falling back to ACCESS_TOKEN_SECRET. ' +
        'This is not allowed in production.'
    );
  }

  const corsOriginRaw = process.env.CORS_ORIGIN || '*';
  const corsOrigin = corsOriginRaw.includes(',')
    ? corsOriginRaw.split(',').map((s) => s.trim())
    : corsOriginRaw;

  return {
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    accessTokenSecret,
    refreshTokenSecret,
    sessionTokenSecret: sessionTokenSecret || accessTokenSecret,
    serviceTokenSecret: serviceTokenSecret || accessTokenSecret,
    corsOrigin,
  };
};
