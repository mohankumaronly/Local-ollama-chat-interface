# Local Ollama Chat Interface

A persisted chat application using Ollama for local LLM inference, Express for the backend API, PostgreSQL for persistence, and React for the frontend.

## Architecture

```
┌────────────────────────────────────────┐
│  Host machine                          │
│                                        │
│  ┌──────────┐    ┌──────────────────┐  │
│  │  Ollama  │    │  React (Vite)    │  │
│  │  :11434  │    │  :5173 (dev)     │  │
│  └────┬─────┘    └────────┬─────────┘  │
│       │ host.docker.int.  │ /api proxy │
│  ┌────▼──────────────────▼─────────┐  │
│  │         Docker Compose          │  │
│  │  ┌────────────┐ ┌────────────┐  │  │
│  │  │  server    │ │    db      │  │  │
│  │  │  :3000     ├─►  :5432    │  │  │
│  │  │ (Express)  │ │ (Postgres) │  │  │
│  │  └────────────┘ └────────────┘  │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Security — API Token Auth

All routes except `GET /api/v1/health` require a Bearer token:

```
Authorization: Bearer <API_TOKEN>
```

- In **dev mode**, the Vite proxy reads the token from `apps/server/.env` and injects the header automatically — no frontend code changes needed.
- In **prod mode** (Docker), the token comes from `docker/.env` → compose `environment:` block.
- `/api/v1/health` is intentionally public so Docker healthchecks and tunnel monitors work without credentials.

**To rotate the token**: update `API_TOKEN` in both `apps/server/.env` and `docker/.env`, then restart the backend.

## Quick Start — Dev Mode (Recommended for iteration)

**Terminal 1** — Start Postgres only:
```powershell
cd docker
docker-compose up -d db
```

**Terminal 2** — Start backend (native Node, hot-reload):
```powershell
npm run dev:server
```

**Terminal 3** — Start frontend (Vite, hot-reload):
```powershell
npm run dev:web
```

Open: http://localhost:5173

`apps/server/.env` uses `DATABASE_URL=...@localhost:5433/...` (host-mapped port).  
Vite proxies `/api/*` → `http://localhost:3000`.

---

## Development workflow

### Option A — Dev mode (fast iteration, native Node)

Best for active development. Only Postgres runs in Docker.

```powershell
# Terminal 1 — Postgres only
cd docker
docker-compose up -d db

# Terminal 2 — Backend (native, hot-reload, port 3000)
npm run dev:server

# Terminal 3 — Frontend (native, hot-reload, port 5173)
npm run dev:web
```

`apps/server/.env` controls backend env vars in this mode.

### Option B — Prod mode (all backend in Docker)

For production or end-to-end testing. Both Postgres and Express run in containers.

```powershell
cd docker
docker-compose up -d
```

- Backend API: `http://localhost:3000`
- DB (host access): `127.0.0.1:5433`
- Ollama: still on host (`:11434`); container reaches it via `host.docker.internal`

For the frontend in prod mode, build once and serve:
```powershell
npm run build -w apps/web
npm run preview -w apps/web
```

---

## Migrations

Always run migrations from the **dev machine** (not inside the container).  
The `DATABASE_URL` in `apps/server/.env` points to the host-mapped port `5433`.

```powershell
# After editing apps/server/src/db/schema.ts:
npm run db:generate -w apps/server   # generates SQL migration files
npm run db:migrate -w apps/server    # applies them to the containerised DB
```

---

## Rebuilding the server container

After changing server source code, rebuild the image:

```powershell
cd docker
docker-compose build server
docker-compose up -d server
```

---

## Data reset (⚠ destroys all chats)

```powershell
cd docker
docker-compose down
docker volume rm local-ollama-pgdata
docker-compose up -d
npm run db:migrate -w apps/server   # re-apply schema
```

---

## Monorepo structure

```
├── apps/
│   ├── server/          # Express + Drizzle ORM backend
│   │   ├── src/
│   │   ├── Dockerfile   # multi-stage build (node:22-alpine)
│   │   └── .env         # dev-only env vars (not committed)
│   └── web/             # React + Vite + Tailwind frontend
├── docker/
│   ├── compose.yaml     # Postgres + Express services
│   └── .env             # DB credentials for compose
├── packages/
│   └── shared/          # Shared types (future)
└── package.json         # npm workspaces root
```

---

## Environment variables

### `apps/server/.env` (dev mode — git-ignored)
```
PORT=3000
DATABASE_URL=postgresql://ollama:ollama_secret@localhost:5433/ollama_chat
OLLAMA_URL=http://localhost:11434
```

### `docker/.env` (compose credentials)
```
POSTGRES_USER=ollama
POSTGRES_PASSWORD=ollama_secret
POSTGRES_DB=ollama_chat
```

The containerised server gets its env from `docker/compose.yaml`'s `environment:` block directly — `DATABASE_URL` points to `db:5432` (service name, internal port), and `OLLAMA_URL` points to `host.docker.internal:11434`.
