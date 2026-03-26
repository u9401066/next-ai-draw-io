# MCP Document Model

## Why this exists

The current application has enough moving parts that an agent may otherwise act on the wrong in-memory state.

This document defines the intended MCP-facing document model so that:
- browser state is tied to a document session
- saves go to the correct file
- agents can read what humans changed

---

## Document session

Each open diagram is represented by a document session.

```ts
type DocSession = {
  docId: string
  filePath: string | null
  title: string
  currentRevision: number
  lastSavedRevision: number
  dirty: boolean
  currentXml: string
  savedXml: string
  activeTabId: string | null
  tabs: DocTab[]
  activeClients: string[]
  createdAt: number
  updatedAt: number
}
```

### Notes
- `filePath = null` means unsaved draft
- `savedXml` is the last persisted state
- `currentXml` is the latest collaborative state
- `dirty = currentRevision !== lastSavedRevision`

---

## Tabs

```ts
type DocTab = {
  tabId: string
  name: string
  xml: string
  revision: number
}
```

Tabs belong to a document session, not to anonymous process-global state.

---

## Revision events

Every edit should produce a revision event.

```ts
type RevisionEvent = {
  docId: string
  revision: number
  actor: 'human' | 'agent' | 'system'
  source: string
  timestamp: number
  summary?: string
  xml?: string
  semanticChanges?: SemanticChange[]
}
```

### Examples
- actor=`human`, source=`browser`
- actor=`agent`, source=`openclaw:architect`
- actor=`system`, source=`autosave`

---

## Semantic changes

These are optional but highly valuable.

```ts
type SemanticChange =
  | { kind: 'node_added'; id: string; label?: string; shape?: string }
  | { kind: 'node_deleted'; id: string; label?: string }
  | { kind: 'label_changed'; id: string; before: string; after: string }
  | { kind: 'edge_added'; id: string; source?: string; target?: string }
  | { kind: 'edge_deleted'; id: string }
  | { kind: 'style_changed'; id: string; field: string; before: string; after: string }
  | { kind: 'moved'; id: string }
```

If semantic extraction is not available yet, the system may temporarily fall back to revision snapshots + XML diff.

---

## MCP tool semantics

### `open_document(path)`
- opens existing file or creates draft binding intent
- returns `docId`, current metadata, and current revision

### `get_document(docId)`
- returns document metadata
- returns current xml and active tab info

### `apply_operations(docId, operations)`
- applies structured changes to the current doc session
- emits a new revision with actor=`agent`

### `get_human_changes(docId, sinceRevision)`
- returns revision events after `sinceRevision`
- prioritizes actor=`human`
- includes semantic summaries when available

### `save_document(docId)`
- writes current state to bound `filePath`
- updates `lastSavedRevision`
- clears dirty flag

### `save_as(docId, newPath)`
- rebinds document session to a new file path
- writes current state there

---

## Safety / correctness rules

1. **No ambiguous save target**
   - save must always know the bound file path

2. **No anonymous global current tab**
   - active tab belongs to a specific document session

3. **No silent overwrite of human edits**
   - agent changes should generate new revisions, not erase history

4. **No hidden state transitions**
   - browser save, agent patch, autosave, and tab changes should all be visible in revision history

---

## MVP acceptance criteria

A minimal acceptable implementation supports:

- open a document from a file path
- expose a stable `docId`
- edit through browser and agent on the same doc
- record revisions
- return human changes since a revision
- save to correct file

Once these work, richer features like checkpoints, comments, or review threads can be layered on top.