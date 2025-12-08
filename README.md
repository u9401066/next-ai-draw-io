# Next-AI-Draw-IO (Fork)

> 🎨 **AI 驅動的互動式流程圖繪製工具** — 專為研究流程圖設計，整合 MCP Server 與 GitHub Copilot

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## 🌟 專案特色

這是 [DayuanJiang/next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io) 的增強版 fork，專注於：

| 特色 | 說明 |
|------|------|
| 🔬 **研究導向** | 針對學術研究流程圖、實驗架構圖優化 |
| 🤖 **MCP Server** | 透過 Model Context Protocol 與 GitHub Copilot 整合 |
| 🔄 **即時同步** | WebSocket 雙向通訊，圖表即時更新 |
| 🎯 **DDD 架構** | 採用 Domain-Driven Design 架構設計 |
| 🌐 **繁體中文** | 完整的繁體中文介面 |

---

## ✨ 功能一覽

### 核心功能
- ✅ **多模型 AI 支援**：AWS Bedrock、OpenAI、Anthropic、Google、Azure、Ollama、OpenRouter、DeepSeek
- ✅ **自然語言繪圖**：用對話方式創建和修改流程圖
- ✅ **圖片轉圖表**：上傳圖片自動轉換為可編輯圖表
- ✅ **動態連接線**：支援 `flowAnimation=1` 動畫效果
- ✅ **可調整面板**：拖曳調整聊天面板大小
- ✅ **歷史記錄**：Session 內的圖表版本歷史

### MCP 整合（獨家功能）
- ✅ **GitHub Copilot Agent 控制**：在 VS Code 中直接操作圖表
- ✅ **圖表變更追蹤**：Agent 可查詢使用者的編輯操作
- ✅ **雙向通訊**：MCP Server ↔ 瀏覽器 即時同步
- ✅ **設定同步**：前端設定自動同步到 Agent
- ✅ **增量操作**：`apply_diagram_changes` 避免爆 token

### ⚠️ 已知問題（開發中修復）
| 問題 | 狀態 | 說明 |
|------|------|------|
| Agent 操作無法 Undo | 🔧 Phase 0.1 | 載入 XML 會清除 draw.io Undo 歷史 |
| 無法建立新分頁 | 🔧 Phase 0.2 | MCP 缺少 `create_tab` 工具 |
| 無測試覆蓋率 | 🔧 Phase 0.3 | 需建立 Vitest + Playwright + pytest |

### 企業級規劃
- 🔜 **Checkpoint 系統**：完整的操作回復機制
- 🔜 **HTTPS 強制**：生產環境安全傳輸
- 🔜 **存取控制**：Access Code 驗證機制
- 🔜 **繪圖偏好系統**：可儲存的樣式 Preset

---

## � 使用 Docker Compose（推薦）

```bash
# 複製環境變數範例
cp env.example .env
# 編輯 .env 設定 AI Provider
# 啟動所有服務
docker compose up -d
```

開啟 http://localhost:6002

| 服務 | Port | 說明 |
|------|------|------|
| `web` | 6002 | Next.js 前端 |
| `ws-server` | 6003, 6004 | WebSocket + HTTP API |
| `mcp-server` | 6005 | MCP Python Server |

---

## 🔧 手動安裝（開發用）

### 1. 複製專案

```bash
git clone https://github.com/u9401066/next-ai-draw-io
cd next-ai-draw-io
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

```bash
cp env.example .env.local
```

編輯 `.env.local`，設定您的 AI Provider：

```env
# AWS Bedrock (預設)
AI_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# 或使用其他 Provider
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-xxx
```

### 4. 啟動開發伺服器

```bash
# 僅啟動 Next.js
npm run dev

# 同時啟動 WebSocket Server（推薦）
npm run dev:all
```

開啟 http://localhost:6002

---

## 🤖 GitHub Copilot MCP 整合

### 設定步驟

1. **確保應用程式運行中**
   ```bash
   npm run dev:all
   ```

2. **設定 VS Code MCP**

   在 VS Code 的 `settings.json` 中加入：
   ```json
   {
     "github.copilot.chat.mcpServers": {
       "next-ai-draw-io": {
         "type": "stdio",
         "command": "uv",
         "args": ["run", "--directory", "path/to/next-ai-draw-io/mcp-server", "drawio-mcp-server"],
         "env": {
           "WEB_APP_URL": "http://localhost:6002"
         }
       }
     }
   }
   ```

3. **在 Copilot Chat 中使用**
   ```
   @next-ai-draw-io 幫我畫一個研究流程圖
   ```

---

## 📁 專案架構

```
next-ai-draw-io/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── chat/          # AI Chat API
│   │   └── mcp/           # MCP Control API
│   └── page.tsx           # 主頁面
├── components/             # React 元件
│   ├── ui/                # UI 基礎元件
│   ├── chat-panel.tsx     # 聊天面板
│   └── settings-dialog.tsx # 設定對話框
├── lib/                    # 工具函數
│   ├── ai-providers.ts    # AI Provider 配置
│   └── use-mcp-polling.ts # MCP 輪詢 Hook
├── mcp-server/            # Python MCP Server
│   └── src/
│       └── drawio_mcp_server/
│           ├── tools/     # MCP 工具
│           └── drawing_guidelines.py  # 繪圖指南
├── scripts/
│   └── ws-server.ts       # WebSocket Server
└── contexts/              # React Context
```

---

## 🔧 可用腳本

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動 Next.js 開發伺服器 (port 6002) |
| `npm run dev:ws` | 啟動 WebSocket Server (port 6004) |
| `npm run dev:all` | 同時啟動 Next.js 和 WebSocket |
| `npm run build` | 建置生產版本 |
| `npm run start` | 啟動生產伺服器 (port 6001) |

---

## 🛡️ 安全性考量

### 本地開發
- 預設使用 HTTP
- 無需額外設定

### 生產部署
- 建議使用 Nginx/Caddy 作為反向代理
- 強制 HTTPS
- 設定 Access Code 存取控制
- 環境變數不要提交到版本控制

---

## 📜 授權

本專案採用 [Apache License 2.0](LICENSE) 授權。

### 致謝

- 原作者：[Dayuan Jiang](https://github.com/DayuanJiang)
- 原專案：[next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io)

---

## 🗺️ 發展路線圖

詳見 [ROADMAP.md](ROADMAP.md)

### 近期規劃
- [ ] 繪圖偏好 Preset 系統
- [ ] DDD 架構重構
- [ ] 企業級安全強化
- [ ] 研究圖表樣板

---

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

1. Fork 此專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m '新增某功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request
