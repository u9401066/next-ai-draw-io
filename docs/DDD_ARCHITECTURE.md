# 🏗️ DDD 架構藍圖

> Domain-Driven Design Architecture Blueprint for Next-AI-Draw-IO

## 📐 分層架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  (React Components: ChatPanel, SettingsDialog, etc.)         │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                         │
│  (Use Cases: CreateDiagram, ApplyPreset, SyncToMCP)         │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│  (Aggregates: Diagram, Preset | Values: XMLContent, Color)   │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                       │
│  (MCP Adapter, WebSocket, AI Providers, LocalStorage)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 領域模型

### 1. Diagram 聚合根

```typescript
// lib/domain/diagram/diagram.ts
interface DiagramProps {
  id: string;
  name: string;
  xmlContent: XMLContent;
  preset?: DrawingPreset;
  createdAt: Date;
  updatedAt: Date;
}

class Diagram {
  private readonly props: DiagramProps;
  private domainEvents: DomainEvent[] = [];

  static create(name: string, xml?: string): Diagram;
  
  applyPreset(preset: DrawingPreset): void;
  updateContent(xml: string): void;
  
  // 領域事件
  getDomainEvents(): DomainEvent[];
  clearEvents(): void;
}
```

### 2. DrawingPreset 值物件

```typescript
// lib/domain/preset/drawing-preset.ts
interface DrawingPresetProps {
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
    palette: ColorPalette;
  };
  layout: {
    gridSize: number;
    spacing: number;
  };
}

class DrawingPreset {
  private constructor(private readonly props: DrawingPresetProps);
  
  static create(props: Partial<DrawingPresetProps>): DrawingPreset;
  static default(): DrawingPreset;
  
  toStyleString(): string;  // 轉換為 draw.io style 屬性
  toJSON(): object;
}
```

### 3. 領域事件

```typescript
// lib/domain/events/diagram-events.ts
abstract class DomainEvent {
  readonly occurredOn: Date = new Date();
}

class DiagramCreated extends DomainEvent {
  constructor(readonly diagramId: string, readonly name: string) { super(); }
}

class DiagramEdited extends DomainEvent {
  constructor(
    readonly diagramId: string,
    readonly changeType: 'content' | 'preset' | 'layout'
  ) { super(); }
}

class PresetApplied extends DomainEvent {
  constructor(
    readonly diagramId: string,
    readonly presetName: string
  ) { super(); }
}
```

---

## 📦 應用層

### Use Cases

```typescript
// lib/application/use-cases/create-diagram.ts
interface CreateDiagramInput {
  name: string;
  initialXml?: string;
  preset?: DrawingPreset;
}

interface CreateDiagramOutput {
  diagram: Diagram;
  events: DomainEvent[];
}

class CreateDiagramUseCase {
  constructor(
    private diagramRepository: DiagramRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(input: CreateDiagramInput): Promise<CreateDiagramOutput>;
}
```

```typescript
// lib/application/use-cases/sync-to-mcp.ts
interface SyncToMCPInput {
  diagram: Diagram;
  settings: ClientSettings;
}

class SyncToMCPUseCase {
  constructor(private mcpAdapter: MCPAdapter) {}

  async execute(input: SyncToMCPInput): Promise<void>;
}
```

---

## 🔌 基礎設施層

### Repository 介面

```typescript
// lib/domain/diagram/diagram-repository.ts
interface DiagramRepository {
  save(diagram: Diagram): Promise<void>;
  findById(id: string): Promise<Diagram | null>;
  findAll(): Promise<Diagram[]>;
  delete(id: string): Promise<void>;
}
```

### Adapter 實作

```typescript
// lib/infrastructure/mcp/mcp-adapter.ts
interface MCPAdapter {
  syncDiagram(xml: string): Promise<void>;
  syncSettings(settings: ClientSettings): Promise<void>;
  getChanges(): Promise<DiagramChanges>;
  applyOperations(operations: Operation[]): Promise<void>;
}

class HTTPMCPAdapter implements MCPAdapter {
  constructor(private baseUrl: string) {}
  // 實作...
}
```

```typescript
// lib/infrastructure/ai/ai-provider-adapter.ts
interface AIProviderAdapter {
  generateDiagram(prompt: string, context: DiagramContext): Promise<string>;
  editDiagram(xml: string, instruction: string): Promise<string>;
}

class BedrockAdapter implements AIProviderAdapter { /* ... */ }
class OpenAIAdapter implements AIProviderAdapter { /* ... */ }
class DeepSeekAdapter implements AIProviderAdapter { /* ... */ }
```

---

## 🔄 依賴注入

```typescript
// lib/infrastructure/di/container.ts
import { Container } from 'inversify';

const container = new Container();

// Repositories
container.bind<DiagramRepository>('DiagramRepository')
  .to(LocalStorageDiagramRepository);

// Adapters
container.bind<MCPAdapter>('MCPAdapter')
  .to(HTTPMCPAdapter);

container.bind<AIProviderAdapter>('AIProviderAdapter')
  .toDynamicValue(() => {
    const provider = process.env.AI_PROVIDER;
    switch (provider) {
      case 'bedrock': return new BedrockAdapter();
      case 'openai': return new OpenAIAdapter();
      // ...
    }
  });

// Use Cases
container.bind(CreateDiagramUseCase).toSelf();
container.bind(SyncToMCPUseCase).toSelf();

export { container };
```

---

## 📁 目錄結構

```
lib/
├── domain/
│   ├── diagram/
│   │   ├── diagram.ts              # 圖表聚合根
│   │   ├── diagram-repository.ts   # 儲存庫介面
│   │   └── xml-content.ts          # XML 值物件
│   ├── preset/
│   │   ├── drawing-preset.ts       # 繪圖偏好值物件
│   │   └── color-palette.ts        # 顏色調色板
│   ├── events/
│   │   └── diagram-events.ts       # 領域事件
│   └── shared/
│       └── entity.ts               # 基礎實體類別
│
├── application/
│   ├── use-cases/
│   │   ├── create-diagram.ts
│   │   ├── edit-diagram.ts
│   │   ├── apply-preset.ts
│   │   └── sync-to-mcp.ts
│   ├── services/
│   │   └── ai-diagram-service.ts
│   └── ports/
│       └── event-publisher.ts
│
├── infrastructure/
│   ├── persistence/
│   │   └── local-storage-repository.ts
│   ├── mcp/
│   │   └── http-mcp-adapter.ts
│   ├── websocket/
│   │   └── ws-client.ts
│   ├── ai/
│   │   ├── bedrock-adapter.ts
│   │   ├── openai-adapter.ts
│   │   └── deepseek-adapter.ts
│   └── di/
│       └── container.ts
│
└── presentation/
    └── hooks/
        ├── use-diagram.ts
        └── use-preset.ts
```

---

## 🚀 重構路徑

### Phase 5.1: 領域模型（週 1-2）
1. 建立 `Diagram` 聚合根
2. 建立 `DrawingPreset` 值物件
3. 定義領域事件

### Phase 5.2: 基礎設施（週 3-4）
1. 抽離 Repository 介面
2. 實作 MCP Adapter
3. 實作 AI Provider Adapter

### Phase 5.3: 應用服務（週 5-6）
1. 建立 Use Cases
2. 設定依賴注入
3. 整合到現有元件
