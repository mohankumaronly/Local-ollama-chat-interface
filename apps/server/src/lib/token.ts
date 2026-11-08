import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type TokenSource = 'env' | 'file' | 'generated';

export interface ResolvedToken {
  token: string;
  source: TokenSource;
  path?: string; // set when source is "file" or "generated"
}

export function resolveApiToken(opts?: {
  envToken?: string;
  tokenPath?: string;
  persist?: boolean;
}): ResolvedToken {
  const envToken = opts?.envToken !== undefined ? opts.envToken : (process.env.API_TOKEN ?? '');
  const tokenPath = opts?.tokenPath !== undefined ? opts.tokenPath : (process.env.API_TOKEN_FILE ?? '/app/data/api-token');
  const persist = opts?.persist !== undefined ? opts.persist : (process.env.NODE_ENV === 'production');

  const trimmedEnv = envToken.trim();
  if (trimmedEnv.length > 0) {
    return { token: trimmedEnv, source: 'env' };
  }

  if (fs.existsSync(tokenPath)) {
    try {
      const fileContent = fs.readFileSync(tokenPath, 'utf8');
      const trimmedFile = fileContent.trim();
      if (trimmedFile.length > 0) {
        return { token: trimmedFile, source: 'file', path: tokenPath };
      }
    } catch {
      // Treat unreadable or failing file as missing
    }
  }

  if (persist) {
    const token = randomBytes(32).toString('base64url');
    const dir = path.dirname(tokenPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 });
    try {
      fs.chmodSync(tokenPath, 0o600);
    } catch {
      // Ignore if filesystem doesn't support chmod mode
    }
    return { token, source: 'generated', path: tokenPath };
  }

  throw new Error('API_TOKEN is not set. In dev mode, add API_TOKEN=... to apps/server/.env');
}
