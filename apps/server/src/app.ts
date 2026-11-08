import express from 'express';
import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger.js';
import { requireAuth } from './middleware/auth.js';
import { healthRouter } from './modules/health/health.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { ollamaRouter } from './modules/ollama/ollama.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';

export function createApp() {
  const app = express();

  // Attach / propagate request id
  app.use((req, res, next) => {
    (req as express.Request & { id: string }).id =
      req.headers['x-request-id']?.toString() ?? randomUUID();
    res.setHeader('X-Request-Id', (req as express.Request & { id: string }).id);
    next();
  });

  // Structured per-request logging
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request & { id: string }).id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // Don't log health-check spam at info level
      autoLogging: {
        ignore: (req) => req.url === '/api/v1/health',
      },
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  app.use(requireAuth);  // 401 for unauthenticated requests (health is exempt)

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/ollama', ollamaRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', chatRouter);

  // Global error handler — must be last
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const e = err as Error & { status?: number };
      const reqId = (req as express.Request & { id?: string }).id;
      logger.error({ err: e, reqId }, 'unhandled error');
      const status = e.status ?? 500;
      res.status(status).json({ error: e.message ?? 'Internal error', reqId });
    },
  );

  return app;
}
