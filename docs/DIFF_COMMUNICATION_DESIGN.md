# Diff-Based Communication Design

## 雙向 Diff 溝通架構

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Agent (GitHub Copilot)                        │
├─────────────────────────────────────────────────────────────────────┤
│  理解 diff 輸入:                   產生 diff 輸出:                  │
│  "User renamed 'Server' to        → apply_diff([                    │
│   'API Gateway' and moved it"       {op: "modify", id: "3",         │
│                                       changes: {value: "Cache"}}    │
│                                     ])                               │
└────────────────────┬────────────────────────────────────────────────┘
                     │ MCP Protocol
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP Server (Python)                          │
├─────────────────────────────────────────────────────────────────────┤
│  接收 Browser diff:               發送 Agent diff:                  │
│  human_changes = get_changes()    apply_changes(agent_diff)         │
│  → 轉成 Agent 可讀格式            → 轉成 Draw.io XML 操作            │
└────────────────────┬────────────────────────────────────────────────┘
                     │ HTTP API
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Draw.io)                            │
├─────────────────────────────────────────────────────────────────────┤
│  追蹤用戶操作:                     接收 Agent 操作:                 │
│  DiagramDiffTracker                applyDiff(operations)            │
│  → 記錄 add/modify/delete          → 精準修改，不覆蓋其他           │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. Diff 格式定義

### 操作類型 (DiagramOperation)

```typescript
type DiagramOperation = 
  | AddNodeOp
  | ModifyNodeOp
  | DeleteNodeOp
  | AddEdgeOp
  | ModifyEdgeOp
  | DeleteEdgeOp
  | MoveOp
  | StyleOp;

interface AddNodeOp {
  op: "add_node";
  id?: string;           // 可選，不指定則自動生成
  type: NodeType;        // "rectangle" | "ellipse" | "rhombus" | etc
  value: string;         // 顯示文字
  position: { x: number; y: number };
  size?: { width: number; height: number };
  style?: string;        // 完整 style 或 preset name
  parent?: string;       // 父容器 ID
}

interface ModifyNodeOp {
  op: "modify_node";
  id: string;
  changes: {
    value?: string;
    style?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
  };
}

interface DeleteNodeOp {
  op: "delete_node";
  id: string;
}

interface AddEdgeOp {
  op: "add_edge";
  id?: string;
  source: string;        // 來源節點 ID
  target: string;        // 目標節點 ID
  value?: string;        // 邊上的文字
  style?: string;        // 連線樣式
}

interface ModifyEdgeOp {
  op: "modify_edge";
  id: string;
  changes: {
    source?: string;
    target?: string;
    value?: string;
    style?: string;
  };
}

interface DeleteEdgeOp {
  op: "delete_edge";
  id: string;
}

// 批次移動操作
interface MoveOp {
  op: "move";
  ids: string[];
  delta: { dx: number; dy: number };
}

// 批次樣式變更
interface StyleOp {
  op: "style";
  ids: string[];
  style: Partial<StyleProperties>;
}
```

### Human Change Summary (給 Agent 看的格式)

```typescript
interface HumanChangeSummary {
  // 結構化資料
  operations: {
    added: { id: string; type: string; value: string }[];
    modified: { id: string; field: string; before: any; after: any }[];
    deleted: { id: string; type: string; value?: string }[];
  };
  
  // 自然語言摘要
  summary: string;
  
  // 可選：完整 diff 細節
  details?: string;
}

// 範例
{
  operations: {
    added: [
      { id: "node-123", type: "rectangle", value: "Redis Cache" }
    ],
    modified: [
      { id: "node-45", field: "value", before: "Server", after: "API Gateway" },
      { id: "node-45", field: "position", before: {x:100,y:200}, after: {x:150,y:200} }
    ],
    deleted: []
  },
  summary: "User added a Redis Cache node and renamed 'Server' to 'API Gateway' (also moved slightly right)",
  details: "..."
}
```

## 2. MCP 工具設計

### 2.1 取得用戶變更 (Browser → Agent)

```python
@mcp.tool()
async def get_diagram_changes(
    since_last_sync: bool = True,
    include_details: bool = False,
) -> HumanChangeSummary:
    """
    取得用戶在瀏覽器中對圖表的變更
    
    Args:
        since_last_sync: 只取得上次同步後的變更
        include_details: 是否包含詳細的 diff 資訊
    
    Returns:
        HumanChangeSummary with:
        - operations: 結構化的操作列表
        - summary: 人類可讀的變更摘要
        - details: (可選) 詳細 diff
    
    使用時機:
        - 在修改圖表前，先了解用戶做了什麼
        - 確保不會覆蓋用戶的編輯
    """
```

