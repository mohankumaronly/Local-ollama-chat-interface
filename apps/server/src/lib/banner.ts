import { createHash } from 'node:crypto';

export interface BannerInput {
  publicUrl: string;
  ollamaUrl: string;
  token: string;
  tokenSource: 'env' | 'file' | 'generated';
  forceDisplay: boolean;
}

export function tokenFingerprint(token: string): string {
  const hash = createHash('sha256').update(token).digest('hex').slice(0, 8);
  return `${hash}… (${token.length} chars, fingerprint)`;
}

export function renderBanner(input: BannerInput): string {
  const borderDouble = '═'.repeat(64);
  const borderSingle = '─'.repeat(64);

  const lines: string[] = [
    borderDouble,
    '  Local Ollama Chat Interface — READY',
    borderSingle,
    `  Open in browser:   ${input.publicUrl}`,
    '',
  ];

  const showFullToken = input.tokenSource === 'generated' || input.forceDisplay;

  if (showFullToken) {
    lines.push(`  API Token:         ${input.token}`);
    if (input.forceDisplay) {
      lines.push('                     └─ forced display (API_TOKEN_FORCE_DISPLAY=true)');
    } else {
      lines.push('                     └─ paste this into Settings on first load');
    }
  } else {
    lines.push(`  API Token:         ${tokenFingerprint(input.token)}`);
    lines.push('                     └─ full token was shown on first boot;');
    lines.push('      recover with: docker compose exec server cat /app/data/api-token');
  }

  lines.push('');
  lines.push(`  Ollama URL:        ${input.ollamaUrl}`);

  if (showFullToken) {
    lines.push(borderSingle);
    lines.push('  Token stored at /app/data/api-token (volume: local-ollama-api-token)');
    lines.push('  Recover later:     docker compose exec server cat /app/data/api-token');
    lines.push('  Rotate token:      docker volume rm local-ollama-api-token');
    lines.push('                     && docker compose up -d server');
  }

  lines.push(borderDouble);

  return lines.join('\n');
}
