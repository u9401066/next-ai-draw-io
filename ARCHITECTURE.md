# 📐 專案架構

> Next-AI-Draw-IO Fork 的技術架構文檔

---

## 🏗️ 整體架構

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌─────────────────┐    ┌─────────────────┐   ┌───────────────┐  │
│  │    Draw.io      │    │   React UI      │   │  WebSocket    │  │
│  │   Embed (PWA)   │◄──►│  Components     │◄──►│   Client     │  │
│  └────────┬────────┘    └────────┬────────┘   └───────┬───────┘  │
└───────────┼──────────────────────┼────────────────────┼──────────┘
            │                      │                    │
            │  HTTP (6002)         │  HTTP (6002)       │ WS (6003)
            ▼                      ▼                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                         Server Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Next.js (Port 6002)                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │
│  │  │ /api/chat   │  │ /api/mcp    │  │ /api/tabs           │  │  │
│  │  │ (AI Chat)   │  │ (MCP Ctrl)  │  │ (Tab Management)    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              WebSocket Server (Port 6003/6004)              │  │
│  │  ┌────────────────────┐    ┌────────────────────────────┐   │  │
│  │  │   WS:6003 (Sync)   │    │ HTTP:6004 (MCP API)        │   │  │
│  │  │ Browser ↔ Server   │    │ MCP → WS Broadcast         │   │  │
│  │  └────────────────────┘    └────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
            │
            │ stdio / HTTP (6004)
            ▼
┌───────────────────────────────────────────────────────────────────┐
│                    MCP Server (Python)                            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                 drawio-mcp-server (Port 6005)               │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │  │
│  │  │ diagram_tools│  │   tab_tools   │  │   diff_tools     │  │  │
│  │  │ (display,    │  │ (list, switch,│  │ (apply_changes,  │  │  │
│  │  │  modify)     │  │  create, save)│  │  get_changes)    │  │  │
│  │  └──────────────┘  └───────────────┘  └──────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
            │
            │ Model Context Protocol (stdio)
            ▼
┌───────────────────────────────────────────────────────────────────┐
│                   VS Code + GitHub Copilot                        │
│                   (Agent / LLM 控制層)                             │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🧱 DDD 分層架構

```
lib/
├── domain/                     # 領域層 - 核心業務邏輯
│   ├── diagram/               # 圖表聚合根
│   │   ├── Diagram.ts         # 圖表實體
│   │   ├── DiagramRepository.ts # 儲存庫介面
│   │   └── types.ts           # 類型定義
│   ├── checkpoint/            # 版本控制聚合根
│   │   ├── Checkpoint.ts      # 檢查點實體
│   │   ├── CheckpointManager.ts # Undo/Redo 管理
│   │   └── types.ts
│   └── shared/                # 共用基類
│       ├── Entity.ts
│       ├── ValueObject.ts
│       └── DomainEvent.ts
│
├── application/               # 應用層 - 使用案例
│   └── use-cases/
│       ├── SaveCheckpointUseCase.ts
│       ├── UndoOperationUseCase.ts
│       └── RedoOperationUseCase.ts
│
└── infrastructure/            # 基礎設施層 - 技術實作
    ├── drawio/
    │   └── DrawioAdapter.ts   # Draw.io 封裝
    └── persistence/
        └── LocalStorageCheckpointRepository.ts
```

---

## 🐳 Docker 服務架構

```yaml
services:
  web:        # Next.js 前端 (Port 6002)
  ws-server:  # WebSocket Server (Port 6003, 6004)
  mcp-server: # MCP Python Server (Port 6005)
```

| 服務 | 技術 | Port | 用途 |
|------|------|------|------|
| `web` | Next.js 15 | 6002 | 前端 + API Routes |
| `ws-server` | Node.js | 6003, 6004 | 即時通訊 |
| `mcp-server` | Python + official MCP SDK 2 | 6005 | Agent 控制 |

---

## 📂 目錄結構

```
next-ai-draw-io/
├── app/                       # Next.js App Router
│   ├── api/
│   │   ├── chat/             # AI 聊天 API
│   │   ├── mcp/              # MCP 控制 API
│   │   └── tabs/             # 分頁管理 API
│   ├── about/
│   └── page.tsx
│
├── components/                # React 元件
│   ├── ui/                   # 基礎 UI 元件
│   ├── chat-panel.tsx        # 聊天面板
│   ├── checkpoint-controls.tsx # Undo/Redo 控制
│   └── settings-dialog.tsx   # 設定對話框
│
├── contexts/                  # React Context
│   └── diagram-context.tsx   # 圖表狀態管理
│
├── hooks/                     # 自訂 Hooks
│   └── useCheckpoint.ts
│
├── lib/                       # 工具與 DDD 架構
│   ├── domain/               # 領域層
│   ├── application/          # 應用層
│   ├── infrastructure/       # 基礎設施層
│   └── ai-providers.ts       # AI Provider 配置
│
├── mcp-server/               # Python MCP Server
│   └── src/drawio_mcp_server/
│       ├── tools/            # MCP 工具
│       │   ├── diagram_tools.py
│       │   ├── tab_tools.py
│       │   └── diff_tools.py
│       └── drawing_guidelines.py
│
├── scripts/                   # 腳本
│   └── ws-server.ts          # WebSocket Server
│
├── tests/                     # 測試
│   ├── unit/                 # Vitest 單元測試
│   └── setup.ts
│
├── docker-compose.yml         # Docker 編排
├── Dockerfile                 # Next.js 容器
├── Dockerfile.ws              # WebSocket 容器
└── mcp-server/Dockerfile      # MCP 容器
```

---

## 🔄 資料流

### AI 聊天流程
```
User Input → ChatPanel → /api/chat → AI Provider → Tool Call → loadDiagram()
```

### MCP 控制流程
```
Copilot Agent → MCP Server → HTTP:6004 → WS Broadcast → Browser → Draw.io
```

### Checkpoint 流程
```
loadDiagram() → saveCheckpoint('agent') → CheckpointManager → Undo/Redo
```

---

## 🔗 相關文檔

- [ROADMAP.md](./ROADMAP.md) - 發展路線圖
- [README.md](./README.md) - 快速開始
- [docs/DDD_ARCHITECTURE.md](./docs/DDD_ARCHITECTURE.md) - DDD 詳細設計
