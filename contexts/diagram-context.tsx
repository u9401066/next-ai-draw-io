"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import type { DrawIoEmbedRef } from "react-drawio";
import { extractDiagramXML } from "../lib/utils";
import { DiagramDiffTracker } from "../lib/diagram-diff-tracker";
import { DiagramOperationsHandler, DiagramOperation, ApplyResult } from "../lib/diagram-operations-handler";
import { useWebSocket } from "../lib/websocket/useWebSocket";
import type { DiagramUpdateMessage, PendingOperationsMessage, HumanChanges } from "../lib/websocket/types";

// WebSocket 設定
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:6003";
const USE_WEBSOCKET = process.env.NEXT_PUBLIC_USE_WEBSOCKET !== "false"; // 預設啟用

interface DiagramContextType {
    chartXML: string;
    latestSvg: string;
    diagramHistory: { svg: string; xml: string }[];
    loadDiagram: (chart: string) => void;
    handleExport: () => void;
    resolverRef: React.Ref<((value: string) => void) | null>;
    drawioRef: React.Ref<DrawIoEmbedRef | null>;
    handleDiagramExport: (data: any) => void;
    clearDiagram: () => void;
    // 新增: Diff 相關功能
    getHumanChanges: () => ReturnType<DiagramOperationsHandler['getHumanChanges']>;
    applyOperations: (ops: DiagramOperation[], preserveUserChanges?: boolean) => ApplyResult;
    getElements: (type?: 'nodes' | 'edges') => ReturnType<DiagramOperationsHandler['getElements']>;
    syncState: () => ReturnType<DiagramOperationsHandler['syncState']>;
    setBaseState: () => void;
    // WebSocket 狀態
    isWsConnected: boolean;
}

const DiagramContext = createContext<DiagramContextType | undefined>(undefined);

