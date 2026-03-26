# next-ai-draw-io

> **MCP-first collaborative draw.io canvas for OpenClaw, Copilot, and human-in-the-loop architecture work.**

---

## What this project is now

`next-ai-draw-io` is no longer positioned as a generic “web chat app that happens to draw diagrams”.

Its new center of gravity is:

- **draw.io canvas as the primary UI**
- **MCP as the primary control plane for agents**
- **human + agent collaborative editing on the same document**
- **OpenClaw-compatible integration as a first-class goal**
- **file-backed document sessions that always save to the correct workspace path**

In short:

> This project should become a reliable shared architecture canvas where Eric, OpenClaw agents, Copilot, and other MCP clients can work on the same diagram intentionally — not a provider-heavy chatbot with a diagram side effect.

---

## Core use case

A typical workflow should look like this:

1. Eric asks an agent to create or refine an architecture diagram.
2. The agent opens a real document session bound to a real file path.
3. The browser shows the draw.io canvas for that document.
4. Eric edits the diagram manually in the web UI.
5. The system records those edits as revisions and change summaries.
6. The agent reads the human changes via MCP.
7. The agent applies the next round of changes.
8. The document saves back to the correct file in the workspace.

This is the loop we are optimizing for.

---

## Product direction

### Primary goals

- **MCP-first**: agents should control the canvas through stable MCP tools.
- **Collaborative**: human edits and agent edits must coexist cleanly.
- **File-correct**: every open canvas must map to a specific file path or explicit save target.
- **OpenClaw-ready**: easy to expose through `openclaw-mcp-adapter` and use from OpenClaw agents.
- **Realtime**: browser UI should reflect remote agent changes quickly and safely.
- **Inspectable**: agents must be able to ask “what changed since I last looked?”

### Non-goals

These may still exist, but they are no longer the architectural center:

- provider showcase UI
- chat-first interaction model
- app-internal LLM orchestration as the main product identity
- accumulating many AI providers for their own sake

---

## Target architecture

```text
Browser (draw.io canvas)
  <-> Next.js / Web UI
  <-> Realtime sync layer (WS/SSE)
  <-> Document manager
  <-> Workspace files (.drawio / .xml)
  <-> MCP server
  <-> OpenClaw / Copilot / other MCP clients
```

### Key design principle

The **document manager** is the heart of the system.

Not the chat route.
Not the model selector.
Not the provider registry.

The document manager owns:

- `docId`
- `filePath`
- revision history
- dirty/saved state
- current XML
- base XML
- active clients
- change summaries

If this layer is correct, everything else becomes composable.

---

## Document session model

Every editing session should be bound to a concrete document.

### Required concepts

- `open_document(path)`
- `get_document(docId)`
- `save_document(docId)`
- `save_as(docId, newPath)`
- `get_revision_history(docId)`
- `diff_revisions(docId, fromRev, toRev)`
- `get_human_changes(docId, sinceRev)`
- `apply_operations(docId, operations)`

### Why this matters

Without a document session model, remote collaboration becomes fragile:

- the browser may show the wrong file
- an agent may save to the wrong location
- human edits become invisible to the agent
- restart/reconnect behavior becomes ambiguous

With a document session model, we can guarantee:

- the correct file is open
- saves go to the intended path
- humans and agents can diff revisions
- UI state can be reconstructed after reconnect

---

## Human-agent collaboration model

We want **shared editing**, not “agent overwrites human work”.

### Human side

The browser should emit:

- revision snapshots
- optional semantic change summaries
- tab/document context
- save events
- dirty state

### Agent side

The MCP layer should support:

- reading current document state
- reading changes since a known revision
- applying structured operations
- saving/exporting deliberately
- asking for summaries instead of reparsing the whole XML every time

### Ideal loop

```text
Agent creates diagram
-> Human tweaks layout / labels / grouping
-> Browser records revision + summary
-> Agent asks what changed
-> Agent applies next patch
-> Human reviews
-> Save to correct file
```

---

## MCP-first philosophy

This project should work well with:

- **OpenClaw**
- **GitHub Copilot MCP clients**
- **Claude Desktop / Cursor / VS Code MCP clients**
- future internal tooling that only needs a stable MCP contract

