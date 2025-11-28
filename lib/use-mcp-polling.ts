"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseMCPPollingOptions {
  onUpdate: (xml: string) => void;
  enabled?: boolean;
  pollInterval?: number;
  getCurrentXml?: () => string | null; // 新增：取得當前圖表 XML 的函數
}

/**
 * Hook to poll for MCP updates from the backend
 * This enables GitHub Copilot to control the diagram through the MCP Server
 */
export function useMCPPolling({
  onUpdate,
  enabled = true,
  pollInterval = 1000,
  getCurrentXml,
}: UseMCPPollingOptions) {
  const lastTimestampRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  
  const getCurrentXmlRef = useRef(getCurrentXml);
  getCurrentXmlRef.current = getCurrentXml;

  const poll = useCallback(async () => {
    if (isPollingRef.current) return;
    
    isPollingRef.current = true;
    try {
      const response = await fetch(
        `/api/mcp?action=poll&since=${lastTimestampRef.current}`
      );
      
      if (!response.ok) {
        console.error("[MCP Polling] Failed to poll:", response.statusText);
        return;
      }

      const data = await response.json();
      
      if (data.hasUpdate && data.xml) {
        lastTimestampRef.current = data.timestamp;
        onUpdateRef.current(data.xml);
      }
      
      // 每次 poll 時，順便同步當前圖表狀態到後端（讓 save_tab 能取得最新內容）
      if (getCurrentXmlRef.current) {
        const currentXml = getCurrentXmlRef.current();
        if (currentXml) {
          await fetch("/api/mcp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync", xml: currentXml }),
          });
        }
      }
    } catch (error) {
      console.error("[MCP Polling] Poll failed:", error);
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Start polling
    const intervalId = setInterval(poll, pollInterval);

    // Initial poll
    poll();

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, poll, pollInterval]);

  // Function to sync current diagram state to backend
  const syncDiagram = useCallback(async (xml: string) => {
    try {
      await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", xml }),
      });
    } catch (error) {
      console.debug("[MCP Polling] Sync failed:", error);
    }
  }, []);

  return { syncDiagram };
}