export function DiagramProvider({ children }: { children: React.ReactNode }) {
    const [chartXML, setChartXML] = useState<string>("");
    const [latestSvg, setLatestSvg] = useState<string>("");
    const [diagramHistory, setDiagramHistory] = useState<
        { svg: string; xml: string }[]
    >([]); 
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const drawioRef = useRef<DrawIoEmbedRef | null>(null);
    const resolverRef = useRef<((value: string) => void) | null>(null);
    
    // Diff 追蹤相關
    const opsHandlerRef = useRef<DiagramOperationsHandler>(new DiagramOperationsHandler());

    const handleExport = () => {
        if (drawioRef.current) {
            drawioRef.current.exportDiagram({
                format: "xmlsvg",
            });
        }
    };

    const loadDiagram = (chart: string) => {
        if (drawioRef.current) {
            drawioRef.current.load({
                xml: chart,
            });
        }
    };

    const handleDiagramExport = (data: any) => {
        console.log("[DiagramContext] handleDiagramExport called with data:", {
            format: data.format,
            dataType: typeof data.data,
            dataPrefix: data.data?.substring?.(0, 100),
            message: data.message,
        });
        
        // Log debug info to server for easier debugging
        fetch('/api/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'debug_log',
                message: 'handleDiagramExport called',
                dataType: typeof data.data,
                dataPrefix: data.data?.substring?.(0, 100),
                format: data.format,
            }),
        }).catch(() => {});
        
        try {
            const extractedXML = extractDiagramXML(data.data);
            if (extractedXML) {
                setChartXML(extractedXML);
                setLatestSvg(data.data);
                setDiagramHistory((prev) => [
                    ...prev,
                    {
                        svg: data.data,
                        xml: extractedXML,
                    },
                ]);
                // 更新 diff tracker
                opsHandlerRef.current.updateXml(extractedXML);
                
                if (resolverRef.current) {
                    resolverRef.current(extractedXML);
                    resolverRef.current = null;
                }
            }
        } catch (error) {
            console.error("handleDiagramExport: Failed to extract XML", error);
            // Log error to server
            fetch('/api/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'debug_log',
                    message: 'extractDiagramXML FAILED',
                    error: String(error),
                    dataPrefix: data.data?.substring?.(0, 200),
                }),
            }).catch(() => {});
            // Still store the raw data even if extraction fails
            setLatestSvg(data.data);
        }
    };

    const clearDiagram = () => {
        const emptyDiagram = `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;
        loadDiagram(emptyDiagram);
        setChartXML(emptyDiagram);
        setLatestSvg("");
        setDiagramHistory([]);
        opsHandlerRef.current.setCurrentXml(emptyDiagram);
    };

    // === Diff 相關函數 ===
    
    // 取得用戶變更
    const getHumanChanges = useCallback(() => {
        return opsHandlerRef.current.getHumanChanges();
    }, []);
    
    // 應用操作
    const applyOperations = useCallback((ops: DiagramOperation[], preserveUserChanges: boolean = true) => {
        const result = opsHandlerRef.current.applyOperations(ops, preserveUserChanges);
        if (result.success && result.newXml) {
            // 載入新的 XML 到 Draw.io
            loadDiagram(result.newXml);
            setChartXML(result.newXml);
        }
        return result;
    }, []);
    
    // 取得元素列表
    const getElements = useCallback((type?: 'nodes' | 'edges') => {
        return opsHandlerRef.current.getElements(type);
    }, []);
    
    // 同步狀態
    const syncState = useCallback(() => {
        return opsHandlerRef.current.syncState();
    }, []);
    
    // 設定基準狀態（Agent 完成操作後呼叫）
    const setBaseState = useCallback(() => {
        opsHandlerRef.current.setCurrentXml(chartXML);
    }, [chartXML]);

    // === WebSocket 處理 ===
    
    // 處理圖表更新訊息
    const handleDiagramUpdateWS = useCallback((payload: DiagramUpdateMessage['payload']) => {
        console.log('[DiagramContext WS] Diagram update received:', payload.action);
        loadDiagram(payload.xml);
        setChartXML(payload.xml);
        setActiveTabId(payload.tabId);
    }, [loadDiagram]);
    
    // 處理待執行操作訊息
    const handlePendingOperationsWS = useCallback((payload: PendingOperationsMessage['payload']) => {
        console.log('[DiagramContext WS] Pending operations received:', payload.operations);
        
        const result = applyOperations(payload.operations, payload.preserveUserChanges);
        
        // 透過 WebSocket 回報結果
        sendOperationResult(
            payload.requestId,
            result.success,
            result.applied,
            result.conflicts,
            result.newXml
        );
    }, [applyOperations]);
    
    // WebSocket 連線（條件啟用）
    const {
        isConnected: isWsConnected,
        clientId: wsClientId,
        sendChangesReport,
        sendOperationResult,
        subscribe,
    } = useWebSocket({
        url: USE_WEBSOCKET ? WS_URL : '',  // 空 URL 時 hook 不會連線
        onDiagramUpdate: handleDiagramUpdateWS,
        onPendingOperations: handlePendingOperationsWS,
        onConnected: (clientId) => {
            console.log('[DiagramContext] WebSocket connected:', clientId);
            // 訂閱當前 tab
            if (activeTabId) {
                subscribe(activeTabId);
            }
        },
        onDisconnected: () => {
            console.log('[DiagramContext] WebSocket disconnected');
        },
    });
    
    // 當 tab 變更時重新訂閱
    useEffect(() => {
        if (isWsConnected && activeTabId) {
            subscribe(activeTabId);
        }
    }, [isWsConnected, activeTabId, subscribe]);

    // === Fallback: 輪詢處理（僅在 WebSocket 未連線時使用）===
    
    // 檢查並執行待處理操作
    const checkAndApplyPendingOperations = useCallback(async () => {
        // 如果 WebSocket 已連線，不使用 polling
        if (isWsConnected) return;
        
        try {
            const response = await fetch('/api/mcp?action=check_pending_ops');
            const data = await response.json();
            
            if (data.hasPending && data.operations) {
                console.log('[DiagramContext Polling] Applying pending operations:', data.operations);
                
                const result = applyOperations(data.operations, data.preserveUserChanges ?? true);
                
                // 回報結果
                await fetch('/api/mcp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'operation_result',
                        requestId: data.requestId,
                        result: {
                            success: result.success,
                            applied: result.applied,
                            conflicts: result.conflicts,
                        },
                        newXml: result.newXml,
                    }),
                });
            }
        } catch (error) {
            console.error('[DiagramContext Polling] Error checking pending operations:', error);
        }
    }, [applyOperations, isWsConnected]);
    
    // 回報用戶變更
    const reportChangesToServer = useCallback(async () => {
        if (!chartXML) return;
        
        const changes = getHumanChanges();
        
        // 優先使用 WebSocket
        if (isWsConnected && activeTabId) {
            sendChangesReport(activeTabId, changes as HumanChanges);
            return;
        }
        
        // Fallback 到 HTTP
        try {
            await fetch('/api/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'report_changes',
                    changes: changes,
                }),
            });
        } catch (error) {
            console.error('[DiagramContext Polling] Error reporting changes:', error);
        }
    }, [chartXML, getHumanChanges, isWsConnected, activeTabId, sendChangesReport]);
    
    // 設定輪詢 interval（僅作為 fallback）
    useEffect(() => {
        // 如果 WebSocket 已連線，使用更長的間隔或不啟用
        const pollInterval = isWsConnected ? 10000 : 2000;  // WS 連線時 10 秒，否則 2 秒
        const changesInterval = isWsConnected ? 10000 : 3000;  // WS 連線時 10 秒，否則 3 秒
        
        const opsTimer = setInterval(checkAndApplyPendingOperations, pollInterval);
        const changesTimer = setInterval(reportChangesToServer, changesInterval);
        
        return () => {
            clearInterval(opsTimer);
            clearInterval(changesTimer);
        };
    }, [checkAndApplyPendingOperations, reportChangesToServer, isWsConnected]);

    return (
        <DiagramContext.Provider
            value={{
                chartXML,
                latestSvg,
                diagramHistory,
                loadDiagram,
                handleExport,
                resolverRef,
                drawioRef,
                handleDiagramExport,
                clearDiagram,
                // Diff 相關
                getHumanChanges,
                applyOperations,
                getElements,
                syncState,
                setBaseState,
                // WebSocket 狀態
                isWsConnected,
            }}
        >
            {children}
        </DiagramContext.Provider>
    );
}

export function useDiagram() {
    const context = useContext(DiagramContext);
    if (context === undefined) {
        throw new Error("useDiagram must be used within a DiagramProvider");
    }
    return context;
}
