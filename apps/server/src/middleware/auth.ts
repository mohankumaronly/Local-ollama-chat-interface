import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/**
 * Bearer-token auth guard.
 * /api/v1/health is intentionally public so tunnel monitors and
 * Docker healthchecks work without credentials.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/api/v1/health' || req.path.startsWith('/api/v1/health/')) {
    next();
    return;
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || token !== env.API_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
