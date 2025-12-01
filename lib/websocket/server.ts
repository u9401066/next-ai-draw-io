/**
 * WebSocket Server 管理器
 * 
 * 注意：Next.js API Routes 不原生支援 WebSocket
 * 我們使用 custom server 或獨立的 WebSocket server
 * 
 * 這個模組提供 WebSocket 連線管理和訊息廣播功能
 */

import { WebSocketServer, WebSocket } from 'ws';
import type {
  WSMessage,
  WSClientInfo,
  DiagramUpdateMessage,
  PendingOperationsMessage,
  ConnectionAckMessage,
  PongMessage,
  DiagramOperation,
} from './types';

// 單例模式
let wss: WebSocketServer | null = null;
const clients = new Map<string, { ws: WebSocket; info: WSClientInfo }>();

// 生成唯一 client ID
function generateClientId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 初始化 WebSocket Server
 */
export function initWebSocketServer(port: number = 6003): WebSocketServer {
  if (wss) {
    console.log('[WS] WebSocket server already running');
    return wss;
  }

  wss = new WebSocketServer({ port });
  console.log(`[WS] WebSocket server started on port ${port}`);

  wss.on('connection', (ws: WebSocket) => {
    const clientId = generateClientId();
    const clientInfo: WSClientInfo = {
      id: clientId,
      subscribedTabs: new Set(),
      connectedAt: Date.now(),
      lastPing: Date.now(),
    };

    clients.set(clientId, { ws, info: clientInfo });
    console.log(`[WS] Client connected: ${clientId}`);

    // 發送連線確認
    const ackMessage: ConnectionAckMessage = {
      type: 'connection_ack',
      timestamp: Date.now(),
      payload: {
        clientId,
        serverTime: Date.now(),
      },
    };
    ws.send(JSON.stringify(ackMessage));

    // 處理來自 client 的訊息
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        handleClientMessage(clientId, message);
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    });

    // 處理斷線
    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`[WS] Client disconnected: ${clientId}`);
    });

    // 處理錯誤
    ws.on('error', (error) => {
      console.error(`[WS] Client error (${clientId}):`, error);
      clients.delete(clientId);
    });
  });

  // 心跳檢查 - 每 30 秒清理無回應的連線
  setInterval(() => {
    const now = Date.now();
    clients.forEach((client, clientId) => {
      if (now - client.info.lastPing > 60000) {
        console.log(`[WS] Removing stale client: ${clientId}`);
        client.ws.terminate();
        clients.delete(clientId);
      }
    });
  }, 30000);

  return wss;
}

/**
 * 處理來自 client 的訊息
 */
function handleClientMessage(clientId: string, message: WSMessage): void {
  const client = clients.get(clientId);
  if (!client) return;

  client.info.lastPing = Date.now();

  switch (message.type) {
    case 'ping':
      // 回應 pong
      const pongMessage: PongMessage = {
        type: 'pong',
        timestamp: Date.now(),
        payload: { serverTime: Date.now() },
      };
      client.ws.send(JSON.stringify(pongMessage));
      break;

    case 'subscribe':
      // 訂閱特定 tab
      const subscribePayload = message.payload as { tabId: string };
      client.info.subscribedTabs.add(subscribePayload.tabId);
      console.log(`[WS] Client ${clientId} subscribed to tab: ${subscribePayload.tabId}`);
      break;

    case 'changes_report':
      // 用戶變更報告 - 儲存到共享狀態
      onChangesReport(clientId, message);
      break;

    case 'operation_result':
      // 操作執行結果 - 通知等待者
      onOperationResult(clientId, message);
      break;

    default:
      console.log(`[WS] Unknown message type: ${message.type}`);
  }
}

// === 訊息處理 callbacks（由外部設定）===
let changesReportHandler: ((clientId: string, message: WSMessage) => void) | null = null;
let operationResultHandler: ((clientId: string, message: WSMessage) => void) | null = null;

export function setChangesReportHandler(handler: (clientId: string, message: WSMessage) => void): void {
  changesReportHandler = handler;
}

export function setOperationResultHandler(handler: (clientId: string, message: WSMessage) => void): void {
  operationResultHandler = handler;
}

function onChangesReport(clientId: string, message: WSMessage): void {
  if (changesReportHandler) {
    changesReportHandler(clientId, message);
  }
}

function onOperationResult(clientId: string, message: WSMessage): void {
  if (operationResultHandler) {
    operationResultHandler(clientId, message);
  }
}

// === 廣播功能 ===

/**
 * 廣播圖表更新給所有連線的 clients
 */
export function broadcastDiagramUpdate(
  xml: string,
  tabId: string,
  tabName: string,
  action: 'display' | 'edit' | 'switch'
): void {
  const message: DiagramUpdateMessage = {
    type: 'diagram_update',
    timestamp: Date.now(),
    payload: { xml, tabId, tabName, action },
  };

  broadcast(message, tabId);
}

/**
 * 廣播待執行操作給 clients
 */
export function broadcastPendingOperations(
  requestId: string,
  operations: DiagramOperation[],
  preserveUserChanges: boolean,
  tabId?: string
): void {
  const message: PendingOperationsMessage = {
    type: 'pending_operations',
    timestamp: Date.now(),
    payload: { requestId, operations, preserveUserChanges },
  };

  broadcast(message, tabId);
}

/**
 * 廣播訊息給所有 clients 或特定 tab 的訂閱者
 */
function broadcast(message: WSMessage, tabId?: string): void {
  const messageStr = JSON.stringify(message);

  clients.forEach((client) => {
    // 如果指定了 tabId，只發給訂閱該 tab 的 clients
    if (tabId && !client.info.subscribedTabs.has(tabId) && client.info.subscribedTabs.size > 0) {
      return;
    }

    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

/**
 * 獲取當前連線的 client 數量
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * 獲取 WebSocket server 狀態
 */
export function getServerStatus(): {
  running: boolean;
  clientCount: number;
  clients: { id: string; subscribedTabs: string[]; connectedAt: number }[];
} {
  return {
    running: wss !== null,
    clientCount: clients.size,
    clients: Array.from(clients.values()).map((c) => ({
      id: c.info.id,
      subscribedTabs: Array.from(c.info.subscribedTabs),
      connectedAt: c.info.connectedAt,
    })),
  };
}

/**
 * 關閉 WebSocket server
 */
export function closeWebSocketServer(): void {
  if (wss) {
    wss.close();
    wss = null;
    clients.clear();
    console.log('[WS] WebSocket server closed');
  }
}
