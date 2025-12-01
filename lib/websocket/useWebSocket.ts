"use client";

/**
 * useWebSocket Hook
 * 
 * 管理瀏覽器端 WebSocket 連線生命週期
 * 自動重連、心跳檢測、訊息處理
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  WSMessage,
  DiagramUpdateMessage,
  PendingOperationsMessage,
  ChangesReportMessage,
  OperationResultMessage,
  HumanChanges,
  ConflictInfo,
} from './types';

interface UseWebSocketOptions {
  url: string;
  onDiagramUpdate?: (payload: DiagramUpdateMessage['payload']) => void;
  onPendingOperations?: (payload: PendingOperationsMessage['payload']) => void;
  onConnected?: (clientId: string) => void;
  onDisconnected?: () => void;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  clientId: string | null;
  sendChangesReport: (tabId: string, changes: HumanChanges) => void;
  sendOperationResult: (
    requestId: string,
    success: boolean,
    applied: number,
    conflicts: ConflictInfo[],
    newXml?: string
  ) => void;
  subscribe: (tabId: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onDiagramUpdate,
    onPendingOperations,
    onConnected,
    onDisconnected,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // 發送訊息
  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // 處理收到的訊息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as WSMessage;
      
      switch (message.type) {
        case 'connection_ack':
          const ackPayload = message.payload as { clientId: string };
          setClientId(ackPayload.clientId);
          onConnected?.(ackPayload.clientId);
          console.log('[WS Client] Connected with ID:', ackPayload.clientId);
          break;

        case 'diagram_update':
          const updatePayload = (message as DiagramUpdateMessage).payload;
          onDiagramUpdate?.(updatePayload);
          break;

        case 'pending_operations':
          const opsPayload = (message as PendingOperationsMessage).payload;
          onPendingOperations?.(opsPayload);
          break;

        case 'pong':
          // 心跳回應，不需特別處理
          break;

        default:
          console.log('[WS Client] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[WS Client] Error parsing message:', error);
    }
  }, [onConnected, onDiagramUpdate, onPendingOperations]);

  // 建立連線
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      console.log('[WS Client] Connecting to:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS Client] Connection opened');
        setIsConnected(true);
        
        // 開始心跳
        heartbeatIntervalRef.current = setInterval(() => {
          sendMessage({
            type: 'ping',
            timestamp: Date.now(),
            payload: {},
          });
        }, heartbeatInterval);
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        console.log('[WS Client] Connection closed');
        setIsConnected(false);
        setClientId(null);
        onDisconnected?.();
        
        // 清理心跳
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // 嘗試重連
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WS Client] Attempting reconnection...');
          connect();
        }, reconnectInterval);
      };

      ws.onerror = (error) => {
        console.error('[WS Client] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[WS Client] Failed to connect:', error);
    }
  }, [url, handleMessage, sendMessage, heartbeatInterval, reconnectInterval, onDisconnected]);

  // 初始化連線
  useEffect(() => {
    connect();

    return () => {
      // 清理
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // === 公開 API ===

  // 回報用戶變更
  const sendChangesReport = useCallback((tabId: string, changes: HumanChanges) => {
    const message: ChangesReportMessage = {
      type: 'changes_report',
      timestamp: Date.now(),
      payload: { tabId, changes },
    };
    sendMessage(message);
  }, [sendMessage]);

  // 回報操作結果
  const sendOperationResult = useCallback((
    requestId: string,
    success: boolean,
    applied: number,
    conflicts: ConflictInfo[],
    newXml?: string
  ) => {
    const message: OperationResultMessage = {
      type: 'operation_result',
      timestamp: Date.now(),
      payload: { requestId, success, applied, conflicts, newXml },
    };
    sendMessage(message);
  }, [sendMessage]);

  // 訂閱特定 tab
  const subscribe = useCallback((tabId: string) => {
    sendMessage({
      type: 'subscribe',
      timestamp: Date.now(),
      payload: { tabId },
    });
  }, [sendMessage]);

  return {
    isConnected,
    clientId,
    sendChangesReport,
    sendOperationResult,
    subscribe,
  };
}
