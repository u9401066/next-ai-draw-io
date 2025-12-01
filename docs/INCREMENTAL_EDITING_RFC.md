# RFC: Incremental Diagram Editing

## Problem Statement

目前的架構每次都傳遞完整 XML：

```
User Edit in Browser → Full XML → Agent
Agent Response → Full XML → Browser
```

**問題：**
1. 大圖表 = 大量 token ($$$ 成本)
2. 人類編輯細節容易被 AI 覆蓋
3. 無法精準追蹤「誰改了什麼」
4. 合併衝突難以處理

## Proposed Solutions

### 方案 A: Operation-Based Sync (OT/CRDT style)

類似 Google Docs 的協作模式：

```
┌─────────────┐                    ┌─────────────┐
│   Browser   │                    │   Agent     │
│  (Human)    │                    │   (AI)      │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │  Operations (not full XML)       │
       │  ─────────────────────────────►  │
       │  • add_node(id, type, props)     │
       │  • move_node(id, x, y)           │
       │  • connect(src, dst, style)      │
       │  • delete_node(id)               │
       │                                  │
       │  ◄─────────────────────────────  │
       │  Agent responds with ops too     │
       │                                  │
       ▼                                  ▼
┌─────────────────────────────────────────────┐
│           Shared Operation Log              │
│  [op1, op2, op3, ...] → Final XML State     │
└─────────────────────────────────────────────┘
```

**優點：**
- 最小化資料傳輸
- 可追蹤每個操作來源
- 支援 undo/redo
- 可合併衝突操作

**缺點：**
- 實作複雜 (需要 OT/CRDT)
- Draw.io 內建不支援，需要 wrapper

### 方案 B: Diff-Based Sync

只傳遞變更差異：

```
Browser Edit:
  Before: <mxCell id="2" value="Old"/>
  After:  <mxCell id="2" value="New"/>
  
  → Send: { id: "2", changes: { value: "Old" → "New" } }
```

**實作方式：**
```typescript
interface DiagramDiff {
  added: MxCell[];      // 新增的元素
  modified: {           // 修改的元素
    id: string;
    before: Partial<MxCell>;
    after: Partial<MxCell>;
  }[];
  deleted: string[];    // 刪除的元素 ID
}
```

**優點：**
- 比方案 A 簡單
- 足夠解決 token 問題
- 可追蹤變更

**缺點：**
- 需要維護 before/after 狀態
- 複雜變更（如群組移動）需要特殊處理

### 方案 C: Semantic Layer Abstraction

在 XML 之上建立語意層：

```
XML Layer:     <mxCell id="2" value="API Gateway" style="..."/>
                        ↑↓
Semantic Layer: { type: "aws:api_gateway", name: "API Gateway", 
                  position: {x: 100, y: 200}, connections: ["3", "4"] }
```

**Agent 只操作語意層：**
```python
@mcp.tool()
async def add_component(
    component_type: str,  # "aws:api_gateway", "process", "decision"
    name: str,
    position: Optional[Position] = None,
    connect_to: Optional[List[str]] = None,
) -> str:
    """Add a component to the diagram"""
    # Convert semantic to XML internally
```

**優點：**
- AI 更容易理解
- 減少 token (語意層更簡潔)
- 類型安全
- 可以有預設樣式

**缺點：**
- 需要建立語意 ↔ XML 轉換器
- 可能無法表達所有 Draw.io 細節

### 方案 D: Hybrid Approach (推薦)

結合方案 B + C：

```
Level 1: Semantic Operations (Agent 主要使用)
  add_component("database", "UserDB", connect_to=["api"])
  
Level 2: Diff Operations (精細調整)
  modify_style(id="3", fill_color="#ff0000")
  
Level 3: Full XML (fallback，複雜情況)
  replace_diagram(xml="<mxGraphModel>...")
```

**工作流程：**
```
1. Human edits in browser
   → Browser computes diff
   → Sends semantic summary to Agent:
     "User added a database node and connected it to the API"

2. Agent responds:
   → Semantic ops: add_component("cache", "Redis", connect_to=["database"])
   → OR diff ops: modify_node(id="5", value="Optimized API")
   → Rarely: full XML replacement

3. Both sides maintain consistent state
```

## Implementation Plan

### Phase 1: Diff Tracking (Low Effort, High Value)

1. **Browser Side**: Track changes since last sync
```typescript
// diagram-context.tsx
interface ChangeTracker {
  baseXml: string;
  changes: DiagramChange[];
  
  recordChange(type: 'add' | 'modify' | 'delete', element: MxCell): void;
  getDiff(): DiagramDiff;
  applyDiff(diff: DiagramDiff): void;
}
```

2. **MCP Side**: Accept diff instead of full XML
```python
@mcp.tool()
async def apply_diagram_changes(
    changes: List[DiagramChange],
) -> str:
    """Apply incremental changes to the diagram"""
```

### Phase 2: Semantic Layer (Medium Effort)

1. Define semantic component types
2. Build XML ↔ Semantic converter
3. Add semantic MCP tools

### Phase 3: Real-time Collaboration (High Effort)

1. Implement operation log
2. Add conflict resolution
3. Support multiple cursors

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Avg tokens per edit | ~2000 | <500 |
| Edit latency | ~3s | <1s |
| Conflict rate | N/A | <5% |
| Human edit preservation | ~70% | >95% |

## Questions to Explore

1. Draw.io 有沒有內建的 change event API?
2. mxGraph 有沒有 diff/patch 功能?
3. 是否需要支援離線編輯?
4. 如何處理 AI 產生的「創意性」大改動?

## Next Steps

1. [ ] 研究 Draw.io / mxGraph 的 change detection API
2. [ ] 實作簡單的 diff tracker (POC)
3. [ ] 測量 token 節省效果
4. [ ] 設計 semantic layer schema

## References

- [mxGraph API Documentation](https://jgraph.github.io/mxgraph/)
- [CRDT for Collaborative Editing](https://crdt.tech/)
- [OT Algorithm](https://en.wikipedia.org/wiki/Operational_transformation)
