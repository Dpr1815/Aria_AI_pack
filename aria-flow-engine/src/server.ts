import { bootstrap, AppInstance } from './bootstrap';

function setupGracefulShutdown(app: AppInstance): void {
  const handleShutdown = async (signal: string): Promise<void> => {
    console.log(`\n Received ${signal}`);
    await app.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  process.on('uncaughtException', (error) => {
    console.error(' Uncaught exception:', error);
    handleShutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    console.error(' Unhandled rejection:', reason);
    handleShutdown('unhandledRejection').catch(() => process.exit(1));
  });
}

async function main(): Promise<void> {
  try {
    const app = await bootstrap();
    setupGracefulShutdown(app);
  } catch (error) {
    console.error('\n Failed to start application:', error);
    process.exit(1);
  }
}

main();
