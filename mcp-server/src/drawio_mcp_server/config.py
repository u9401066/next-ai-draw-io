"""
Draw.io MCP Server 配置
集中管理所有配置項
"""

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional


@dataclass
class ServerConfig:
    """MCP Server 配置"""
    
    # Next.js Web 服務 URL
    nextjs_url: str = os.environ.get("DRAWIO_NEXTJS_URL", "http://localhost:6002")
    
    # 自動啟動 Web 服務
    auto_start_web: bool = os.environ.get("DRAWIO_AUTO_START_WEB", "true").lower() == "true"
    
    # 自動開啟瀏覽器（現已棄用，改由 Agent 開啟）
    auto_open_browser: bool = os.environ.get("DRAWIO_AUTO_OPEN_BROWSER", "false").lower() == "true"
    
    # Web 服務啟動超時時間（秒）
    web_startup_timeout: int = int(os.environ.get("DRAWIO_WEB_STARTUP_TIMEOUT", "30"))
    
    # HTTP 請求超時時間（秒）
    http_timeout: float = float(os.environ.get("DRAWIO_HTTP_TIMEOUT", "30.0"))
    
    @property
    def api_mcp_url(self) -> str:
        """MCP API 端點"""
        return f"{self.nextjs_url}/api/mcp"
    
    @property
    def api_tabs_url(self) -> str:
        """分頁 API 端點"""
        return f"{self.nextjs_url}/api/tabs"


def get_web_dir() -> Path:
    """
    取得 Next.js 專案目錄
    
    結構：
    - integrations/next-ai-draw-io/
      - mcp-server/src/drawio_mcp_server/config.py (當前檔案)
      - app/ (Next.js app)
      - package.json
    """
    # config.py 位於 mcp-server/src/drawio_mcp_server/
    # Next.js 專案在 next-ai-draw-io/
    return Path(__file__).parent.parent.parent.parent


def get_npm_path() -> Optional[str]:
    """
    找到 npm 的路徑
    
    Returns:
        npm 路徑，如果找不到則返回 None
    """
    import shutil
    
    npm_path = shutil.which("npm")
    if npm_path:
        return npm_path
    
    # 嘗試常見路徑
    common_paths = [
        "/usr/bin/npm",
        "/usr/local/bin/npm",
        os.path.expanduser("~/.nvm/current/bin/npm"),
        os.path.expanduser("~/.nvm/versions/node/*/bin/npm"),
    ]
    
    for path in common_paths:
        if "*" in path:
            import glob
            matches = glob.glob(path)
            if matches:
                return matches[0]
        elif os.path.exists(path):
            return path
    
    return None


# 全局配置實例
config = ServerConfig()
