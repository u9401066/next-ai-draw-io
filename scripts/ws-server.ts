/**
 * 獨立 WebSocket Server 啟動腳本
 * 
 * 這個 server 與 Next.js 分開運行，處理瀏覽器和 MCP 之間的即時通訊
 * 
 * 使用方式：
 *   npx tsx scripts/ws-server.ts
 *   或
 *   node --loader ts-node/esm scripts/ws-server.ts
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

// 設定
const WS_PORT = parseInt(process.env.WS_PORT || '6003');
const API_PORT = parseInt(process.env.API_PORT || '6004'); // 給 MCP 用的 HTTP API

// === 類型定義 ===
interface WSMessage {
  type: string;
  timestamp: number;
  payload: unknown;
}

interface ClientInfo {
  id: string;
  subscribedTabs: Set<string>;
  connectedAt: number;
  lastPing: number;
}

// === 狀態管理 ===
const clients = new Map<string, { ws: WebSocket; info: ClientInfo }>();
let humanChanges: Record<string, unknown> | null = null;

// 待處理操作隊列
interface PendingOperation {
  requestId: string;
  operations: unknown[];
  preserveUserChanges: boolean;
  timestamp: number;
  resolved: boolean;
  result?: unknown;
}
const pendingOperations: PendingOperation[] = [];

// === 工具函數 ===
function generateClientId(): string {
  return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// === WebSocket Server ===
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`🔌 WebSocket Server started on ws://localhost:${WS_PORT}`);

wss.on('connection', (ws: WebSocket) => {
  const clientId = generateClientId();
  const clientInfo: ClientInfo = {
    id: clientId,
    subscribedTabs: new Set(),
    connectedAt: Date.now(),
    lastPing: Date.now(),
  };

  clients.set(clientId, { ws, info: clientInfo });
  console.log(`[WS] Client connected: ${clientId} (total: ${clients.size})`);

  // 發送連線確認
  ws.send(JSON.stringify({
    type: 'connection_ack',
    timestamp: Date.now(),
    payload: { clientId, serverTime: Date.now() },
  }));

  // 處理訊息
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
    console.log(`[WS] Client disconnected: ${clientId} (remaining: ${clients.size})`);
  });

  ws.on('error', (error) => {
    console.error(`[WS] Client error (${clientId}):`, error);
    clients.delete(clientId);
  });
});

// 心跳檢查
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

function handleClientMessage(clientId: string, message: WSMessage): void {
  const client = clients.get(clientId);
  if (!client) return;

  client.info.lastPing = Date.now();

  switch (message.type) {
    case 'ping':
      client.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now(),
        payload: { serverTime: Date.now() },
      }));
      break;

    case 'subscribe':
      const tabId = (message.payload as { tabId: string }).tabId;
      client.info.subscribedTabs.add(tabId);
      console.log(`[WS] Client ${clientId} subscribed to: ${tabId}`);
      break;

    case 'changes_report':
      humanChanges = message.payload as Record<string, unknown>;
      console.log(`[WS] Received changes report from ${clientId}`);
      break;

    case 'operation_result':
      const result = message.payload as { requestId: string; success: boolean };
      const op = pendingOperations.find(o => o.requestId === result.requestId);
      if (op) {
        op.resolved = true;
        op.result = message.payload;
        console.log(`[WS] Operation ${result.requestId} completed: ${result.success}`);
      }
      break;

    default:
      console.log(`[WS] Unknown message type: ${message.type}`);
  }
}

// === 廣播功能 ===
function broadcast(message: WSMessage, tabId?: string): void {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (tabId && client.info.subscribedTabs.size > 0 && !client.info.subscribedTabs.has(tabId)) {
      return;
    }
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

function broadcastDiagramUpdate(xml: string, tabId: string, tabName: string, action: string): void {
  broadcast({
    type: 'diagram_update',
    timestamp: Date.now(),
    payload: { xml, tabId, tabName, action },
  }, tabId);
}

function broadcastPendingOperations(requestId: string, operations: unknown[], preserveUserChanges: boolean): void {
  broadcast({
    type: 'pending_operations',
    timestamp: Date.now(),
    payload: { requestId, operations, preserveUserChanges },
  });
}

// === HTTP API (給 MCP 用) ===
const httpServer = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://localhost:${API_PORT}`);
  const action = url.searchParams.get('action');

  // GET 請求
  if (req.method === 'GET') {
    if (action === 'status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        wsPort: WS_PORT,
        apiPort: API_PORT,
        clients: clients.size,
        pendingOperations: pendingOperations.filter(o => !o.resolved).length,
      }));
      return;
    }

    if (action === 'get_changes') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        changes: humanChanges || { hasChanges: false },
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown action' }));
    return;
  }

  // POST 請求
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        if (data.action === 'display') {
          // 廣播圖表更新
          broadcastDiagramUpdate(data.xml, data.tabId || 'default', data.tabName || 'Diagram', 'display');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
          return;
        }

        if (data.action === 'apply_operations') {
          const requestId = generateRequestId();
          pendingOperations.push({
            requestId,
            operations: data.operations,
            preserveUserChanges: data.preserveUserChanges ?? true,
            timestamp: Date.now(),
            resolved: false,
          });
          
          // 廣播給瀏覽器執行
          broadcastPendingOperations(requestId, data.operations, data.preserveUserChanges ?? true);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, requestId }));
          return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unknown action' }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
});

httpServer.listen(API_PORT, () => {
  console.log(`📡 HTTP API Server started on http://localhost:${API_PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${API_PORT}?action=status     - Server status`);
  console.log(`  GET  http://localhost:${API_PORT}?action=get_changes - Get human changes`);
  console.log(`  POST http://localhost:${API_PORT} { action: "display", xml, tabId, tabName }`);
  console.log(`  POST http://localhost:${API_PORT} { action: "apply_operations", operations }`);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  wss.close();
  httpServer.close();
  process.exit(0);
});
