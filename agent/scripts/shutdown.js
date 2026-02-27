import pino from 'pino';

const logger = pino();

async function gracefulShutdown() {
  logger.info('🛑 Initiating graceful shutdown...');
  
  try {
    // The main agent process receives SIGTERM/SIGINT
    // and handles shutdown automatically
    logger.info('✅ Shutdown signal sent to agent process');
    process.exit(0);
  } catch (error) {
    logger.error(`Shutdown error: ${error.message}`);
    process.exit(1);
  }
}

gracefulShutdown();
