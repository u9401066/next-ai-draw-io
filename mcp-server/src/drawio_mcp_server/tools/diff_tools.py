"""
Draw.io MCP Tools - Diff-Based Editing
差異式編輯工具 - 減少 token 消耗，支援人機協作

這個模組提供基於差異的圖表編輯，而不是每次傳送完整 XML。
"""

from typing import Optional, List, Dict, Any, Literal
from dataclasses import dataclass
from enum import Enum
import json


# === 資料類型定義 ===

class OperationType(str, Enum):
    ADD_NODE = "add_node"
    MODIFY_NODE = "modify_node"
    DELETE_NODE = "delete_node"
    ADD_EDGE = "add_edge"
    MODIFY_EDGE = "modify_edge"
    DELETE_EDGE = "delete_edge"
    MOVE = "move"
    STYLE = "style"


@dataclass
class Position:
    x: float
    y: float


@dataclass
class Size:
    width: float
    height: float


@dataclass
class DiagramOperation:
    """圖表操作的基類"""
    op: OperationType


@dataclass
class AddNodeOp(DiagramOperation):
    """新增節點"""
    op: OperationType = OperationType.ADD_NODE
    node_type: str = "rectangle"  # rectangle, ellipse, rhombus, cylinder, etc.
    value: str = ""
    position: Optional[Position] = None
    size: Optional[Size] = None
    style: Optional[str] = None
    parent: Optional[str] = None
    id: Optional[str] = None  # 自動生成如果不指定


@dataclass
class ModifyNodeOp(DiagramOperation):
    """修改節點"""
    op: OperationType = OperationType.MODIFY_NODE
    id: str = ""
    value: Optional[str] = None
    position: Optional[Position] = None
    size: Optional[Size] = None
    style: Optional[str] = None


@dataclass
class DeleteNodeOp(DiagramOperation):
    """刪除節點"""
    op: OperationType = OperationType.DELETE_NODE
    id: str = ""


@dataclass
class AddEdgeOp(DiagramOperation):
    """新增連線"""
    op: OperationType = OperationType.ADD_EDGE
    source: str = ""
    target: str = ""
    value: Optional[str] = None
    style: Optional[str] = None
    id: Optional[str] = None


@dataclass
class ModifyEdgeOp(DiagramOperation):
    """修改連線"""
    op: OperationType = OperationType.MODIFY_EDGE
    id: str = ""
    source: Optional[str] = None
    target: Optional[str] = None
    value: Optional[str] = None
    style: Optional[str] = None


@dataclass
class DeleteEdgeOp(DiagramOperation):
    """刪除連線"""
    op: OperationType = OperationType.DELETE_EDGE
    id: str = ""


@dataclass 
class HumanChangeSummary:
    """用戶變更摘要 - 給 Agent 看的格式"""
    operations: Dict[str, List[Dict]]  # added, modified, deleted
    summary: str
    details: Optional[str] = None
    has_changes: bool = False


@dataclass
class ApplyResult:
    """應用變更的結果"""
    success: bool
    applied: int
    conflicts: List[Dict] = None
    new_state_summary: Optional[str] = None


# === 工具實作 ===

# 儲存 Browser 回報的變更（實際上會從 API 取得）
_pending_human_changes: Optional[HumanChangeSummary] = None


async def get_diagram_changes_impl(
    since_last_sync: bool = True,
    include_details: bool = False,
) -> str:
    """
    取得用戶在瀏覽器中對圖表的變更
    """
    from .web_client import web_client
    
    try:
        # 從 Browser 取得變更
        response = await web_client.send_command({
            "action": "get_changes",
            "since_last_sync": since_last_sync,
            "include_details": include_details,
        })
        
        if not response.get("success"):
            return "無法取得變更資訊"
        
        changes = response.get("changes", {})
        
        # 格式化輸出
        if not changes.get("has_changes", False):
            return "用戶沒有做任何變更。"
        
        result_parts = [
            "## 用戶變更摘要",
            "",
            changes.get("summary", ""),
            "",
        ]
        
        ops = changes.get("operations", {})
        
        if ops.get("added"):
            result_parts.append("### 新增的元素:")
            for item in ops["added"]:
                result_parts.append(f"- {item.get('type', 'node')} \"{item.get('value', '')}\" (id: {item.get('id', 'unknown')})")
        
        if ops.get("modified"):
            result_parts.append("### 修改的元素:")
            for item in ops["modified"]:
                field = item.get("field", "unknown")
                before = item.get("before", "?")
                after = item.get("after", "?")
                result_parts.append(f"- id={item.get('id')}: {field} 從 \"{before}\" 改為 \"{after}\"")
        
        if ops.get("deleted"):
            result_parts.append("### 刪除的元素:")
            for item in ops["deleted"]:
                result_parts.append(f"- {item.get('type', 'node')} \"{item.get('value', '')}\" (id: {item.get('id', 'unknown')})")
        
        if include_details and changes.get("details"):
            result_parts.append("")
            result_parts.append("### 詳細資訊:")
            result_parts.append(changes["details"])
        
        return "\n".join(result_parts)
        
    except Exception as e:
        return f"取得變更時發生錯誤: {str(e)}"


