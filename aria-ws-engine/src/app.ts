/**
 * Aria Realtime - Application Entry Point
 *
 * Minimal entry point that delegates to the bootstrap module.
 * Handles only:
 * - Starting the application
 * - Signal handling for graceful shutdown
 * - Top-level error handling
 *
 * All dependency wiring is handled in bootstrap.ts
 */

import { bootstrap, type AppInstance } from './bootstrap';
import { logger } from '@utils';

/**
 * Setup graceful shutdown handlers
 *
 * @param app - Application instance with shutdown method
 */
const SHUTDOWN_TIMEOUT_MS = 15_000;

function setupGracefulShutdown(app: AppInstance): void {
  let shuttingDown = false;

  const handleShutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return; // Prevent double-shutdown from rapid signals
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

  // Handle termination signals
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  // Handle uncaught errors (log but don't crash immediately)
  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught exception', error);
    handleShutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal('Unhandled rejection', reason instanceof Error ? reason : { reason });
    handleShutdown('unhandledRejection').catch(() => process.exit(1));
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const app = await bootstrap();
    setupGracefulShutdown(app);
  } catch (error) {
    logger.fatal('Failed to start application', error instanceof Error ? error : { error });
    process.exit(1);
  }
}

// Run
main();
