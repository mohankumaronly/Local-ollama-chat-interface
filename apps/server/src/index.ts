import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/client.js';
import { renderBanner } from './lib/banner.js';
import { logger } from './lib/logger.js';

logger.info(
  { tokenSource: env.API_TOKEN_SOURCE },
  env.API_TOKEN_SOURCE === 'generated'
    ? 'Generated new API_TOKEN and persisted it to disk'
    : env.API_TOKEN_SOURCE === 'file'
      ? 'Loaded API_TOKEN from persisted file'
      : 'Using API_TOKEN from environment',
);

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, 'server listening');
  console.log(
    renderBanner({
      publicUrl: env.PUBLIC_URL,
      ollamaUrl: env.OLLAMA_URL,
      token: env.API_TOKEN,
      tokenSource: env.API_TOKEN_SOURCE,
      forceDisplay: env.API_TOKEN_FORCE_DISPLAY === 'true',
    }),
  );
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
