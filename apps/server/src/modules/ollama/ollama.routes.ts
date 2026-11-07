import { Router } from 'express';
import { z } from 'zod';
import { isAllowedOllamaUrl, listModelsFrom } from './ollama.client.js';
import { logger } from '../../lib/logger.js';

export const ollamaRouter = Router();

const TestQuery = z.object({ url: z.string().url() });

/**
 * GET /api/v1/ollama/test?url=<target>
 *
 * Validates the URL against the allowlist, then tries GET /api/tags on the
 * target. Used by the frontend "Test connection" button so the browser never
 * talks to Ollama directly (avoids CORS) and gets allowlist enforcement for
 * free.
 *
 * 200 { ok: true,  models: string[] }
 * 400 { ok: false, error: string }   — policy rejection
 * 502 { ok: false, error: string }   — target unreachable
 */
ollamaRouter.get('/test', async (req, res) => {
  const parsed = TestQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'Invalid url parameter' });
    return;
  }

  const { url } = parsed.data;

  if (!isAllowedOllamaUrl(url)) {
    res.status(400).json({ ok: false, error: 'URL not allowed by allowlist' });
    return;
  }

  try {
    const models = await listModelsFrom(url.replace(/\/+$/, ''));
    res.json({ ok: true, models });
  } catch (err) {
    logger.warn({ err: (err as Error).message, url }, 'ollama test failed');
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
});