async def apply_diagram_changes_impl(
    operations: List[Dict[str, Any]],
    preserve_user_changes: bool = True,
) -> str:
    """
    應用一系列操作到圖表
    """
    from .web_client import web_client
    
    if not operations:
        return "沒有要執行的操作。"
    
    try:
        # 發送操作到 Browser
        response = await web_client.send_command({
            "action": "apply_changes",
            "operations": operations,
            "preserve_user_changes": preserve_user_changes,
        })
        
        if not response.get("success"):
            error = response.get("error", "未知錯誤")
            return f"應用變更失敗: {error}"
        
        applied = response.get("applied", 0)
        conflicts = response.get("conflicts", [])
        
        result_parts = [f"✅ 成功應用 {applied} 個操作"]
        
        if conflicts:
            result_parts.append(f"⚠️ 有 {len(conflicts)} 個衝突:")
            for conflict in conflicts:
                result_parts.append(f"  - {conflict.get('description', '未知衝突')}")
        
        if response.get("new_state_summary"):
            result_parts.append("")
            result_parts.append("目前圖表狀態:")
            result_parts.append(response["new_state_summary"])
        
        return "\n".join(result_parts)
        
    except Exception as e:
        return f"應用變更時發生錯誤: {str(e)}"


async def sync_diagram_state_impl() -> str:
    """
    同步 Agent 和 Browser 的圖表狀態
    """
    from .web_client import web_client
    
    try:
        response = await web_client.send_command({
            "action": "sync_state",
        })
        
        if not response.get("success"):
            return "同步失敗"
        
        state = response.get("state", {})
        
        return f"""## 圖表狀態已同步

- 節點數量: {state.get('node_count', 0)}
- 連線數量: {state.get('edge_count', 0)}
- 最後更新: {state.get('timestamp', 'unknown')}

現在的狀態已設為新的基準點，之後的變更追蹤會從這裡開始。"""

    except Exception as e:
        return f"同步時發生錯誤: {str(e)}"


async def get_diagram_elements_impl(
    element_type: Optional[str] = None,
) -> str:
    """
    取得圖表中的元素列表
    
    用途: 在執行操作前，了解目前有哪些元素及其 ID
    """
    from .web_client import web_client
    
    try:
        response = await web_client.send_command({
            "action": "get_elements",
            "element_type": element_type,  # "nodes", "edges", or None for all
        })
        
        if not response.get("success"):
            return "無法取得元素列表"
        
        elements = response.get("elements", [])
        
        if not elements:
            return "圖表中沒有元素。"
        
        result_parts = ["## 圖表元素列表", ""]
        
        nodes = [e for e in elements if e.get("type") == "node"]
        edges = [e for e in elements if e.get("type") == "edge"]
        
        if nodes:
            result_parts.append("### 節點:")
            for node in nodes:
                pos = node.get("position", {})
                result_parts.append(
                    f"- id=\"{node['id']}\": \"{node.get('value', '')}\" "
                    f"at ({pos.get('x', 0)}, {pos.get('y', 0)})"
                )
        
        if edges:
            result_parts.append("")
            result_parts.append("### 連線:")
            for edge in edges:
                result_parts.append(
                    f"- id=\"{edge['id']}\": {edge.get('source', '?')} → {edge.get('target', '?')}"
                    f"{' \"' + edge['value'] + '\"' if edge.get('value') else ''}"
                )
        
        return "\n".join(result_parts)
        
    except Exception as e:
        return f"取得元素時發生錯誤: {str(e)}"


# === 工具註冊 ===

