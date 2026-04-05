# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Death of Prompt (DOP) is a local-first prototype for replacing prompt-engineering with ongoing conversation with a persistent agent. It runs against a local Ollama instance via a Next.js web UI. See `DOP_MVP_PLAN.md` for the design intent.

## Repository Layout

This is a two-package repo. Do not conflate them:

- `/` (root) — thin `dop` CLI wrapper (CommonJS, yargs) whose only real command is `dop dashboard`, which `cd`s into `dop-web` and runs `npm run dev`. See `bin/dop.js`.
- `/dop-web` — the actual application: Next.js 14 App Router + Prisma/SQLite + Ollama. **All real work happens here.** When running npm scripts, assume cwd is `dop-web/` unless stated otherwise.

## Common Commands

All of these run from `dop-web/`:

```bash
npm run dev      # Next.js dev server on :3000
npm run build    # next build
npm run start    # next start (after build)
npm run lint     # next lint (eslint-config-next)
npx vitest       # run all tests (vitest, node environment)
npx vitest run src/lib/memory-retrieval.test.ts   # single test file
npx prisma db push           # sync schema to dev.db
npx prisma generate          # regenerate prisma client after schema edits
```

From the repo root you can also launch the UI via `node bin/dop.js dashboard` (spawns `npm run dev` in `dop-web/` and opens the browser).

## Environment & External Dependencies

- **Ollama must be running locally** for chat to work. Default model is `llama3`; the UI fetches available models via `/api/models`.
- `dop-web/.env` sets `DATABASE_URL="file:./data/dop.db"` (SQLite, relative to `dop-web/`). Prisma config is in `dop-web/prisma.config.ts` and uses dotenv.

## Architecture

### Chat path

`dop-web/src/app/api/chat/route.ts` → `src/lib/dop-engine.ts::processChat` → `streamText` from the `ai` SDK with `ai-sdk-ollama`. Persists to SQLite via Prisma (`ChatSession`, `TranscriptEntry`). Returns a UI message stream consumed by `@ai-sdk/react`'s `useChat` on `src/app/page.tsx`.

`processChat` also scans assistant replies for two marker types before persisting:
- `[[TASK: <text> |when:<ISO>]]` — appended to `AMBITION.md` via `src/lib/ambition.ts` and stripped from the stored reply.
- `[[SAVE_FILE: <name>]]…[[/SAVE_FILE]]` — written to `dop-web/data/workspace/` via `src/lib/workspace.ts` and stripped from the stored reply.

### 3-layer memory system

`src/lib/memory-retrieval.ts::retrieveContext` assembles context from three layers for each chat turn:

1. **SOUL** — `dop-web/data/agents/<agentId>/SOUL.md` (always loaded if present). Written by the onboarding flow (`src/app/api/onboarding/route.ts`) on first run.
2. **Topic files** — `dop-web/data/memory/topics/*.md`, selected by naive keyword match against `dop-web/data/memory/index.json` (tags + title contains query term). Use `saveTopic()` to write both the markdown file and the index entry.
3. **Transcripts** — last 10 `TranscriptEntry` rows from SQLite for the current session (Prisma, newest-10 then reversed).

All retrievals go through `logInfo('context_retrieved', …)` in `src/lib/logger.ts`, which appends JSONL to `dop-web/data/logs/dop-<date>.jsonl`. The UI's "View System Logs" modal (`src/app/page.tsx`) polls `/api/logs` every 3s.

### AMBITION task list

`src/lib/ambition.ts` owns `dop-web/data/AMBITION.md` — a markdown checkbox list. Tasks support optional `|when:<ISO>` and `|recur:<spec>` suffixes. The `/api/ambition` route exposes GET/POST/PATCH/DELETE for the UI's task panel; `dueTasks()` filters by a 30-minute window for reminder surfacing.

### Prisma / database

Schema: `dop-web/prisma/schema.prisma` — SQLite, two models: `ChatSession` and `TranscriptEntry`. Prisma client is a singleton (`src/lib/db.ts`) to avoid connection exhaustion in Next.js dev hot-reload. The topic index lives in `data/memory/index.json` on disk, not in the DB.

### Session flow

`src/app/page.tsx` generates a fresh `sessionId` (UUID) on mount after confirming `/api/onboarding?agentId=default` reports the SOUL exists. It passes `{sessionId, model}` in the request body via `DefaultChatTransport`. `processChat` auto-creates the `ChatSession` row on first message if it doesn't exist — so client-side UUIDs are trusted.

## Other Notes

- `package.json` at the repo root declares `"type": "commonjs"`; `dop-web/` is an ES module / Next.js project. Don't copy tooling config between them.
- All agent state (SOUL, AMBITION, memory, workspace, logs, sqlite db) lives under `dop-web/data/`. The repo root holds only the CLI wrapper and top-level docs.
