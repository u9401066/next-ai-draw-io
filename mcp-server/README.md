# Draw.io MCP Server

讓 GitHub Copilot 可以創建和編輯 Draw.io 圖表的 MCP Server。

## 功能

- 🎨 **create_diagram** - 根據文字描述創建圖表
- ✏️ **edit_diagram** - 編輯現有的 .drawio 檔案
- 📖 **read_diagram** - 讀取並描述圖表內容
- 📋 **list_templates** - 列出可用模板
- 🏗️ **create_from_template** - 從模板創建圖表
- 📤 **export_diagram** - 匯出為 SVG/PNG/PDF

## 支援的圖表類型

- 流程圖 (Flowchart)
- AWS 架構圖
- GCP 架構圖
- Azure 架構圖
- 心智圖 (Mind Map)
- 序列圖 (Sequence Diagram)
- ER 圖

## 安裝

### 使用 uv (推薦)

```bash
cd mcp-server
uv sync
```

### 使用 pip

```bash
cd mcp-server
pip install -e .
```

## 設定 GitHub Copilot

在 VS Code 的 `settings.json` 中加入：

```json
{
  "mcp": {
    "servers": {
      "drawio": {
        "command": "uv",
        "args": ["--directory", "/home/eric/workspace251127/next-ai-draw-io/mcp-server", "run", "drawio-mcp-server"]
      }
    }
  }
}
```

或者在專案根目錄創建 `.vscode/mcp.json`：

```json
{
  "servers": {
    "drawio": {
      "command": "uv",
      "args": ["--directory", "${workspaceFolder}/mcp-server", "run", "drawio-mcp-server"]
    }
  }
}
```

## 使用範例

在 GitHub Copilot Chat 中：

```
@drawio 創建一個顯示用戶登入流程的流程圖

@drawio 創建一個 AWS 三層架構圖，包含 ALB、EC2 和 RDS

@drawio 列出所有可用的模板

@drawio 從 aws-serverless 模板創建一個圖表並儲存到 ./my-diagram.drawio
```

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
