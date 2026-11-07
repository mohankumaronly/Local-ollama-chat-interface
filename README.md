# Local Ollama Chat Interface

A persisted chat application using Ollama for local LLM inference, Express for the backend API, PostgreSQL for persistence, and React for the frontend. Works against local Ollama **or** a remote Ollama exposed through a Cloudflare Tunnel.

## Architecture

```
Host machine
├── Ollama (:11434) ──────────────────────┐
├── Cloudflare Tunnel ──────────┐          │
│                               │          │
│  Docker Compose               │          │
│  ├── web    (:8080)           │          │
│  │   └─ nginx serves React dist         │
│  │      + proxies /api/* ──────────────►server (:3000)
│  ├── server (:3000, internal) │          │
│  │   └─ Express + Drizzle     │          └─► host.docker.internal:11434
│  └── db     (:5433)           │
│      Postgres (pgdata volume) │
└── (tunnel exits to internet) ─┘
```

## Two ways to run

### Dev mode — hot reload, all native

```powershell
# Terminal 1 — Postgres in Docker
cd docker; docker compose up -d db

# Terminal 2 — backend
npm run dev:server

# Terminal 3 — frontend
npm run dev:web
```

Open `http://localhost:5173`. Both frontend and backend hot-reload on save. Vite proxies `/api/*` → `http://localhost:3000`.

### Prod mode — one command, one URL

```powershell
cd docker
docker compose up -d
```

Open `http://localhost:8080`. All three services run in Docker. No npm process needed.

- Frontend served by nginx (`web` service on port 8080)
- API calls proxied by nginx → `server:3000` (SSE-safe: `proxy_buffering off`)
- Postgres persisted in `pgdata` Docker volume
- Ollama on host, reached via `host.docker.internal:11434`

## First-time setup (both modes)

1. **Start the stack** (either mode above)
2. **Open the app** — an amber banner appears if no API token is configured
3. **Open Settings**, paste your **API token** (from `API_TOKEN=` in `apps/server/.env`), click **Save**
4. **Configure Ollama URL**: `http://localhost:11434` (local) or your Cloudflare Tunnel URL (remote) → click **Test** to verify → **Save**
5. Token and URL are stored in `localStorage` per browser — survives page reloads

