import { createServer, Server as HttpServer } from 'http';
import { Application } from 'express';

import { loadConfig, AppConfig } from '@config';
import { createConnectors, Connectors } from '@connectors';
import { createRepositories, ensureIndexes, Repositories } from '@repositories';
import { createServices, Services } from '@services';
import { createMiddleware, Middleware } from '@middleware';
import { Controllers, createControllers } from '@controllers';
import { createExpressApp } from '@routes';
import { createLogger } from '@utils/logger';

const log = createLogger('bootstrap');

export interface AppCore {
  config: AppConfig;
  connectors: Connectors;
  repositories: Repositories;
  services: Services;
  controllers: Controllers;
  middleware: Middleware;
  express: Application;
}

export interface ServerInstance {
  httpServer: HttpServer;
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

export async function createApp(options: BootstrapOptions = {}): Promise<AppCore> {
  log.info('Creating Aria Flow Engine...');

  log.info('Loading configuration...');
  const config = loadConfig();
  log.info('Configuration loaded');

  log.info('Creating connectors...');
  const connectors = createConnectors(config);
  log.info('All connectors created');

  log.info('Connecting to database...');
  await connectors.database.connect();
  log.info('Database connected');

  log.info('Connecting to cache...');
  try {
    await connectors.cache.connect();
    log.info('Cache connected');
  } catch (error) {
    log.warn('Cache connection failed, using in-memory fallback', { error: String(error) });
  }

  log.info('Creating repositories...');
  const repositories = createRepositories(connectors.database);
  log.info('Repositories ready');

  log.info('Ensuring database indexes...');
  await ensureIndexes(repositories);
  log.info('Database indexes ready');

  log.info('Creating services...');
  const services = createServices(config, connectors, repositories);
  log.info('All services ready');

  log.info('Creating middleware...');
  const middleware = createMiddleware(config, repositories, services, connectors.cache);
  log.info('Middleware ready');

  log.info('Creating controllers...');
  const controllers = createControllers(services, connectors);
  log.info('Controllers ready');

  log.info('Creating Express app...');
  const expressApp = createExpressApp(connectors, controllers, middleware, {
    corsOrigin: config.server.corsOrigin,
  });
  log.info('Express app ready');

  return {
    config,
    connectors,
    repositories,
    services,
    controllers,
    middleware,
    express: expressApp,
  };
}

export async function startServer(app: AppCore): Promise<ServerInstance> {
  const { port } = app.config.server;
  const host = '0.0.0.0';

  const httpServer = createServer(app.express);

  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => resolve());
  });

  log.info('Aria Flow Engine started!', { http: `http://${host}:${port}`, health: `http://${host}:${port}/health` });

  return { httpServer, port, host };
}

export function createShutdown(app: AppCore, server: ServerInstance): () => Promise<void> {
  return async () => {
    log.info('Shutting down...');

    await new Promise<void>((resolve) => {
      server.httpServer.close(() => resolve());
    });
    log.info('HTTP server closed');

    await app.connectors.database.disconnect();
    log.info('Database disconnected');

    await app.connectors.cache.disconnect();
    log.info('Cache disconnected');

    log.info('Shutdown complete');
  };
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<AppInstance> {
  const core = await createApp(options);
  const server = await startServer(core);
  const shutdown = createShutdown(core, server);

  return { core, server, shutdown };
}
