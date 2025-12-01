/**
 * WebSocket 訊息類型定義
 * 定義 Client/Server 之間的通訊協定
 */

// === 基礎訊息結構 ===

export interface WSMessage {
  type: WSMessageType;
  timestamp: number;
  payload: unknown;
}

export type WSMessageType =
  // Server → Client
  | 'diagram_update'      // 新圖表需要載入
  | 'pending_operations'  // 有待執行的操作
  | 'connection_ack'      // 連線確認
  | 'pong'                // 心跳回應
  // Client → Server
  | 'changes_report'      // 回報用戶變更
  | 'operation_result'    // 操作執行結果
  | 'subscribe'           // 訂閱特定 tab
  | 'ping';               // 心跳請求

// === Server → Client 訊息 ===

export interface DiagramUpdateMessage extends WSMessage {
  type: 'diagram_update';
  payload: {
    xml: string;
    tabId: string;
    tabName: string;
    action: 'display' | 'edit' | 'switch';
  };
}

export interface PendingOperationsMessage extends WSMessage {
  type: 'pending_operations';
  payload: {
    requestId: string;
    operations: DiagramOperation[];
    preserveUserChanges: boolean;
  };
}

export interface ConnectionAckMessage extends WSMessage {
  type: 'connection_ack';
  payload: {
    clientId: string;
    serverTime: number;
  };
}

export interface PongMessage extends WSMessage {
  type: 'pong';
  payload: {
    serverTime: number;
  };
}

// === Client → Server 訊息 ===

export interface ChangesReportMessage extends WSMessage {
  type: 'changes_report';
  payload: {
    tabId: string;
    changes: HumanChanges;
  };
}

export interface OperationResultMessage extends WSMessage {
  type: 'operation_result';
  payload: {
    requestId: string;
    success: boolean;
    applied: number;
    conflicts: ConflictInfo[];
    newXml?: string;
  };
}

export interface SubscribeMessage extends WSMessage {
  type: 'subscribe';
  payload: {
    tabId: string;
  };
}

export interface PingMessage extends WSMessage {
  type: 'ping';
  payload: {};
}

// === 共用類型 ===

// 匯入並重新匯出 diagram-operations-handler 的類型
// 以確保類型一致性
export interface DiagramOperation {
  op: 'add_node' | 'modify_node' | 'delete_node' | 'add_edge' | 'modify_edge' | 'delete_edge' | 'move' | 'style';
  id?: string;
  [key: string]: unknown;
}

export interface ConflictInfo {
  operationIndex: number;
  description: string;
  resolution: 'skipped' | 'forced' | 'merged';
}

export interface HumanChanges {
  hasChanges: boolean;
  operations: {
    added: { id: string; type: string; value: string }[];
    modified: { id: string; field: string; before: unknown; after: unknown }[];
    deleted: { id: string; type: string; value?: string }[];
  };
  summary: string;
}

// === 工具函數類型 ===

export type MessageHandler<T extends WSMessage = WSMessage> = (
  message: T,
  clientId: string
) => void | Promise<void>;

export interface WSClientInfo {
  id: string;
  subscribedTabs: Set<string>;
  connectedAt: number;
  lastPing: number;
}
