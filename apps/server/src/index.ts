import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/client.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'server listening');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutdown initiated');
  server.close((err) => {
    if (err) logger.error({ err }, 'http server close error');
    closeDb()
      .then(() => logger.info('shutdown complete'))
      .catch((e: unknown) => logger.error({ err: e }, 'db close error'))
      .finally(() => process.exit(0));
  });
  // Hard timeout: if graceful close hangs (e.g. idle SSE connection),
  // force-exit after 10s. unref() means the timer won't prevent a normal exit.
  setTimeout(() => {
    logger.error('shutdown timeout, forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandled rejection');
  process.exit(1);
});
