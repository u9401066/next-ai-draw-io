# 🗺️ Next-AI-Draw-IO 發展路線圖

> 最後更新：2024-12-08  
> 專案定位：**研究流程圖繪製工具** + **互動式繪圖 MCP Server**

---

## 🎯 專案願景

這個 fork 專案有兩個主要目標：
1. **研究用途**：協助繪製研究流程圖、實驗架構圖
2. **MCP 擴展**：打造更強大的互動式繪圖 Agent 體驗

---

## 📊 專案現況

### ✅ 已完成功能
- [x] 多模型支援（Bedrock, OpenAI, Anthropic, Google, Azure, Ollama, OpenRouter, DeepSeek）
- [x] MCP Server 整合（GitHub Copilot Agent 支援）
- [x] WebSocket 即時同步
- [x] 圖表變更追蹤（diff tracking）
- [x] **動態連接線** (`flowAnimation=1`)
- [x] 可調整大小的聊天面板
- [x] 設定對話框（動態切換模型）
- [x] 繁體中文介面
- [x] Markdown 訊息渲染
- [x] **繪圖指南框架** (`drawing_guidelines.py` - 尚未整合到前端)

---

## 🚀 Phase 1：繪圖偏好系統（優先）

> 目標：讓使用者可以設定並儲存繪圖風格偏好

### 📐 Preset 系統
- [ ] **前端偏好設定面板**
  - [ ] 連接線樣式選擇（直線 / 轉角線 / 曲線）
  - [ ] 預設箭頭樣式
  - [ ] 陰影開關 (`shadow=1`)
  - [ ] 圓角設定 (`rounded=1`)
  - [ ] 預設顏色調色板

- [ ] **偏好持久化**
  - [ ] 儲存到 localStorage
  - [ ] 同步到 MCP（讓 Agent 知道偏好）
  - [ ] 匯入/匯出偏好設定檔 (JSON)

- [ ] **整合現有 `drawing_guidelines.py`**
  - [ ] 將 Python 端的 `DrawingGuidelines` 同步到前端
  - [ ] MCP 提供 `get_drawing_preferences` 工具

### 💾 建議的資料結構
```typescript
interface DrawingPreset {
  name: string;
  edge: {
    style: 'orthogonal' | 'straight' | 'curved';
    rounded: boolean;
    strokeWidth: number;
    arrowEnd: 'classic' | 'block' | 'open' | 'none';
  };
  shape: {
    shadow: boolean;
    rounded: boolean;
    strokeWidth: number;
    defaultPalette: 'blue' | 'green' | 'gray' | 'custom';
  };
  layout: {
    gridSize: number;
    spacing: number;
  };
}
```

---

## 🤖 Phase 2：MCP Agent 增強

> 目標：讓 Agent 更懂使用者，提供更智慧的互動

### 📡 Agent 資訊共享
- [ ] **同步繪圖偏好到 MCP**
  - [ ] `POST /api/mcp` action: `sync_drawing_preferences`
  - [ ] `GET /api/mcp?action=get_drawing_preferences`
  
- [ ] **提供更多上下文給 Agent**
  - [ ] 當前圖表類型（流程圖、ER圖、架構圖）
  - [ ] 使用者最近的編輯操作
  - [ ] 圖表元素統計（節點數、連接數）

### 🔄 雙向互動增強
- [ ] **Agent 主動建議**
  - [ ] 偵測到圖表混亂時建議重新排版
  - [ ] 發現未連接節點時提醒
  - [ ] 風格不一致時建議統一

- [ ] **使用者意圖理解**
  - [ ] 「幫我美化」→ 自動套用 preset
  - [ ] 「改成研究風格」→ 套用學術圖表樣式
  - [ ] 「加上時間軸」→ 自動加入時序元素

### 🎨 MCP 新工具
- [ ] `apply_preset` - 套用繪圖偏好到全圖
- [ ] `auto_layout` - 自動重新排版
- [ ] `validate_diagram` - 檢查圖表完整性
- [ ] `suggest_improvements` - 給出改進建議

---

## 🧠 Phase 1.5：智慧 Tool 系統（核心創新）

