import { createHash } from 'node:crypto';

export interface BannerInput {
  publicUrl: string;
  ollamaUrl: string;
  token: string;
  tokenSource: 'env' | 'file' | 'generated';
  forceDisplay: boolean;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const useColor =
  process.stdout.isTTY &&
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb';

const c = (code: number, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);

const style = {
  dim:     (s: string) => c(2, s),
  bold:    (s: string) => c(1, s),
  green:   (s: string) => c(32, s),
  cyan:    (s: string) => c(36, s),
  yellow:  (s: string) => c(33, s),
  magenta: (s: string) => c(35, s),
  gray:    (s: string) => c(90, s),
  bgGreen: (s: string) => c(42, s),
  bgCyan:  (s: string) => c(46, s),
  bgMag:   (s: string) => c(45, s),
};

// ─── Terminal width ───────────────────────────────────────────────────────────

function termWidth(): number {
  const cols = process.stdout.columns;
  if (!cols || !Number.isFinite(cols)) return 84;
  return Math.min(Math.max(cols, 64), 100);
}

// ─── Visible-length + centering helpers ──────────────────────────────────────

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
const visibleLen = (s: string) => stripAnsi(s).length;

/** Pad a single-line string so it appears centered across `width` cols. */
const center = (s: string, width: number): string => {
  const pad = Math.max(0, Math.floor((width - visibleLen(s)) / 2));
  return ' '.repeat(pad) + s;
};

// ─── Box primitives (inner-width aware) ──────────────────────────────────────

const BOX_W = 62;                 // inner content width for the framed block
const PAD = 3;                    // left padding inside the frame

function row(content: string, opts: { pad?: number } = {}): string {
  const pad = opts.pad ?? PAD;
  const inner = ' '.repeat(pad) + content;
  const trailing = Math.max(0, BOX_W - visibleLen(inner));
  return style.gray('│') + inner + ' '.repeat(trailing) + style.gray('│');
}

function emptyRow(): string {
  return style.gray('│') + ' '.repeat(BOX_W) + style.gray('│');
}

function divider(): string {
  return style.gray('├' + '─'.repeat(BOX_W) + '┤');
}

// ─── Token fingerprint ────────────────────────────────────────────────────────

export function tokenFingerprint(token: string): string {
  const hash = createHash('sha256').update(token).digest('hex').slice(0, 8);
  return `${hash}… (${token.length} chars)`;
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export function renderBanner(input: BannerInput): string {
  const W = termWidth();
  const showFullToken =
    input.tokenSource === 'generated' || input.forceDisplay;

  const out: string[] = [];

  // ── Top breathing room ───────────────────────────────────────────────────
  out.push('');
  out.push('');

  // ── Hero header (centered, no frame) ─────────────────────────────────────
  out.push(center(style.bold(style.cyan('🦙  L O C A L   O L L A M A')), W));
  out.push(center(style.dim('chat interface · self-hosted · private'), W));
  out.push('');
  out.push(center(style.bgGreen(style.bold('  ✅  READY  ')), W));
  out.push('');
  out.push('');

  // ── Framed body ──────────────────────────────────────────────────────────
  const frame: string[] = [];

  frame.push(style.cyan('╭' + '─'.repeat(BOX_W) + '╮'));

  // Connection section
  frame.push(row(`${style.bold('🌐  ACCESS')}`));
  frame.push(emptyRow());
  frame.push(row(`  ${style.dim('Open in browser')}`));
  frame.push(row(`  ${style.cyan(style.bold(input.publicUrl))}`));
  frame.push(emptyRow());
  frame.push(row(`  ${style.dim('Ollama backend')}`));
  frame.push(row(`  ${style.cyan(input.ollamaUrl)}`));

  frame.push(divider());

  // Token section
  frame.push(row(`${style.bold('🔑  API TOKEN')}`));
  frame.push(emptyRow());

  if (showFullToken) {
    frame.push(row(`  ${style.green(style.bold(input.token))}`));
    frame.push(emptyRow());
    if (input.forceDisplay) {
      frame.push(row(`  ${style.dim('forced display (API_TOKEN_FORCE_DISPLAY=true)')}`));
    } else {
      frame.push(row(`  ${style.dim('👉 paste this into Settings on first load')}`));
    }
  } else {
    frame.push(row(`  ${style.gray(tokenFingerprint(input.token))}`));
    frame.push(emptyRow());
    frame.push(row(`  ${style.dim('full token was shown on first boot')}`));
  }

  frame.push(divider());

  // Ops section
  frame.push(row(`${style.bold('🛠   RECOVERY & ROTATION')}`));
  frame.push(emptyRow());
  frame.push(
    row(`  ${style.dim('📄 Recover token')}`),
  );
  frame.push(
    row(`     ${style.cyan('docker compose exec server cat /app/data/api-token')}`),
  );
  frame.push(emptyRow());
  frame.push(row(`  ${style.dim('🔄 Rotate token')}`));
  frame.push(
    row(`     ${style.cyan('docker volume rm local-ollama-api-token')}`),
  );
  frame.push(
    row(`     ${style.cyan('&& docker compose up -d server')}`),
  );
  frame.push(emptyRow());

  frame.push(style.cyan('╰' + '─'.repeat(BOX_W) + '╯'));

  // Center every frame row within terminal width
  for (const line of frame) out.push(center(line, W));

  // ── Footer ───────────────────────────────────────────────────────────────
  out.push('');
  out.push(
    center(
      style.dim('💾 token persisted at ') +
        style.gray('/app/data/api-token') +
        style.dim(' · volume ') +
        style.gray('local-ollama-api-token'),
      W,
    ),
  );
  out.push(center(style.dim('press Ctrl+C to stop · logs: docker compose logs -f server'), W));
  out.push('');
  out.push('');

  return out.join('\n');
}