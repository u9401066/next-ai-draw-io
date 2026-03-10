# MedPaper Assistant × Next-AI-Draw-IO 整合記錄

> 本文件記錄 MedPaper Assistant VS Code Extension 與本 Draw.io fork 的整合方式、架構決策、以及維護注意事項。

---

## 1. 專案關係

| 項目 | 說明 |
|------|------|
| **上游** | [DayuanJiang/next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io) |
| **本 Fork** | [u9401066/next-ai-draw-io](https://github.com/u9401066/next-ai-draw-io) |
| **掛載位置** | `integrations/next-ai-draw-io`（git submodule） |
| **消費者** | MedPaper Assistant VSX (`vscode-extension/`) |
| **上游版本** | v0.4.13（2026-03 合併，350+ commits） |

本 fork 作為 MedPaper Assistant 的 **git submodule** 存在於主倉庫，提供：
1. **Next.js Web App** — Draw.io 圖表編輯器 UI（port 6002）
2. **MCP Server** — `mcp-server/` 下的 Python MCP 工具，可由 GitHub Copilot Agent 呼叫
3. **HTTP API** — `/api/mcp` 端點，供 VS Code WebviewPanel 通訊

---

## 2. 整合架構

```
┌─────────────────────────────────────────┐
│         VS Code Extension               │
│  ┌────────────┐    ┌─────────────────┐  │
│  │ Chat       │    │ DrawioPanel     │  │
│  │ Participant│    │ (WebviewPanel)  │  │
│  │ @mdpaper   │    │ iframe→:6002    │  │
│  └─────┬──────┘    └────────┬────────┘  │
│        │                    │            │
│   vscode.lm.tools     postMessage       │
│   vscode.lm.invokeTool()   │            │
│        │                    │            │
│  ┌─────┴────────────────────┴─────────┐ │
│  │    MCP Server Provider             │ │
│  │    (5 servers: mdpaper, cgu,       │ │
│  │     pubmed, zotero, drawio)        │ │
│  └─────┬──────────────────────────────┘ │
└────────┼────────────────────────────────┘
         │ stdio / SSE
┌────────┴────────────────────────────────┐
│  next-ai-draw-io                        │
│  ├── Next.js App (:6002)                │
│  │   ├── Draw.io Editor UI              │
│  │   └── /api/mcp (HTTP bridge)         │
│  └── mcp-server/                        │
│      └── Python MCP tools               │
│          (create/edit/list diagrams)     │
└─────────────────────────────────────────┘
```

### 2.1 Draw.io MCP 優先順序

VS Code Extension 的 `registerMcpServerProvider()` 按以下優先順序選擇 Draw.io MCP：

1. **Fork MCP**（本子模組的 `mcp-server/`）— 開發環境優先
2. **Official @drawio/mcp**（workspace 安裝的 npm 版本）— fallback
3. **npx -y @drawio/mcp**（臨時下載執行）— 最後手段

### 2.2 WebviewPanel（DrawioPanel）

`vscode-extension/src/drawioPanel.ts` 提供嵌入式 Draw.io 編輯器，取代 Simple Browser：

- **Singleton 模式**：`DrawioPanel.createOrShow()` 確保同時只開一個面板
- **通訊方式**：Extension ↔ Webview 用 `postMessage`，Webview ↔ Draw.io 用 `fetch()` 到 `/api/mcp`
- **事件輪詢**：每 3 秒 poll `/api/mcp?action=events` 偵測用戶儲存事件
- **CSP 限制**：`frame-src` 和 `connect-src` 僅允許 `localhost:6002`

### 2.3 Chat → Tool 架構

Chat participant (`@mdpaper`) 的 `/drawio` 命令透過 `runWithTools()` 呼叫 MCP 工具：

```
用戶輸入 → registerChatParticipant handler
         → runWithTools(request, stream, token, toolFilter)
         → vscode.lm.tools (取得可用 MCP 工具)
         → request.model.sendRequest() with tools
         → 模型回傳 LanguageModelToolCallPart
         → vscode.lm.invokeTool() 執行工具
         → 回傳 LanguageModelToolResultPart
         → 迴圈最多 5 輪
```

---

## 3. 上游合併記錄

| 日期 | 事件 | Commit |
|------|------|--------|
| 2026-03-09 | 合併 upstream v0.4.5–v0.4.13（350+ commits） | `268175a`, `e8a24d5` |
| 2026-03-09 | Post-merge 相容性修復 | `5dbe8fb` |
| 2026-03-09 | 加入 `@testing-library/jest-dom` | `3d2a3fa` |
| 2026-03-09 | 修復 test setup window mock guard | `0129d6b` |

### 合併注意事項

- 上游使用 **Biome** 取代 ESLint（v0.4.10 後）
- 上游加入 **Electron** 桌面應用支援（我們不使用）
- 合併後需執行 `npm install` 重建 `node_modules`
- `biome.json` 和 `electron-builder.yml` 來自上游，勿刪除

---

## 4. Fork 專屬功能

### 4.1 MCP Server（`mcp-server/`）

Fork 獨有的 Python MCP server，提供：
- `create_diagram` — 從 XML 建立新圖表
- `edit_diagram` — 修改現有圖表
- `get_diagram_content` — 取得圖表 XML 內容
- `list_diagrams` — 列出所有圖表
- `load_file` — 載入 `.drawio` 檔案
- `get_drawing_guidelines` — 取得繪圖指引

### 4.2 Diff-Based 編輯（實驗性）

`docs/DIFF_COMMUNICATION_DESIGN.md` 中定義的增量編輯系統，用 diff 而非完整 XML 傳輸變更。

### 4.3 WebSocket 即時通訊

`src/` 下的 WebSocket 實作，提供 Agent ↔ Browser 雙向即時同步。

### 4.4 DDD 架構

按照 `docs/DDD_ARCHITECTURE.md` 設計的分層架構：
- **Domain**：圖表核心模型
- **Application**：DiagramContext, Checkpoint
- **Infrastructure**：WebSocket, HTTP API
- **Presentation**：React UI

---

## 5. 測試

```bash
# 執行所有測試（7 files, 85 tests）
npx vitest --run

# 注意：部分測試使用 @vitest-environment node
# tests/setup.ts 已加 window mock guard 避免衝突
```

### 測試環境

| 設定 | 值 |
|------|------|
| 框架 | Vitest |
| 預設環境 | jsdom |
| Setup | `tests/setup.ts` |
| 特殊 | `chat-helpers.test.ts` 使用 `node` 環境 |

---

## 6. 開發指引

### 啟動 Draw.io Web Server

```bash
cd integrations/next-ai-draw-io
npm install
npm run dev    # → http://localhost:6002
```

### 啟動 MCP Server（開發模式）

```bash
cd integrations/next-ai-draw-io/mcp-server
uv run python -m drawio_mcp
```

### 同步上游

```bash
cd integrations/next-ai-draw-io
git fetch upstream
git merge upstream/main
# 解決衝突後
git push origin main
```

### 更新主倉庫的 submodule 參照

```bash
cd /path/to/workspace251125
git add integrations/next-ai-draw-io
git commit -m "chore: update next-ai-draw-io submodule"
```

---

## 7. 已知限制

1. **Port 固定**：Web server hardcoded 在 `localhost:6002`，未來可考慮動態 port
2. **Polling 開銷**：WebviewPanel 每 3 秒輪詢一次事件，高頻使用時可能有延遲
3. **CSP 限制**：Webview 只能連 `localhost:6002`，無法連外部 Draw.io 服務
4. **Electron 未使用**：上游的 Electron 桌面應用功能不在 MedPaper 整合範圍內
5. **MCP Server 選擇**：Runtime 依序檢查 fork→official→npx，可能導致使用到非預期版本

---

*最後更新：2026-03-10*