> 目標：讓每個 MCP Tool 自帶適合的繪圖設定，Agent 一呼叫就懂該怎麼畫

### 🎯 核心概念

**問題**：目前 Agent 每次繪圖都要重新指定樣式，容易不一致
**解法**：每個 Tool 內建預設參數，Agent 只需說「畫流程圖」就自動套用最佳設定

### 🛠️ Smart Tool 定義

```python
# mcp-server/src/drawio_mcp_server/smart_tools.py

SMART_TOOLS = {
    # ===== 流程圖系列 =====
    "draw_flowchart": {
        "description": "繪製標準流程圖（自動使用圓角轉折線）",
        "category": "flowchart",
        "default_preset": {
            "edge": {
                "style": "orthogonal",
                "rounded": True,
                "strokeWidth": 2,
                "arrowEnd": "classic"
            },
            "shape": {
                "rounded": True,
                "shadow": False,
                "palette": "blue_green"  # 藍底綠開始紅結束
            }
        },
        "guidelines": [
            "開始/結束用橢圓",
            "處理步驟用圓角矩形",
            "決策用菱形",
            "流向由上到下或左到右"
        ]
    },
    
    # ===== 研究專用系列 =====
    "draw_research_flow": {
        "description": "繪製研究流程圖（PRISMA 相容樣式）",
        "category": "research",
        "default_preset": {
            "edge": {
                "style": "orthogonal",
                "rounded": True,
                "strokeWidth": 1.5,
                "arrowEnd": "classic"
            },
            "shape": {
                "rounded": True,
                "shadow": False,
                "palette": "academic_neutral"  # 灰階為主
            }
        },
        "template": "prisma",  # 可選：prisma, consort, strobe
        "guidelines": [
            "使用 PRISMA 2020 標準結構",
            "標註篩選數量",
            "保持學術中性色調"
        ]
    },
    
    "draw_experiment_design": {
        "description": "繪製實驗設計圖（分組、變數）",
        "category": "research",
        "default_preset": {
            "edge": {"style": "orthogonal", "rounded": True},
            "shape": {"palette": "experiment_groups"}
        },
        "guidelines": [
            "控制組/實驗組用不同顏色",
            "自變數→處理→依變數流向",
            "標註樣本數 N=xxx"
        ]
    },
    
    # ===== 架構圖系列 =====
    "draw_architecture": {
        "description": "繪製系統架構圖（AWS/GCP 風格）",
        "category": "architecture",
        "default_preset": {
            "edge": {"style": "orthogonal", "rounded": False},
            "shape": {
                "shadow": True,
                "use_icons": True,
                "palette": "cloud_provider"
            }
        },
        "icon_set": "aws2025",  # aws2025, gcp, azure
        "guidelines": [
            "使用官方雲端圖示",
            "分層：用戶→前端→後端→資料庫",
            "標註服務名稱和連接埠"
        ]
    },
    
    # ===== 關係圖系列 =====
    "draw_er_diagram": {
        "description": "繪製 ER 圖（資料庫關係）",
        "category": "database",
        "default_preset": {
            "edge": {
                "style": "entityRelation",
                "arrowStart": "ERmany",
                "arrowEnd": "ERone"
            },
            "shape": {"palette": "database"}
        }
    },
    
    "draw_sequence": {
        "description": "繪製序列圖（訊息傳遞）",
        "category": "uml",
        "default_preset": {
            "edge": {"style": "orthogonal", "dashed": False},
            "shape": {"lifeline": True}
        }
    }
}
```

### 📡 API 設計

```typescript
// POST /api/mcp action: invoke_smart_tool
interface InvokeSmartToolRequest {
  toolName: string;           // e.g., "draw_flowchart"
  prompt: string;             // 使用者的描述
  overridePreset?: Partial<DrawingPreset>;  // 可選覆蓋
}

// GET /api/mcp?action=list_smart_tools
// 回傳所有可用的 Smart Tool 及其預設設定
```

### 🔄 Preset 熱替換機制

