# OpenClaw Target Architecture

## Goal

Turn `next-ai-draw-io` into an **OpenClaw-compatible, MCP-first, collaborative draw.io canvas**.

This system should allow:
- Eric to open and edit diagrams from a browser
- agents to control the same diagrams through MCP
- human edits to become visible to agents as revisions/change summaries
- saves to always go back to the correct workspace file

---

## Core principle

The system is centered on a **document manager**, not an in-app chat route.

```text
Browser UI
  <-> Realtime Sync Layer
  <-> Document Manager
  <-> File Store (workspace paths)
  <-> MCP Server
  <-> OpenClaw / Copilot / other MCP clients
```

---

## Main components

### 1. Browser / Draw.io Canvas
Responsibilities:
- render the current document
- allow manual editing
- emit revision snapshots and save events
- optionally emit semantic change summaries

### 2. Realtime Sync Layer
Responsibilities:
- push remote agent updates into the browser
- notify browser about pending operations
- deliver browser-originated changes back to the document manager

Candidate implementation:
- keep current WebSocket approach, but make document sessions explicit

### 3. Document Manager
Responsibilities:
- open documents from file paths
- assign stable `docId`
- track current XML and saved XML
- manage revision history
- track dirty state
- resolve save targets
- provide human change summaries to agents

This should be the new architectural center.

### 4. File Store
Responsibilities:
- persist `.drawio` / `.xml` files to the correct workspace path
- support save / save-as / export
- provide recoverable file metadata

### 5. MCP Server
Responsibilities:
- expose stable agent-facing tools
- operate on documents intentionally, not on ambiguous global app state
- remain usable from OpenClaw via MCP adapter

---

## Required MCP surface

Minimum viable tools:

- `open_document(path)`
- `get_document(docId)`
- `list_documents()`
- `list_tabs(docId)`
- `create_tab(docId, name)`
- `switch_tab(docId, tabId)`
- `apply_operations(docId, operations)`
- `get_human_changes(docId, sinceRevision)`
- `get_revision_history(docId)`
- `save_document(docId)`
- `save_as(docId, path)`
- `export_document(docId, format)`

---

## Desired collaboration loop

```text
1. Agent opens a file-backed document session
2. Browser shows the canvas for that docId
3. Agent applies structured operations
4. Eric edits the diagram manually
5. Browser emits revision + summary
6. Agent asks what changed since last revision
7. Agent applies next patch
8. Document is saved to the bound file path
```

---

## Architectural decisions

### A. MCP-first, chat-optional
The built-in app chat may remain as an optional UX layer, but must not define the core runtime model.

### B. File-backed sessions
Every meaningful document interaction must be bound to a concrete file path or explicit unsaved draft state.

### C. Revision-aware collaboration
Human edits and agent edits must produce revision history that agents can inspect.

### D. OpenClaw-compatible by default
The MCP contract should be stable and tool-oriented so OpenClaw can use it with minimal glue.

---

## Near-term refactor phases

### Phase 0 — Reframe
- replace README
- define target architecture
- define document/session model

### Phase 1 — Minimal document loop
- explicit `docId`
- open/read/save document
- apply operations to a specific document
- return human changes since revision

### Phase 2 — Runtime cleanup
- remove ambiguous global state
- consolidate API route vs ws-server responsibilities
- tighten persistence and save semantics

### Phase 3 — OpenClaw validation
- wire through MCP adapter
- test with real agent-driven edit loops
- validate human-agent co-editing on one file

---

## Success test

A real success case looks like this:

1. Eric asks an OpenClaw agent to draw an architecture diagram.
2. The agent opens `/some/workspace/path/arch.drawio`.
3. The browser displays it immediately.
4. Eric manually changes labels/layout.
5. The agent can query those changes and respond intelligently.
6. Save writes back to `/some/workspace/path/arch.drawio`.

If this works reliably, the architecture is correct.