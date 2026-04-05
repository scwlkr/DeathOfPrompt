<div align="center">

```
          ______
       .-"      "-.
      /            \
     |              |
     |,  .-.  .-.  ,|
     | )(_x_/  \x_)( |
     |/     /\     \|
     (_     ^^     _)
      \__|IIIIII|__/
       | \IIIIII/ |
       \          /
        `--------`
```

# ☠️ Death of Prompt

**_Kill the prompt. Keep the conversation._**

A local-first prototype for replacing one-shot prompt engineering with an ongoing, persistent conversation — a soul, an ambition, and a memory that survive between sessions.

</div>

---

## 🩻 The Idea

Prompt engineering is dead because the frame is wrong. You should not be re-summoning an amnesiac every time you open a chat. You should be *continuing* a relationship with an agent that remembers who it is, what you want, and what was said last time you walked away.

**Death of Prompt (DOP)** is a local-first MVP built on that premise:

- 🧠 **SOUL** — the agent's identity, written once, evolved over time.
- 🎯 **AMBITION** — the agent's open tasks & goals.
- 📜 **Memory** — transcripts & topic files keep context lightweight and durable.

Everything runs locally against [Ollama](https://ollama.com). Nothing leaves your machine.

---

## 🪦 Current State

| Surface | Status |
|---|---|
| Web chat UI (Next.js + SQLite) | ✅ working |
| 3-layer memory retrieval (SOUL / topics / transcripts) | ✅ working |
| Onboarding flow (writes first SOUL) | ✅ working |
| AMBITION task list via `[[TASK: …]]` markers | ✅ working |
| System logs modal (JSONL, live-polled) | ✅ working |

See `CLAUDE.md` for the full architecture.

---

## ⚰️ Requirements

- **Node.js 20+**
- **[Ollama](https://ollama.com)** running locally with at least one model pulled (default: `llama3`)

```bash
# Make sure Ollama is running and has llama3
ollama pull llama3
ollama serve
```

---

## 🔮 Setup

```bash
# 1. Install dependencies
git clone https://github.com/scwlkr/DeathOfPrompt.git
cd DeathOfPrompt
npm install
cd dop-web && npm install

# 2. Configure environment
cp .env.example .env

# 3. Initialize the database
npx prisma db push
npx prisma generate

# 4. Launch the web UI
npm run dev     # → http://localhost:3000
```

Or from the repo root:

```bash
node bin/dop.js dashboard   # same thing, opens the browser
```

On first load you'll walk through the onboarding flow — this writes your agent's initial `SOUL.md`.

---

## 🕸️ Layout

```
/                    ← thin CLI wrapper (bin/dop.js)
└── dop-web/         ← the Next.js app (all real work lives here)
    ├── prisma/      ← SQLite schema
    ├── data/        ← SOUL, AMBITION, memory, workspace, logs, sqlite db
    │   ├── agents/<agentId>/SOUL.md
    │   ├── AMBITION.md
    │   ├── memory/topics/*.md + index.json
    │   ├── workspace/        ← files the agent saves via [[SAVE_FILE]]
    │   ├── logs/             ← JSONL system logs
    │   └── dop.db            ← SQLite (sessions + transcripts)
    └── src/
        ├── app/     ← Next.js routes (/api/chat, /api/onboarding, /api/ambition, /api/logs, …)
        └── lib/     ← dop-engine, memory-retrieval, ambition, workspace, logger
```

---

## 🧪 Dev Commands

All from `dop-web/`:

```bash
npm run dev             # Next dev server
npm run build           # production build
npm run lint            # eslint
npx vitest              # run tests
npx vitest run src/lib/memory-retrieval.test.ts   # single test
npx prisma db push      # apply schema to SQLite
npx prisma generate     # regen client after schema edit
```

---

## 📿 Design Notes

- `DOP_MVP_PLAN.md` — the original MVP spec
- `CLAUDE.md` — architecture reference for Claude Code (and humans)

---

<div align="center">

_The prompt is dead. Long live the conversation._

☠️

</div>