```typescript
// 三種替換方式

// 1. 前端直接替換（使用者操作）
const handlePresetChange = (presetName: string) => {
  fetch('/api/mcp', {
    method: 'POST',
    body: JSON.stringify({
      action: 'apply_preset',
      presetName,
      scope: 'all'  // 'all' | 'selected' | 'new_only'
    })
  });
};

// 2. Agent 透過 MCP 替換
// Agent: "請套用研究風格"
// MCP: invoke apply_preset with presetName="research_academic"

// 3. Smart Tool 自動套用（繪製時自帶）
// Agent: "畫一個研究流程圖"
// MCP: 自動使用 draw_research_flow 的 default_preset
```

### 📋 實作步驟

- [ ] **Step 1**：定義 SmartTool Schema
  - [ ] 建立 `mcp-server/src/drawio_mcp_server/smart_tools.py`
  - [ ] 定義 6 個核心 Smart Tool
  - [ ] 每個 Tool 包含 description, preset, guidelines

- [ ] **Step 2**：整合到 MCP Server
  - [ ] 修改 `tools/__init__.py` 載入 Smart Tools
  - [ ] 實作 `invoke_smart_tool` handler
  - [ ] 實作 `list_smart_tools` handler

- [ ] **Step 3**：前端 Preset Picker
  - [ ] 建立 `PresetPicker` 元件
  - [ ] 顯示可用 Preset 列表（從 MCP 取得）
  - [ ] 支援即時預覽

- [ ] **Step 4**：熱替換 API
  - [ ] 實作 `apply_preset` 到現有圖表
  - [ ] 支援 scope 選項（全部/選取/僅新增）

### 🎨 內建 Preset 列表

| Preset 名稱 | 適用場景 | 特色 |
|------------|---------|------|
| `flowchart_default` | 一般流程圖 | 圓角線、藍色系 |
| `research_academic` | 學術研究 | PRISMA 相容、中性色 |
| `research_experiment` | 實驗設計 | 分組色彩、變數標註 |
| `architecture_aws` | AWS 架構 | 2025 圖示、陰影 |
| `architecture_gcp` | GCP 架構 | GCP 圖示 |
| `database_er` | ER 圖 | 關係線、基數標註 |
| `minimal_clean` | 簡約風格 | 無陰影、細線條 |
| `presentation` | 簡報用 | 大字體、高對比 |

---

## 📚 Phase 3：研究專用功能

> 目標：針對學術研究場景優化

### 📊 研究圖表樣板
- [ ] **實驗流程圖**（含變數、分組）
- [ ] **文獻回顧圖**（PRISMA 流程）
- [ ] **方法論圖**（研究設計）
- [ ] **資料流程圖**（ETL Pipeline）
- [ ] **統計分析流程**

### 📝 學術標準
- [ ] APA/IEEE 風格的圖表格式
- [ ] 圖表編號與說明（Figure 1. xxx）
- [ ] 匯出高解析度圖片（300 DPI+）
- [ ] LaTeX TikZ 匯出（選配）

---

## 🔮 Phase 4：進階功能

### 協作與版本
- [ ] 圖表歷史版本瀏覽
- [ ] 變更對比（類似 Git diff）
- [ ] 團隊協作基礎

### 整合
- [ ] VS Code 擴充套件
- [ ] Obsidian 插件
- [ ] Notion 嵌入

---

## 🏗️ Phase 5：DDD 架構重構

> 目標：採用 Domain-Driven Design 提升程式碼品質和可維護性

### 📐 分層架構

```
lib/
├── domain/                 # 領域層（核心業務邏輯）
│   ├── diagram/           # 圖表聚合根
│   │   ├── diagram.ts     # 圖表實體
│   │   ├── diagram-repository.ts  # 儲存庫介面
│   │   └── events/        # 領域事件
│   ├── preset/            # 繪圖偏好值物件
│   │   ├── drawing-preset.ts
│   │   └── color-palette.ts
│   └── shared/            # 共用值物件
│       └── xml-content.ts
│
├── application/            # 應用層（使用案例）
│   ├── use-cases/
│   │   ├── create-diagram.ts
│   │   ├── apply-preset.ts
│   │   └── sync-to-mcp.ts
│   └── services/
│       └── ai-diagram-service.ts
│
├── infrastructure/         # 基礎設施層（技術實作）
│   ├── persistence/
│   │   └── local-storage-repository.ts
│   ├── mcp/
│   │   └── mcp-adapter.ts
│   ├── websocket/
│   │   └── ws-client.ts
│   └── ai/
│       └── ai-provider-adapter.ts
│
└── presentation/           # 表現層（現有 components）
    └── (現有的 React 元件)
```

