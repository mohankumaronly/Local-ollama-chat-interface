import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import type { HealthResponse } from '@local-ollama/shared';
import { db } from '../../db/client.js';

export async function health(_req: Request, res: Response): Promise<void> {
  try {
    await db.execute(sql`SELECT 1`);
    const body: HealthResponse = { ok: true, db: 'up' };
    res.json(body);
  } catch (err) {
    const body: HealthResponse = { ok: false, db: 'down', error: (err as Error).message };
    res.status(503).json(body);
  }
}
