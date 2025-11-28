"""
Draw.io MCP Tools - Web 服務工具
"""

from typing import Optional
from pydantic import Field

from ..config import config
from ..web_client import web_client


async def start_drawio_web_impl() -> str:
    """啟動 Web 編輯器"""
    if web_client.is_running():
        return f"""✅ Draw.io Web 已在運行

🌐 URL: {config.nextjs_url}

⚡ ACTION REQUIRED: Please use `open_simple_browser` tool to open {config.nextjs_url}"""
    
    if web_client.start_web_server():
        return f"""✅ Draw.io Web 已啟動

🌐 URL: {config.nextjs_url}

⚡ ACTION REQUIRED: Please use `open_simple_browser` tool to open {config.nextjs_url}"""
    else:
        return f"❌ 無法啟動 Draw.io Web\n\n請手動執行:\ncd integrations/next-ai-draw-io && npm run dev"


async def get_web_status_impl() -> str:
    """取得 Web 編輯器狀態"""
    running = web_client.is_running()
    
    if running:
        return f"""✅ Draw.io Web 狀態: 運行中

🌐 URL: {config.nextjs_url}
🔄 自動啟動: {'啟用' if config.auto_start_web else '停用'}

可以在瀏覽器中開啟 URL 來編輯圖表。"""
    else:
        return f"""⚠️ Draw.io Web 狀態: 未運行

🌐 URL: {config.nextjs_url}
🔄 自動啟動: {'啟用' if config.auto_start_web else '停用'}

使用 start_drawio_web 工具來啟動，或手動執行:
cd integrations/next-ai-draw-io && npm run dev"""


async def get_user_events_impl(since: int = 0, clear: bool = False) -> str:
    """
    查詢用戶在瀏覽器中的操作事件
    
    Args:
        since: 只返回此時間戳之後的事件（毫秒）
        clear: 是否清除已返回的事件
        
    Returns:
        用戶操作事件列表
    """
    if not web_client.is_running():
        return "⚠️ Draw.io Web 未運行，無法取得用戶事件"
    
    # 查詢事件
    result = await web_client.get_user_events(since)
    
    if "error" in result:
        return f"❌ 取得事件失敗: {result['error']}"
    
    events = result.get("events", [])
    
    if not events:
        return "📭 沒有新的用戶操作事件"
    
    # 格式化輸出
    output = [f"📬 用戶操作事件 ({len(events)} 個):\n"]
    
    for event in events:
        event_type = event.get("type", "unknown")
        tab_name = event.get("tabName", "未命名")
        timestamp = event.get("timestamp", 0)
        xml_preview = event.get("xml", "")[:100] + "..." if len(event.get("xml", "")) > 100 else event.get("xml", "")
        
        icon = {"save": "💾", "autosave": "🔄", "change": "✏️", "close": "❌"}.get(event_type, "📌")
        output.append(f"{icon} [{event_type}] {tab_name} @ {timestamp}")
        if event_type == "save":
            output.append(f"   XML 長度: {len(event.get('xml', ''))} 字元")
    
    # 清除已處理的事件
    if clear and events:
        last_timestamp = events[-1].get("timestamp", 0)
        await web_client.clear_user_events(last_timestamp)
        output.append(f"\n✅ 已清除 {len(events)} 個事件")
    
    return "\n".join(output)


def register_web_tools(mcp):
    """註冊 Web 服務工具到 MCP"""
    
    @mcp.tool()
    async def start_drawio_web() -> str:
        """
        啟動 Draw.io Web 編輯器。
        如果已經在運行，則返回狀態。
        這個工具會自動在創建圖表時調用，通常不需要手動調用。
        
        返回後，Agent 應使用 open_simple_browser 工具開啟 URL。
        """
        return await start_drawio_web_impl()
    
    @mcp.tool()
    async def get_web_status() -> str:
        """
        檢查 Draw.io Web 編輯器的狀態。
        返回是否正在運行、URL 等資訊。
        """
        return await get_web_status_impl()
    
    @mcp.tool()
    async def get_user_events(
        since: int = Field(
            default=0,
            description="只返回此時間戳（毫秒）之後的事件。設為 0 返回所有未處理事件"
        ),
        clear: bool = Field(
            default=False,
            description="是否在返回後清除這些事件"
        )
    ) -> str:
        """
        查詢用戶在 Draw.io 瀏覽器中的操作事件。
        
        這是一個「拉取」模式的工具 - 用戶操作不會主動推送給 Agent，
        而是由 Agent 在需要時主動查詢。
        
        事件類型：
        - save: 用戶按 Ctrl+S 或點擊存檔
        - autosave: 自動存檔（如果啟用）
        - change: 圖表內容變更
        
        使用情境：
        - 用戶說「我剛剛畫了些東西」→ 查詢最新操作
        - 用戶說「幫我存檔」→ 查詢最新內容然後存檔
        - 確認用戶是否有未存檔的變更
        
        隱私說明：
        事件只在 Agent 呼叫此工具時才會返回，
        不會自動發送給 AI，保護用戶隱私並節省 token。
        """
        return await get_user_events_impl(since, clear)