### 🔄 重構步驟
- [ ] **Phase 5.1**：定義領域模型
  - [ ] `Diagram` 聚合根
  - [ ] `DrawingPreset` 值物件
  - [ ] 領域事件（DiagramCreated, DiagramEdited）

- [ ] **Phase 5.2**：抽離基礎設施
  - [ ] 建立 Repository 介面
  - [ ] MCP Adapter 實作
  - [ ] AI Provider Adapter 實作

- [ ] **Phase 5.3**：建立應用服務
  - [ ] Use Case 實作
  - [ ] 依賴注入設定

---

## 🔒 Phase 6：企業級安全

> 目標：達到企業級安全標準

### 🛡️ 傳輸安全
- [ ] **HTTPS 強制**
  - [ ] 生產環境 SSL 憑證
  - [ ] HTTP → HTTPS 自動重導向
  - [ ] HSTS Header

- [ ] **API 安全**
  - [ ] 所有 API 使用 POST（避免 GET 洩漏參數）
  - [ ] CORS 白名單設定
  - [ ] Request Rate Limiting

### 🔑 存取控制
- [ ] **Access Code 強化**
  - [ ] 密碼雜湊儲存
  - [ ] 登入失敗鎖定
  - [ ] Session Token 機制

- [ ] **API Key 管理**
  - [ ] 環境變數加密
  - [ ] Key 輪替機制
  - [ ] 審計日誌

### 📊 監控與日誌
- [ ] 安全事件日誌
- [ ] 異常存取告警
- [ ] 操作審計追蹤

### 🚀 部署安全
```yaml
# 建議的 Docker Compose 設定
services:
  app:
    image: next-ai-draw-io
    environment:
      - NODE_ENV=production
    networks:
      - internal
  
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
    networks:
      - internal
      - external
```

---

## 💡 Phase 1.7：分階段繪圖策略（Token 優化）

> 目標：解決複雜圖表爆 token 的問題，讓 Agent 可以多次追加繪製

### 🎯 問題分析

**現況**：複雜圖表一次生成很容易爆 token
**好消息**：我們的 MCP 已經有 `apply_diagram_changes` 支援增量操作！

### ✅ 已有的增量工具

| 工具 | 說明 | 檔案 |
|------|------|------|
| `apply_diagram_changes` | 增量新增/修改/刪除節點和連線 | `diff_tools.py` |
| `get_diagram_elements` | 取得現有元素列表和 ID | `diff_tools.py` |
| `get_diagram_changes` | 偵測用戶手動編輯的變更 | `diff_tools.py` |
| `sync_diagram_state` | 同步 Agent 和 Browser 狀態 | `diff_tools.py` |

### 🔧 需要加強的部分

- [ ] **Agent 引導提示**：讓 Agent 知道可以分批繪製
  ```python
  # 修改 system prompt，加入多步驟繪圖引導
  MULTI_STEP_GUIDANCE = """
  對於複雜圖表，你應該分階段繪製：
  
  1. 第一步：畫骨架（主要節點和結構）
  2. 第二步：加入細節（次要節點、標籤）
  3. 第三步：美化（樣式、對齊）
  
  使用 apply_diagram_changes 來追加元素，不要每次都重新生成完整 XML。
  使用 get_diagram_elements 來查詢現有元素的 ID。
  """
  ```

- [ ] **繪圖進度追蹤**
  ```typescript
  interface DrawingSession {
    sessionId: string;
    totalSteps: number;
    currentStep: number;
    completedNodes: string[];  // 已繪製的節點 ID
    pendingNodes: string[];    // 待繪製的節點
    status: 'planning' | 'drawing' | 'refining' | 'done';
  }
  ```

