# Draw.io MCP Server

讓 GitHub Copilot 可以創建和編輯 Draw.io 圖表的 MCP Server。

## 架構

```
src/drawio_mcp_server/
├── __init__.py          # 模組入口
├── __main__.py          # CLI 入口點
├── server.py            # MCP Server 主程式
├── config.py            # 配置管理
├── web_client.py        # Web 服務客戶端
├── diagram_generator.py # 圖表生成器
├── templates.py         # 圖表模板
├── validator.py         # XML 驗證器
└── tools/               # MCP 工具模組
    ├── __init__.py
    ├── diagram_tools.py   # 圖表創建/編輯/讀取
    ├── template_tools.py  # 模板和匯出
    ├── tab_tools.py       # 分頁管理
    └── web_tools.py       # Web 服務管理
```

## 功能 (10 Tools)

### 圖表操作
- 🎨 **create_diagram** - 根據文字描述創建圖表
- ✏️ **edit_diagram** - 編輯現有的圖表或檔案
- 📖 **read_diagram** - 讀取並描述圖表內容

### 模板與匯出
- 📋 **list_templates** - 列出可用模板
- 🏗️ **create_from_template** - 從模板創建圖表
- 📤 **export_diagram** - 匯出為 SVG/PNG/PDF

### 分頁管理
- 📑 **list_tabs** - 列出所有開啟的分頁
- 🔀 **switch_tab** - 切換到指定分頁
- ❌ **close_tab** - 關閉分頁

### Web 服務
- 🌐 **start_drawio_web** - 啟動 Web 編輯器
- 📊 **get_web_status** - 檢查 Web 狀態

## 支援的圖表類型

| 類型 | 參數 | 說明 |
|------|------|------|
| 流程圖 | `flowchart` | 基本流程圖 |
| AWS 架構 | `aws` | AWS 雲端架構 |
| GCP 架構 | `gcp` | Google Cloud 架構 |
| Azure 架構 | `azure` | Microsoft Azure 架構 |
| 心智圖 | `mindmap` | Mind Map |
| 序列圖 | `sequence` | Sequence Diagram |
| ER 圖 | `er` | Entity-Relationship |
| 網路圖 | `network` | 網路拓撲 |
| 自訂 | `custom` | 自訂圖表 |

## 安裝

### 使用 uv (推薦)

```bash
cd integrations/next-ai-draw-io/mcp-server
uv sync
```

### 使用 pip

```bash
cd integrations/next-ai-draw-io/mcp-server
pip install -e .
```

## 配置

### 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `DRAWIO_NEXTJS_URL` | `http://localhost:6002` | Next.js Web 服務 URL |
| `DRAWIO_AUTO_START_WEB` | `true` | 啟動 MCP 時自動啟動 Web |
| `DRAWIO_WEB_STARTUP_TIMEOUT` | `30` | Web 啟動超時（秒）|
| `DRAWIO_HTTP_TIMEOUT` | `30.0` | HTTP 請求超時（秒）|

### VS Code MCP 設定

在 `.vscode/mcp.json` 中：

```json
{
  "servers": {
    "drawio": {
      "type": "stdio",
      "command": "uv",
      "args": [
        "--directory", "${workspaceFolder}/integrations/next-ai-draw-io/mcp-server",
        "run", "drawio-mcp-server"
      ],
      "env": {
        "DRAWIO_NEXTJS_URL": "http://localhost:6002",
        "DRAWIO_AUTO_START_WEB": "true"
      }
    }
  }
}
```

## 使用範例

在 GitHub Copilot Chat 中：

```
# 創建圖表
創建一個顯示用戶登入流程的流程圖

# 創建雲端架構
創建一個 AWS 三層架構圖，包含 ALB、EC2 和 RDS

# 使用模板
從 aws-serverless 模板創建一個圖表並儲存到 ./my-diagram.drawio

# 管理分頁
列出所有開啟的圖表分頁
切換到分頁 tab-123
```

## 工作流程

1. **啟動 MCP** - MCP Server 會自動啟動 Next.js Web 服務
2. **創建圖表** - 使用 `create_diagram` 創建圖表
3. **開啟瀏覽器** - Agent 使用 `open_simple_browser` 開啟 Web 編輯器
4. **即時編輯** - 圖表會即時顯示在瀏覽器中
5. **多分頁支援** - 可同時開啟多個圖表分頁

## 開發

```bash
# 安裝開發依賴
uv sync --dev

# 執行測試
uv run pytest

# 本地測試 MCP Server
uv run drawio-mcp-server
```

## 授權

MIT License
