"""
Draw.io MCP Tools - 分頁管理工具
"""

import base64
from typing import Optional
from pydantic import Field

from ..config import config
from ..web_client import web_client


async def list_tabs_impl() -> str:
    """列出所有開啟的圖表分頁"""
    if not web_client.is_running():
        return "⚠️ Draw.io Web 未運行。請先使用 start_drawio_web 啟動。"
    
    data = await web_client.get_tabs()
    
    if "error" in data:
        return f"⚠️ 無法取得分頁列表: {data['error']}"
    
    tabs = data.get("tabs", [])
    
    if not tabs:
        return "📋 目前沒有開啟的圖表分頁"
    
    result = ["📋 開啟的圖表分頁:\n"]
    for tab in tabs:
        active = "👉 " if tab.get("active") else "   "
        result.append(f"{active}{tab['id']}: {tab.get('name', '未命名')}")
    
    return "\n".join(result)


async def switch_tab_impl(tab_id: str) -> str:
    """切換到指定的圖表分頁"""
    if not web_client.is_running():
        return "⚠️ Draw.io Web 未運行。請先使用 start_drawio_web 啟動。"
    
    result = await web_client.tab_action("switch", tab_id)
    
    if "error" in result:
        return f"⚠️ 切換分頁失敗: {result['error']}"
    
    return f"✅ 已切換到分頁: {tab_id}"


async def close_tab_impl(tab_id: str) -> str:
    """關閉指定的圖表分頁"""
    if not web_client.is_running():
        return "⚠️ Draw.io Web 未運行。"
    
    result = await web_client.tab_action("close", tab_id)
    
    if "error" in result:
        return f"⚠️ 關閉分頁失敗: {result['error']}"
    
    return f"✅ 已關閉分頁: {tab_id}"


async def get_diagram_content_impl(tab_id: Optional[str] = None) -> dict:
    """
    取得圖表內容（供其他 MCP 使用）
    
    Args:
        tab_id: 分頁 ID，不指定則取得當前活躍分頁
        
    Returns:
        包含圖表資訊的 dict
    """
    if not web_client.is_running():
        return {"error": "Draw.io Web 未運行"}
    
    result = await web_client.get_diagram_content(tab_id)
    return result


def register_tab_tools(mcp):
    """註冊分頁管理工具到 MCP"""
    
    @mcp.tool()
    async def list_tabs() -> str:
        """
        列出所有開啟的圖表分頁。
        每個分頁包含一個獨立的圖表。
        """
        return await list_tabs_impl()
    
    @mcp.tool()
    async def switch_tab(
        tab_id: str = Field(description="要切換到的分頁 ID")
    ) -> str:
        """
        切換到指定的圖表分頁。
        """
        return await switch_tab_impl(tab_id)
    
    @mcp.tool()
    async def close_tab(
        tab_id: str = Field(description="要關閉的分頁 ID")
    ) -> str:
        """
        關閉指定的圖表分頁。
        """
        return await close_tab_impl(tab_id)
    
    @mcp.tool()
    async def get_diagram_content(
        tab_id: Optional[str] = Field(
            default=None,
            description="分頁 ID，不指定則取得當前活躍分頁"
        ),
        format: str = Field(
            default="xml",
            description="回傳格式: xml (Draw.io XML) 或 base64 (編碼後的 XML)"
        )
    ) -> str:
        """
        取得圖表內容。
        
        用於將圖表存檔到專案或匯出。
        回傳 Draw.io XML 格式的圖表內容。
        
        使用情境：
        - Agent 需要存檔時呼叫此工具取得內容
        - 然後呼叫 mdpaper MCP 的 save_diagram 存到專案
        """
        result = await get_diagram_content_impl(tab_id)
        
        if "error" in result:
            return f"❌ 取得圖表失敗: {result['error']}"
        
        xml = result.get("xml", "")
        tab_name = result.get("tabName", "未命名")
        current_tab_id = result.get("tabId", "")
        
        if not xml:
            return "⚠️ 圖表內容為空"
        
        if format == "base64":
            xml_b64 = base64.b64encode(xml.encode('utf-8')).decode('ascii')
            return f"""📄 圖表內容 (base64)

**分頁:** {tab_name} ({current_tab_id})
**格式:** base64 encoded XML
**長度:** {len(xml)} 字元

```
{xml_b64}
```

💡 使用 mdpaper MCP 的 `save_diagram` 存檔到專案"""
        
        return f"""📄 圖表內容

**分頁:** {tab_name} ({current_tab_id})
**格式:** Draw.io XML
**長度:** {len(xml)} 字元

```xml
{xml[:2000]}{'...' if len(xml) > 2000 else ''}
```

💡 使用 mdpaper MCP 的 `save_diagram` 存檔到專案"""
