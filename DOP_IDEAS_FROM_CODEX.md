  # Death of Prompt MVP Prototype Plan

  ## Summary

  Build a local-first, web-first MVP that proves the core DOP loop: create an agent
  through a guided onboarding conversation, persist that identity as SOUL.md, chat
  with the agent through a local UI backed by Ollama, and keep context lightweight
  through a 3-layer memory system. Telegram is deferred until the core loop is stable.

  Chosen defaults:

  - Scope: web-first core
  - Persistence: files + SQLite
  - Onboarding: guided conversation that writes SOUL.md

  ## Key Changes

  - Bootstrap a single local app with a fast full-stack TypeScript stack:
      - Next.js App Router for the local web UI and API routes
      - SQLite for transcripts, searchable message history, memory index entries, and
        model/session metadata
      - filesystem storage for SOUL.md, topic memory files, and operational logs
      - Ollama integration behind a provider abstraction so models can be switched per
        session
  - Implement the core product flow:
      - First-run onboarding chat that asks structured questions about persona, goals,
        tone, constraints, and working style
      - SOUL.md generator and editor, stored under a predictable local data directory
      - chat UI with streaming responses, session list, model switcher, and visible
        memory/debug state
      - orchestration layer that assembles prompt context from SOUL.md, a compact
        index, retrieved topic files, and recent conversation window
  - Implement the 3-layer memory system:
      - Layer 1: always-loaded compact index file with topic summaries, tags, recency,
        and file pointers
      - Layer 2: topic memory markdown files holding reusable knowledge slices
      - Layer 3: full transcripts stored in SQLite with lightweight search and
        retrieval APIs
      - retrieval pipeline that searches transcripts and topic metadata, selects
        relevant memory, and injects only selected slices into active context
  - Add prototype-grade observability and testability:
      - append-only structured logs for requests, retrieval decisions, tool/model
        failures, and latency
      - error codes surfaced in API responses and UI status panels
      - TDD-oriented unit and integration coverage around onboarding, memory indexing,
        retrieval selection, and Ollama adapter behavior
  - Defer Telegram implementation, but keep the architecture ready:
      - define a transport-agnostic conversation service so Telegram can later call
        the same session/orchestration APIs
      - keep client-specific concerns out of the core agent runtime

  ## Public Interfaces / Types

  - AgentProfile: onboarding-derived agent identity used to render and regenerate
    SOUL.md
  - ChatSession: session metadata including active model, timestamps, and linked agent
  - TranscriptEntry: persisted user/assistant/system message with searchable text and
    optional retrieval tags
  - MemoryIndexEntry: compact pointer record with topic title, tags, summary, source
    path, and freshness markers
  - RetrievedMemory: normalized shape for memory slices injected into context
  - HTTP/API surface:
      - onboarding session create / advance / finalize
      - chat send / stream reply
      - model list / active model update
      - memory search / retrieved-context inspection
      - transcript list / transcript detail
  - Filesystem conventions:
      - data/agents/<agent-id>/SOUL.md
      - data/memory/index.json
      - data/memory/topics/*.md
      - data/logs/*.jsonl

  ## Test Plan

  - First-run flow creates an onboarding session, collects required fields, and writes
    a valid SOUL.md
  - Chat request with no prior memory uses SOUL.md plus recent turns only
  - Chat request with relevant prior knowledge retrieves matching topic/transcript
    slices and excludes unrelated memory
  - Model switching changes the Ollama target without corrupting session history
  - Transcript search returns matching historical content without loading full history
    into active context
  - Memory index rebuild reflects new or updated topic files
  - Missing Ollama model, timeout, and malformed response paths return stable error
    codes and UI-safe failures
  - Local app can start cleanly on an empty repo state and create all required runtime
    storage on first run

  ## Assumptions

  - The goal is a working local prototype optimized for proving the interaction model,
    not production hardening.
  - Telegram is intentionally postponed from the first implementation slice to avoid
    diluting the core validation loop.
  - SQLite is sufficient for MVP transcript search and retrieval metadata; no remote
    database is needed.
  - The first implementation should prioritize one-agent-at-a-time local usage, though
    the data model should not block later multi-agent support.
  - Because this session is in Plan Mode, I am not executing edits in this turn; this
    is the decision-complete implementation spec to hand directly into a one-shot
    build pass.