### 2.2 應用 Agent 變更 (Agent → Browser)

```python
@mcp.tool()
async def apply_diagram_changes(
    operations: List[DiagramOperation],
    preserve_user_changes: bool = True,
) -> ApplyResult:
    """
    應用一系列操作到圖表
    
    Args:
        operations: 要執行的操作列表
        preserve_user_changes: 是否保留用戶未同步的變更
    
    Returns:
        ApplyResult with:
        - success: bool
        - applied: 成功應用的操作數
        - conflicts: 衝突的操作（如果有）
        - new_state_summary: 新狀態摘要
    
    範例:
        apply_diagram_changes([
            {"op": "add_node", "type": "cylinder", "value": "Database", 
             "position": {"x": 300, "y": 200}},
            {"op": "add_edge", "source": "api-node", "target": "database-1"},
            {"op": "modify_node", "id": "title", "changes": {"value": "System v2"}}
        ])
    """
```

### 2.3 同步狀態 (雙向確認)

```python
@mcp.tool()
async def sync_diagram_state() -> SyncResult:
    """
    同步 Agent 和 Browser 的圖表狀態
    
    這會:
    1. 取得 Browser 當前狀態
    2. 將當前狀態設為新的基準點
    3. 清除未同步的變更追蹤
    
    Returns:
        SyncResult with:
        - current_elements: 當前所有元素的摘要
        - node_count: 節點數量
        - edge_count: 連線數量
    
    使用時機:
        - 完成一輪編輯後，確認狀態同步
        - 開始新的編輯任務前
    """
```

## 3. Agent System Prompt 更新

```
When working with diagrams, use incremental operations instead of full XML:

1. BEFORE making changes, call get_diagram_changes() to see what the user modified
2. Use apply_diagram_changes() with specific operations:
   - add_node: Add new elements
   - modify_node: Change existing elements (text, position, style)
   - delete_node: Remove elements
   - add_edge/modify_edge/delete_edge: Manage connections
   
3. PRESERVE user changes by default - don't overwrite their edits

Example workflow:
  User: "Add a database and connect it to the API"
  
  Agent steps:
  1. get_diagram_changes() → "User renamed Server to API Gateway"
  2. Find the API Gateway node ID from current state
  3. apply_diagram_changes([
       {op: "add_node", type: "cylinder", value: "Database", position: {x:400, y:300}},
       {op: "add_edge", source: "api-gateway-id", target: "database-id"}
     ])
  
FALLBACK: Only use create_diagram (full XML) when:
  - Creating a brand new diagram from scratch
  - User explicitly asks to "regenerate" or "recreate" the entire diagram
  - The diagram is too corrupted to patch
```

## 4. 實作優先順序

### Phase 1: Browser Diff Tracking (已完成 POC)
- [x] DiagramDiffTracker 類別
- [ ] 整合到 diagram-context.tsx
- [ ] onAutoSave 時自動追蹤

### Phase 2: MCP 接收 Diff
- [ ] get_diagram_changes 工具
- [ ] API endpoint: POST /api/mcp { action: "get_changes" }
- [ ] 格式轉換: Browser format → Agent format

### Phase 3: MCP 發送 Diff
- [ ] apply_diagram_changes 工具
- [ ] 操作轉換: DiagramOperation → Draw.io XML patch
- [ ] 衝突檢測

### Phase 4: 雙向同步
- [ ] sync_diagram_state 工具
- [ ] 基準狀態管理
- [ ] 錯誤恢復機制

## 5. API 設計

### Browser → Server

```typescript
// POST /api/mcp
{
  action: "get_changes",
  since_timestamp?: number,
  include_details?: boolean
}

// Response
{
  changes: HumanChangeSummary,
  base_timestamp: number,
  current_timestamp: number
}
```

### Server → Browser

```typescript
// POST /api/mcp
{
  action: "apply_changes",
  operations: DiagramOperation[],
  preserve_user_changes?: boolean
}

// Response
{
  success: boolean,
  applied: number,
  conflicts?: ConflictInfo[],
  new_xml?: string  // 只在需要完整重繪時返回
}
```

## 6. 衝突處理策略

```
衝突類型:
1. 同時修改同一節點 → 合併變更（非衝突屬性可合併）
2. Agent 刪除用戶修改的節點 → 警告並確認
3. 位置衝突 → 使用最新位置

策略:
- 預設: 用戶優先 (user_wins)
- 可選: Agent 優先 (agent_wins)
- 可選: 互動確認 (ask_user)
```
