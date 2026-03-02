import { bootstrap, AppInstance } from './bootstrap';
import { logger } from '@utils/logger';

const SHUTDOWN_TIMEOUT_MS = 15_000;

function setupGracefulShutdown(app: AppInstance): void {
  let shuttingDown = false;

  const handleShutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`Received ${signal}, shutting down`);

    const forceExit = setTimeout(() => {
      logger.fatal('Shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    await app.shutdown();
    clearTimeout(forceExit);
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught exception', error instanceof Error ? error : { error });
    handleShutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal('Unhandled rejection', reason instanceof Error ? reason : { reason });
    handleShutdown('unhandledRejection').catch(() => process.exit(1));
  });
}

async function main(): Promise<void> {
  try {
    const app = await bootstrap();
    setupGracefulShutdown(app);
  } catch (error) {
    logger.fatal('Failed to start application', error instanceof Error ? error : { error });
    process.exit(1);
  }
}

main();
