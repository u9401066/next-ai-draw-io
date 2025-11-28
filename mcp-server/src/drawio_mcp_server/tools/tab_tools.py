"""
Draw.io MCP Tools - 分頁管理工具
"""

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
