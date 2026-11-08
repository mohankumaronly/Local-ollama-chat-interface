import type { Request, Response } from 'express';
import { env } from '../../config/env.js';

export function verifyAuthHandler(_req: Request, res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    tokenSourceHint: env.API_TOKEN_SOURCE,
  });
}
