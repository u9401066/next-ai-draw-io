"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseMCPPollingOptions {
  onUpdate: (xml: string) => void;
  enabled?: boolean;
  pollInterval?: number;
}

/**
 * Hook to poll for MCP updates from the backend
 * This enables GitHub Copilot to control the diagram through the MCP Server
 */
export function useMCPPolling({
  onUpdate,
  enabled = true,
  pollInterval = 1000,
}: UseMCPPollingOptions) {
  const lastTimestampRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

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
