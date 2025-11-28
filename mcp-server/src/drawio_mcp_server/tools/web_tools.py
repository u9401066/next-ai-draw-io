"""
Draw.io MCP Tools - Web 服務工具
"""

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