## Generating a new API token

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes).Replace('+','-').Replace('/','_').Replace('=','')
```

Update `API_TOKEN` in **both** `apps/server/.env` (dev) and `docker/.env` (prod). They must match.

After updating:
- Dev: restart `npm run dev:server`
- Prod: `cd docker && docker compose up -d --force-recreate server`

## Cloudflare Tunnel

> **Important**: always point the tunnel at port **8080** (nginx), not 3000 (backend) or 11434 (Ollama).
> Port 8080 serves the full app UI and enforces token auth on every `/api/*` call.

### Ephemeral tunnel (random URL per session)

```powershell
cloudflared tunnel --url http://localhost:8080
```

Copy the printed `https://...trycloudflare.com` URL. Open it on any device, paste your token in Settings, done.

### Named tunnel (stable URL)

Requires a Cloudflare-managed domain. Set up in Cloudflare Zero Trust → Tunnels → Create.
Point ingress: `service: http://localhost:8080`.

**Future upgrade**: add Cloudflare Access in front of the named tunnel for login-gated access (Google/email). No code changes needed — purely Cloudflare dashboard config.

## Security

| Layer | Mechanism |
|---|---|
| API auth | `Authorization: Bearer <token>` on every route except `/api/v1/health` |
| Token storage | Browser `localStorage` — per device, never transmitted in URL |
| SSRF protection | `OLLAMA_ALLOWED_HOSTS` allowlist — blocks internal IPs, metadata endpoints |
| Path locking | Backend only calls `/api/chat` and `/api/tags` on target Ollama |
| Tunnel exposure | nginx (8080) only — raw API (3000) and Ollama (11434) are not exposed |

## Ollama

Ollama runs **on the host**, not in Docker. GPU passthrough and model caching are simpler this way.

```powershell
ollama serve          # start Ollama
ollama pull qwen2.5:7b    # pull a model
ollama list           # list installed models
```

The `server` container reaches host Ollama via `host.docker.internal:11434` (configured via `extra_hosts` in `compose.yaml`).

## Database migrations

Always run from the **host** (not from inside a container), using the host-mapped port 5433:

```powershell
# After editing apps/server/src/db/schema.ts:
npm run db:generate -w apps/server
npm run db:migrate -w apps/server
```

`apps/server/.env` uses `localhost:5433`; inside Docker, `server` uses `db:5432`.

## Rebuilding after source changes

```powershell
cd docker

# After changing backend source:
docker compose build server && docker compose up -d server

# After changing frontend source:
docker compose build web && docker compose up -d web

# After changing packages/shared (affects both):
docker compose build server web && docker compose up -d
```

## Backup

```powershell
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
docker run --rm `
  -v local-ollama-pgdata:/data:ro `
  -v "${PWD}\backups:/backup" `
  alpine `
  sh -c "cd /data && tar czf /backup/pgdata-$stamp.tar.gz ."
```

## Data reset ⚠️

**Destroys all chats and messages:**

```powershell
cd docker
docker compose down
docker volume rm local-ollama-pgdata
docker compose up -d
# wait for server healthy, then:
npm run db:migrate -w apps/server
```

## Monorepo structure

```
apps/
  server/           Express + Drizzle ORM + Ollama client
    src/
      config/       env validation (Zod)
      db/           schema + Drizzle client
      lib/          logger, graceful shutdown
      middleware/   auth (Bearer token)
      modules/
        chat/       chat controller + service + routes
        health/     health check route
        ollama/     ollama client + SSRF allowlist + test route
    Dockerfile      multi-stage: node:22-alpine build → alpine runtime
  web/              React + Vite + Tailwind CSS
    src/
      components/   ChatWindow, Composer, Sidebar, SettingsModal, ...
      hooks/        useChat, useConnection, useTheme
      lib/          api.ts (fetch + auth headers), ollama.ts
    Dockerfile      multi-stage: node:22-alpine build → nginx:1.27-alpine serve
packages/
  shared/           TypeScript types shared by server and web
docker/
  compose.yaml      db + server + web services
  nginx.conf        static serve + /api/* proxy (SSE-safe)
  .env              POSTGRES_*, API_TOKEN (git-ignored)
  .env.example      template with placeholders
```

## Environment variables

### `apps/server/.env` (dev mode — git-ignored)

```env
PORT=3000
DATABASE_URL=postgresql://ollama:ollama_secret@localhost:5433/ollama_chat
OLLAMA_URL=http://localhost:11434
OLLAMA_ALLOWED_HOSTS=*.trycloudflare.com,localhost,127.0.0.1,host.docker.internal
API_TOKEN=your-secret-token-here
NODE_ENV=development
```

### `docker/.env` (prod mode — git-ignored)

```env
POSTGRES_USER=ollama
POSTGRES_PASSWORD=ollama_secret
POSTGRES_DB=ollama_chat
API_TOKEN=your-secret-token-here   # must match apps/server/.env
```

## Known limitations (v1)

- **Single user** — token is a shared secret; no per-user accounts
- **Shared chat history** — all devices/browsers see the same chats (same DB)
- **Model not persisted per chat** — switching models mid-chat mixes response styles
- **No rate limiting** — add `express-rate-limit` before exposing to untrusted users
- **Chunk size warning** — Vite warns about bundle >500 kB; add dynamic imports in v2 if startup time matters

## v1 feature set

- Monorepo scaffold (npm workspaces)
- Postgres persistence with Drizzle ORM + migrations
- Ollama proxy with SSE streaming (progressive token rendering)
- Full chat history UI with sidebar
- Docker deployment (db + server + web, one `docker compose up -d`)
- nginx serving React SPA + proxying `/api/*` with SSE support
- Shared TypeScript types (`packages/shared`)
- Bearer token auth (Phase 5C) — required on every API route
- Pino structured logging + graceful shutdown + `X-Request-Id` headers
- Client-supplied Ollama URL with SSRF allowlist (Phase 6)
- Token stored in `localStorage`, sent as `Authorization` header (Phase 5D)
- First-run banner when no token configured
- One-command full-stack deployment + Cloudflare Tunnel support