- [ ] **自動分批建議**
  - Agent 分析圖表複雜度
  - 超過 N 個節點時自動建議分批
  - 提供預估步驟數

### 📋 實作步驟

- [ ] **Step 1**：修改 `app/api/chat/route.ts` 加入多步驟引導
- [ ] **Step 2**：建立 `DrawingSession` 追蹤機制
- [ ] **Step 3**：加入複雜度分析函數

---

## 📋 Phase 1.8：學術模板發現系統

> 問題：我們怎麼知道有哪些 template 可以套用？

### 🎯 解決方案

1. **內建模板庫**：預定義常見學術圖表模板
2. **模板元資料**：每個模板帶有描述和適用場景
3. **模板建議**：根據用戶描述自動推薦適合的模板

### 📚 學術模板定義

```python
# mcp-server/src/drawio_mcp_server/academic_templates.py

ACADEMIC_TEMPLATES = {
    # ===== 文獻回顧 =====
    "prisma_2020": {
        "name": "PRISMA 2020 流程圖",
        "category": "literature_review",
        "description": "系統性文獻回顧的標準篩選流程",
        "keywords": ["文獻", "篩選", "納入排除", "系統性回顧", "meta-analysis"],
        "structure": {
            "sections": ["識別", "篩選", "適用性", "納入"],
            "required_fields": ["記錄數", "排除原因"]
        },
        "preview_image": "/templates/prisma_2020.svg"
    },
    
    "consort_2010": {
        "name": "CONSORT 2010 流程圖",
        "category": "clinical_trial",
        "description": "隨機對照試驗的參與者流程",
        "keywords": ["RCT", "臨床試驗", "隨機分組", "追蹤流失"],
    },
    
    # ===== 實驗設計 =====
    "2x2_factorial": {
        "name": "2×2 因子設計圖",
        "category": "experiment",
        "description": "雙因子實驗設計結構",
        "keywords": ["實驗設計", "因子", "交互作用", "分組"],
    },
    
    "pretest_posttest": {
        "name": "前後測實驗設計",
        "category": "experiment",
        "description": "實驗組對照組前後測設計",
        "keywords": ["前測", "後測", "控制組", "實驗組"],
    },
    
    # ===== 方法論 =====
    "research_framework": {
        "name": "研究架構圖",
        "category": "methodology",
        "description": "研究變數關係與假設",
        "keywords": ["研究架構", "假設", "自變數", "依變數"],
    },
    
    "mixed_methods": {
        "name": "混合方法設計",
        "category": "methodology",
        "description": "質量混合研究程序",
        "keywords": ["混合方法", "質性", "量化", "三角驗證"],
    },
    
    # ===== 資料處理 =====
    "data_pipeline": {
        "name": "資料處理流程",
        "category": "data_science",
        "description": "ETL 和資料分析流程",
        "keywords": ["ETL", "資料清理", "特徵工程", "模型訓練"],
    },
}
```

### 📡 模板發現 API

```typescript
// GET /api/mcp?action=discover_templates
interface DiscoverTemplatesRequest {
  query?: string;           // 用戶描述，如「我要做文獻回顧」
  category?: string;        // 分類過濾
}

// Response
interface TemplateRecommendation {
  templateId: string;
  name: string;
  relevanceScore: number;   // 0-1 相關度
  description: string;
  previewUrl?: string;
}

// MCP Tool
@mcp.tool("discover_templates")
async def discover_templates(query: str = None, category: str = None) -> str:
    """
    根據描述推薦適合的學術模板。
    
    例如：
    - "我要做系統性文獻回顧" → 推薦 PRISMA 2020
    - "需要畫實驗設計" → 推薦 2x2 factorial, pretest-posttest
    """
```

### 📋 實作步驟

- [ ] **Step 1**：建立 `academic_templates.py` 定義模板
- [ ] **Step 2**：實作 `discover_templates` MCP 工具
- [ ] **Step 3**：加入關鍵字相似度匹配
- [ ] **Step 4**：前端模板選擇器 UI

---

## 🔄 Phase 1.9：語法互轉（Mermaid ↔ Draw.io XML）

> Mermaid 語法有比現在的 XML 語法好嗎？

### 📊 語法比較