def register_diff_tools(mcp):
    """註冊差異式編輯工具"""
    
    @mcp.tool(
        description="""取得用戶在瀏覽器中對圖表的變更。

在修改圖表前，先呼叫這個工具了解用戶做了什麼變更，
避免覆蓋用戶的編輯。

返回:
- 新增的元素
- 修改的元素（包含修改前後的值）
- 刪除的元素
- 人類可讀的變更摘要

使用時機:
- 用戶說「我改了一些東西」
- 準備執行編輯操作前
- 確認用戶的意圖"""
    )
    async def get_diagram_changes(
        since_last_sync: bool = True,
        include_details: bool = False,
    ) -> str:
        return await get_diagram_changes_impl(since_last_sync, include_details)
    
    @mcp.tool(
        description="""應用一系列增量操作到圖表。

使用這個工具來精準修改圖表，而不是重新生成整個 XML。
這樣可以保留用戶的其他編輯。

支援的操作:
- add_node: 新增節點
  {op: "add_node", node_type: "rectangle|ellipse|rhombus|cylinder", 
   value: "顯示文字", position: {x, y}, style?: "樣式"}
   
- modify_node: 修改節點
  {op: "modify_node", id: "節點ID", 
   value?: "新文字", position?: {x, y}, style?: "新樣式"}
   
- delete_node: 刪除節點
  {op: "delete_node", id: "節點ID"}
  
- add_edge: 新增連線
  {op: "add_edge", source: "來源ID", target: "目標ID", 
   value?: "標籤", style?: "樣式"}
   
- modify_edge: 修改連線
  {op: "modify_edge", id: "連線ID", 
   source?: "新來源", target?: "新目標", value?: "新標籤"}
   
- delete_edge: 刪除連線
  {op: "delete_edge", id: "連線ID"}

範例:
  apply_diagram_changes([
    {"op": "add_node", "node_type": "cylinder", "value": "Database", 
     "position": {"x": 300, "y": 200}},
    {"op": "add_edge", "source": "api-1", "target": "db-1"},
    {"op": "modify_node", "id": "title", "value": "System Architecture v2"}
  ])"""
    )
    async def apply_diagram_changes(
        operations: str,  # JSON string of List[Dict]
        preserve_user_changes: bool = True,
    ) -> str:
        try:
            ops = json.loads(operations) if isinstance(operations, str) else operations
        except json.JSONDecodeError as e:
            return f"操作格式錯誤: {e}"
        return await apply_diagram_changes_impl(ops, preserve_user_changes)
    
    @mcp.tool(
        description="""取得圖表中所有元素的列表。

用途:
- 了解目前有哪些節點和連線
- 取得元素的 ID 以便後續操作
- 確認元素的位置和連接關係

返回每個元素的:
- id: 元素 ID（用於修改/刪除操作）
- value: 顯示文字
- type: node 或 edge
- position: 位置座標（節點）
- source/target: 連接關係（連線）"""
    )
    async def get_diagram_elements(
        element_type: str = None,  # "nodes", "edges", or None
    ) -> str:
        return await get_diagram_elements_impl(element_type)
    
    @mcp.tool(
        description="""同步 Agent 和 Browser 的圖表狀態。

這會:
1. 確認雙方狀態一致
2. 清除變更追蹤
3. 設定新的基準點

使用時機:
- 完成一系列編輯後
- 開始新任務前
- 解決衝突後"""
    )
    async def sync_diagram_state() -> str:
        return await sync_diagram_state_impl()


# === 輔助函數 ===

def operation_to_xml_patch(op: Dict[str, Any], current_xml: str) -> str:
    """
    將操作轉換為 XML 修改指令
    
    這個函數會被 Browser 端使用來應用變更
    """
    op_type = op.get("op")
    
    if op_type == "add_node":
        return _generate_add_node_xml(op)
    elif op_type == "modify_node":
        return _generate_modify_node_xml(op, current_xml)
    elif op_type == "delete_node":
        return _generate_delete_node_xml(op)
    elif op_type == "add_edge":
        return _generate_add_edge_xml(op)
    # ... 其他操作
    
    return ""


def _generate_add_node_xml(op: Dict) -> str:
    """生成新增節點的 XML"""
    node_type = op.get("node_type", "rectangle")
    value = op.get("value", "")
    pos = op.get("position", {"x": 100, "y": 100})
    size = op.get("size", {"width": 120, "height": 60})
    node_id = op.get("id", f"node-{hash(value) % 10000}")
    
    # 根據類型決定 style
    style_map = {
        "rectangle": "rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;",
        "ellipse": "ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;",
        "rhombus": "rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;",
        "cylinder": "shape=cylinder3;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;",
    }
    style = op.get("style") or style_map.get(node_type, style_map["rectangle"])
    
    return f'''<mxCell id="{node_id}" value="{value}" style="{style}" vertex="1" parent="1">
  <mxGeometry x="{pos['x']}" y="{pos['y']}" width="{size['width']}" height="{size['height']}" as="geometry"/>
</mxCell>'''


def _generate_add_edge_xml(op: Dict) -> str:
    """生成新增連線的 XML"""
    source = op.get("source", "")
    target = op.get("target", "")
    value = op.get("value", "")
    edge_id = op.get("id", f"edge-{hash(source + target) % 10000}")
    
    style = op.get("style") or "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=classic;strokeWidth=2;"
    
    return f'''<mxCell id="{edge_id}" value="{value}" style="{style}" edge="1" parent="1" source="{source}" target="{target}">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>'''


def _generate_modify_node_xml(op: Dict, current_xml: str) -> str:
    """生成修改節點的指令（返回 search/replace 格式）"""
    # 這需要在 Browser 端處理，因為需要找到現有的 XML
    return json.dumps({
        "type": "modify",
        "id": op.get("id"),
        "changes": {k: v for k, v in op.items() if k not in ["op", "id"]}
    })


def _generate_delete_node_xml(op: Dict) -> str:
    """生成刪除節點的指令"""
    return json.dumps({
        "type": "delete",
        "id": op.get("id")
    })
