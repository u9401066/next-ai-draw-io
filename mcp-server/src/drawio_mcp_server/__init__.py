"""
Draw.io MCP Server
讓 GitHub Copilot 可以創建和編輯 Draw.io 圖表

模組結構：
- server: MCP Server 主程式
- config: 配置管理
- web_client: Web 服務客戶端  
- diagram_generator: 圖表生成器
- templates: 圖表模板
- validator: XML 驗證器
- tools/: MCP 工具集
"""

__version__ = "0.2.0"


def get_mcp():
    """延遲導入以避免循環導入"""
    from .server import mcp
    return mcp


def get_config():
    """取得配置"""
    from .config import config
    return config


def get_web_client():
    """取得 Web 客戶端"""
    from .web_client import web_client
    return web_client


__all__ = [
    "__version__",
    "get_mcp",
    "get_config",
    "get_web_client",
]