### MCP is not a side feature

MCP is the main automation interface.

That means the MCP server should expose stable, intention-revealing tools such as:

- `open_document`
- `list_documents` / `list_tabs`
- `read_document`
- `get_human_changes`
- `apply_operations`
- `save_document`
- `export_document`
- `create_tab`
- `switch_tab`

This is more important than adding more provider-specific app chat features.

---

## OpenClaw integration goal

This project is being shaped to become **OpenClaw-usable**, not merely “compatible in theory”.

### Desired end state

An OpenClaw agent should be able to:

1. open a real diagram document in the workspace
2. make structured edits through MCP
3. detect what Eric changed manually in the browser
4. continue editing based on those changes
5. save/export the final diagram cleanly

### Why OpenClaw matters here

OpenClaw already provides:

- multi-agent orchestration
- channel/messaging integration
- memory + session context
- MCP adapter integration
- browser/canvas operational tooling

This project fills a missing piece:

> a collaborative diagram workspace that agents can manipulate intentionally.

---

## What stays, what changes

### Likely to stay

- draw.io embed and web canvas
- realtime sync layer
- MCP server concept
- multi-tab support
- export capability
- history/checkpoint ideas

### Likely to be reduced or made optional

- app-internal chat as the primary interaction model
- large provider-specific configuration surface in the UI
- coupling product identity to built-in model selection

### Likely to be strengthened

- document/file identity
- revision tracking
- human change summaries
- save correctness
- OpenClaw integration path
- operational simplicity
- maintainability and i18n documentation

---

## Current technical debt we expect to address

- chat-centric architecture still dominates too much of the project shape
- document state appears split across UI/API/runtime concerns
- process-memory state needs stronger persistence semantics
- MCP generations / integration approaches need consolidation
- docs and actual runtime architecture may drift from each other

These are normal for an evolving fork; the goal is not to shame the current codebase, but to deliberately re-center it.

---

## Refactor plan (high level)

### Phase 0 — Reframe
- rewrite README and architecture intent
- define the document session model
- identify which existing pieces are still foundational vs legacy

### Phase 1 — Minimal MCP-first loop
Implement and validate:
- `open_document(path)`
- `get_document(docId)`
- `apply_operations(docId, ops)`
- `get_human_changes(docId, sinceRevision)`
- `save_document(docId)`

### Phase 2 — Browser/document correctness
- robust file binding
- revision tracking
- dirty/saved state
- reconnect/resume behavior

### Phase 3 — OpenClaw usage
- connect via MCP adapter
- document example flows for OpenClaw agents
- validate real human-agent iteration loops

### Phase 4 — Higher-level collaboration
- checkpoint / rollback ergonomics
- semantic diff summaries
- comments / annotations / review workflows
- richer multi-agent editing protocols

---

## Success criteria

We will consider the new direction successful when:

- Eric can open a diagram from a real workspace path in the browser
- an OpenClaw agent can edit that diagram via MCP
- Eric can manually modify the diagram in the browser
- the agent can query what changed
- the agent can apply a second round of updates intentionally
- saving reliably writes back to the correct file

If these work, the project is useful.
If not, all extra provider/chat features are secondary.

---

## Development stance

This repository may have started as a fork, but the direction from here is intentional:

> not “keep patching a generic AI diagram app”,
> but “evolve it into a serious collaborative architecture canvas for agent workflows”.

That means we will prefer:

- clear system boundaries
- stable MCP contracts
- file correctness over convenience hacks
- agent usability over provider sprawl
- operational clarity over feature count

---

## For maintainers

When evaluating a change, ask:

1. Does this improve the human-agent collaboration loop?
2. Does this make document identity or save semantics clearer?
3. Does this help an MCP client work more reliably?
4. Does this reduce coupling to a specific in-app chat/provider stack?
5. Does this make OpenClaw integration easier?

If not, it may be a lower-priority enhancement.

---

## Status

This repo is currently in **architectural transition** toward the model above.

The immediate next step is not “add more providers”.
It is:

> **make the document session + MCP editing loop rock solid.**

Once that is stable, everything else becomes much easier to build.