| 面向 | Mermaid | Draw.io XML | 結論 |
|------|---------|-------------|------|
| **可讀性** | ⭐⭐⭐⭐⭐ 人類友善 | ⭐⭐ 冗長 | Mermaid 勝 |
| **Token 效率** | ⭐⭐⭐⭐⭐ 極省 | ⭐⭐ 消耗大 | Mermaid 勝 |
| **樣式控制** | ⭐⭐ 有限 | ⭐⭐⭐⭐⭐ 完全控制 | XML 勝 |
| **複雜圖表** | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 完全支援 | XML 勝 |
| **LLM 生成** | ⭐⭐⭐⭐⭐ 容易 | ⭐⭐⭐ 中等 | Mermaid 勝 |

### 💡 建議策略

**不是二選一，而是混合使用：**

1. **Mermaid 輸入**：讓 Agent 先用 Mermaid 描述結構（省 token）
2. **XML 輸出**：轉換為 Draw.io XML（保留樣式控制）
3. **雙向轉換**：支援 Mermaid ↔ XML 互轉

### 🔧 實作方案

```typescript
// 轉換服務
interface DiagramConverter {
  mermaidToXml(mermaid: string, preset?: DrawingPreset): string;
  xmlToMermaid(xml: string): string;
}

// 使用流程
// 1. Agent 生成 Mermaid（節省 token）
const mermaid = `
flowchart TD
  A[開始] --> B{決策}
  B -->|Yes| C[處理]
  B -->|No| D[結束]
`;

// 2. 轉換為 XML 並套用 preset
const xml = converter.mermaidToXml(mermaid, presets.research_academic);
```

### 📋 實作步驟

- [ ] **Step 1**：研究 Mermaid 解析庫（mermaid-js）
- [ ] **Step 2**：實作 Mermaid → XML 轉換器
- [ ] **Step 3**：實作 XML → Mermaid 轉換器
- [ ] **Step 4**：加入到 MCP 作為可選輸入格式

---

## 🎨 Phase 1.10：草圖轉精細圖

> 草圖上傳轉正式繪圖

### 🎯 功能說明

用戶上傳手繪草圖或簡易截圖，AI 自動：
1. 識別圖表結構
2. 轉換為標準 Draw.io 圖表
3. 套用選定的 preset 美化

### 🔧 實作方案

```python
# 使用 Vision 模型分析草圖
@mcp.tool("sketch_to_diagram")
async def sketch_to_diagram(
    image_base64: str,
    target_style: str = "flowchart_default",
    enhance_labels: bool = True
) -> str:
    """
    將手繪草圖或圖片轉換為精細的 Draw.io 圖表。
    
    1. 使用 Vision 模型識別：
       - 節點位置和形狀
       - 連線關係
       - 文字標籤
    
    2. 生成結構化數據
    
    3. 套用指定的 preset 美化
    """
```

### 📋 實作步驟

- [ ] **Step 1**：加入圖片分析提示詞
- [ ] **Step 2**：結構化輸出解析
- [ ] **Step 3**：生成對應的 apply_diagram_changes 操作

---

## 💭 想法收集

> 隨時記錄靈感

- 研究流程的「標準元件庫」
- 自動從論文摘要生成流程圖
- 圖表 → LaTeX TikZ 程式碼轉換
- **已加入**：分階段繪圖、模板發現、語法互轉、草圖轉圖
- 

---

## 📝 技術債與已知問題

| 問題 | 優先級 | 備註 |
|------|--------|------|
| `drawing_guidelines.py` 未整合到前端 | 高 | Phase 1 處理 |
| `chat-example-panel.tsx` 文字未翻譯 | 中 | 需要繁中化 |
| React 類型警告 | 低 | 不影響功能 |

---

## 📚 文件索引

| 文件 | 說明 |
|------|------|
| [README.md](README.md) | 專案說明 |
| [ROADMAP.md](ROADMAP.md) | 發展路線圖 |
| [docs/DDD_ARCHITECTURE.md](docs/DDD_ARCHITECTURE.md) | DDD 架構藍圖 |
| [LICENSE](LICENSE) | Apache 2.0 授權 |
