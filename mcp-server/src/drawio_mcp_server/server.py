"""
Draw.io MCP Server
使用 FastMCP 建立的 MCP Server，讓 GitHub Copilot 可以創建和編輯 Draw.io 圖表
透過 HTTP API 與 Next.js 前端即時互動

架構：
- config.py: 配置管理
- web_client.py: Web 服務客戶端
- diagram_generator.py: 圖表生成器
- templates.py: 圖表模板
- validator.py: XML 驗證器
- tools/: MCP 工具模組
  - diagram_tools.py: 創建/編輯/讀取圖表
  - template_tools.py: 模板和匯出
  - tab_tools.py: 分頁管理
  - web_tools.py: Web 服務管理
"""

import sys
from fastmcp import FastMCP

from .config import config
from .web_client import web_client
from .tools import register_all_tools


# 創建 FastMCP 實例
mcp = FastMCP("drawio-mcp-server")

# 註冊所有工具
register_all_tools(mcp)


def main():
    """啟動 MCP Server"""
    print(f"🚀 Draw.io MCP Server 啟動中...", file=sys.stderr)
    print(f"   NEXTJS_URL: {config.nextjs_url}", file=sys.stderr)
    print(f"   AUTO_START_WEB: {config.auto_start_web}", file=sys.stderr)
    
    # 嘗試預先啟動 Web 服務
    if config.auto_start_web:
        result = web_client.start_web_server()
        print(f"   Web 啟動結果: {'成功' if result else '失敗'}", file=sys.stderr)
    
    mcp.run()


# 只在直接執行時運行
if __name__ == "__main__":
    main()
