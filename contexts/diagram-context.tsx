"use client"

import type React from "react"
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react"
import type { DrawIoEmbedRef } from "react-drawio"
import { DiagramDiffTracker } from "../lib/diagram-diff-tracker"
import {
    type ApplyResult,
    type DiagramOperation,
    DiagramOperationsHandler,
} from "../lib/diagram-operations-handler"
// DDD Checkpoint Integration
import {
    type Checkpoint,
    CheckpointManager,
    type CheckpointSource,
} from "../lib/domain/checkpoint"
import { extractDiagramXML } from "../lib/utils"
import type {
    DiagramUpdateMessage,
    HumanChanges,
    PendingOperationsMessage,
} from "../lib/websocket/types"
import { useWebSocket } from "../lib/websocket/useWebSocket"

// WebSocket 設定
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:6003"
const USE_WEBSOCKET = process.env.NEXT_PUBLIC_USE_WEBSOCKET !== "false" // 預設啟用

interface DiagramContextType {
    chartXML: string
    latestSvg: string
    diagramHistory: { svg: string; xml: string }[]
    loadDiagram: (chart: string, skipValidation?: boolean) => void
    handleExport: () => void
    resolverRef: React.Ref<((value: string) => void) | null>
    drawioRef: React.Ref<DrawIoEmbedRef | null>
    handleDiagramExport: (data: any) => void
    clearDiagram: () => void
    // 新增: Diff 相關功能
    getHumanChanges: () => ReturnType<
        DiagramOperationsHandler["getHumanChanges"]
    >
    applyOperations: (
        ops: DiagramOperation[],
        preserveUserChanges?: boolean,
    ) => ApplyResult
    getElements: (
        type?: "nodes" | "edges",
    ) => ReturnType<DiagramOperationsHandler["getElements"]>
    syncState: () => ReturnType<DiagramOperationsHandler["syncState"]>
    setBaseState: () => void
    // WebSocket 狀態
    isWsConnected: boolean
    // DDD Checkpoint 功能
    saveCheckpoint: (
        source: CheckpointSource,
        description?: string,
    ) => Checkpoint | null
    undoCheckpoint: () => Checkpoint | null
    redoCheckpoint: () => Checkpoint | null
    canUndo: boolean
    canRedo: boolean
    checkpointCount: number
    checkpointList: Checkpoint[]
    saveDiagramToFile: (
        filename: string,
        format: string,
        sessionId?: string,
    ) => void
}

const DiagramContext = createContext<DiagramContextType | undefined>(undefined)

export function DiagramProvider({ children }: { children: React.ReactNode }) {
    const [chartXML, setChartXML] = useState<string>("")
    const [latestSvg, setLatestSvg] = useState<string>("")
    const [diagramHistory, setDiagramHistory] = useState<
        { svg: string; xml: string }[]
    >([])
    const [activeTabId, setActiveTabId] = useState<string | null>(null)
    const drawioRef = useRef<DrawIoEmbedRef | null>(null)
    const resolverRef = useRef<((value: string) => void) | null>(null)

    // Diff 追蹤相關
    const opsHandlerRef = useRef<DiagramOperationsHandler>(
        new DiagramOperationsHandler(),
    )

    // DDD Checkpoint Manager
    const checkpointManagerRef = useRef<CheckpointManager>(
        new CheckpointManager(50),
    )
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [checkpointCount, setCheckpointCount] = useState(0)
    const [checkpointList, setCheckpointList] = useState<Checkpoint[]>([])
    const currentDiagramId = activeTabId || "default"

    // Pending Save State
    const pendingSaveRef = useRef<{
        filename: string
        format: string
        sessionId?: string
    } | null>(null)

    const saveDiagramToFile = useCallback(
        (filename: string, format: string, sessionId?: string) => {
            pendingSaveRef.current = { filename, format, sessionId }
            if (drawioRef.current) {
                drawioRef.current.exportDiagram({
                    format: "xmlsvg",
                })
            }
        },
        [],
    )

    const handleExport = () => {
        if (drawioRef.current) {
            drawioRef.current.exportDiagram({
                format: "xmlsvg",
            })
        }
    }

    const loadDiagram = (chart: string, skipValidation?: boolean) => {
        if (drawioRef.current) {
            drawioRef.current.load({
                xml: chart,
            })
        }
    }

    const handleDiagramExport = (data: any) => {
        console.log("[DiagramContext] handleDiagramExport called with data:", {
            format: data.format,
            dataType: typeof data.data,
            dataPrefix: data.data?.substring?.(0, 100),
            message: data.message,
        })

        // Log debug info to server for easier debugging
        fetch("/api/mcp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "debug_log",
                message: "handleDiagramExport called",
                dataType: typeof data.data,
                dataPrefix: data.data?.substring?.(0, 100),
                format: data.format,
            }),
        }).catch(() => {})

        // Handle Pending Save (File Download)
        if (pendingSaveRef.current) {
            const { filename, format, sessionId } = pendingSaveRef.current
            try {
                let content = data.data
                let finalFilename = filename
                let mimeType = "text/plain"

                // Process content based on format
                if (format === "drawio" || format === "xml") {
                    const xml = extractDiagramXML(data.data)
                    if (xml) content = xml
                    mimeType = "text/xml"
                    if (!finalFilename.endsWith(".drawio"))
                        finalFilename += ".drawio"
                } else if (format === "svg") {
                    mimeType = "image/svg+xml"
                    if (!finalFilename.endsWith(".svg")) finalFilename += ".svg"
                }

                // Create download
                let href = ""
                if (
                    typeof content === "string" &&
                    content.startsWith("data:")
                ) {
                    href = content
                } else {
                    const blob = new Blob([content], { type: mimeType })
                    href = URL.createObjectURL(blob)
                }

                const link = document.createElement("a")
                link.href = href
                link.download = finalFilename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                if (!content.startsWith("data:")) {
                    URL.revokeObjectURL(href)
                }

                // Log to API
                fetch("/api/log-save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        filename: finalFilename,
                        format,
                        sessionId,
                    }),
                }).catch(console.error)
            } catch (e) {
                console.error("Failed to save diagram to file", e)
            } finally {
                pendingSaveRef.current = null
            }
        }

        try {
            const extractedXML = extractDiagramXML(data.data)
            if (extractedXML) {
                setChartXML(extractedXML)
                setLatestSvg(data.data)
                setDiagramHistory((prev) => [
                    ...prev,
                    {
                        svg: data.data,
                        xml: extractedXML,
                    },
                ])
                // 更新 diff tracker
                opsHandlerRef.current.updateXml(extractedXML)

                if (resolverRef.current) {
                    resolverRef.current(extractedXML)
                    resolverRef.current = null
                }
            }
        } catch (error) {
            console.error("handleDiagramExport: Failed to extract XML", error)
            // Log error to server
            fetch("/api/mcp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "debug_log",
                    message: "extractDiagramXML FAILED",
                    error: String(error),
                    dataPrefix: data.data?.substring?.(0, 200),
                }),
            }).catch(() => {})
            // Still store the raw data even if extraction fails
            setLatestSvg(data.data)
        }
    }

    const clearDiagram = () => {
        const emptyDiagram = `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`
        loadDiagram(emptyDiagram)
        setChartXML(emptyDiagram)
        setLatestSvg("")
        setDiagramHistory([])
        opsHandlerRef.current.setCurrentXml(emptyDiagram)
    }

    // === Diff 相關函數 ===

    // 取得用戶變更
    const getHumanChanges = useCallback(() => {
        return opsHandlerRef.current.getHumanChanges()
    }, [])

    // 應用操作
    const applyOperations = useCallback(
        (ops: DiagramOperation[], preserveUserChanges: boolean = true) => {
            const result = opsHandlerRef.current.applyOperations(
                ops,
                preserveUserChanges,
            )
            if (result.success && result.newXml) {
                // 載入新的 XML 到 Draw.io
                loadDiagram(result.newXml)
                setChartXML(result.newXml)
            }
            return result
        },
        [],
    )

    // 取得元素列表
    const getElements = useCallback((type?: "nodes" | "edges") => {
        return opsHandlerRef.current.getElements(type)
    }, [])

    // 同步狀態
    const syncState = useCallback(() => {
        return opsHandlerRef.current.syncState()
    }, [])

    // 設定基準狀態（Agent 完成操作後呼叫）
    const setBaseState = useCallback(() => {
        opsHandlerRef.current.setCurrentXml(chartXML)
    }, [chartXML])

    // === DDD Checkpoint 相關函數 ===

    // 更新 checkpoint 狀態的輔助函數
    const updateCheckpointState = useCallback(() => {
        const manager = checkpointManagerRef.current
        setCanUndo(manager.canUndo(currentDiagramId))
        setCanRedo(manager.canRedo(currentDiagramId))
        setCheckpointCount(manager.count(currentDiagramId))
        setCheckpointList(manager.list(currentDiagramId))
    }, [currentDiagramId])

    // 儲存檢查點
    const saveCheckpoint = useCallback(
        (source: CheckpointSource, description?: string): Checkpoint | null => {
            if (!chartXML) return null

            const checkpoint = checkpointManagerRef.current.save(
                currentDiagramId,
                chartXML,
                latestSvg,
                source,
                description,
            )
            updateCheckpointState()
            console.log(
                "[DiagramContext] Checkpoint saved:",
                checkpoint.id.value,
                source,
            )
            return checkpoint
        },
        [chartXML, latestSvg, currentDiagramId, updateCheckpointState],
    )

    // Undo - 回到上一個檢查點
    const undoCheckpoint = useCallback((): Checkpoint | null => {
        const checkpoint = checkpointManagerRef.current.undo(currentDiagramId)
        if (checkpoint) {
            loadDiagram(checkpoint.xml)
            setChartXML(checkpoint.xml)
            setLatestSvg(checkpoint.svg)
            updateCheckpointState()
            console.log(
                "[DiagramContext] Undo to checkpoint:",
                checkpoint.id.value,
            )
        }
        return checkpoint
    }, [currentDiagramId, updateCheckpointState])

    // Redo - 前進到下一個檢查點
    const redoCheckpoint = useCallback((): Checkpoint | null => {
        const checkpoint = checkpointManagerRef.current.redo(currentDiagramId)
        if (checkpoint) {
            loadDiagram(checkpoint.xml)
            setChartXML(checkpoint.xml)
            setLatestSvg(checkpoint.svg)
            updateCheckpointState()
            console.log(
                "[DiagramContext] Redo to checkpoint:",
                checkpoint.id.value,
            )
        }
        return checkpoint
    }, [currentDiagramId, updateCheckpointState])

    // === WebSocket 處理 ===

    // 用 ref 保存 sendOperationResult 避免循環依賴
    const sendOperationResultRef = useRef<typeof sendOperationResult | null>(
        null,
    )

    // 處理圖表更新訊息
    const handleDiagramUpdateWS = useCallback(
        (payload: DiagramUpdateMessage["payload"]) => {
            console.log(
                "[DiagramContext WS] Diagram update received:",
                payload.action,
            )
            loadDiagram(payload.xml)
            setChartXML(payload.xml)
            setActiveTabId(payload.tabId)
        },
        [],
    )

    // 處理待執行操作訊息
    const handlePendingOperationsWS = useCallback(
        (payload: PendingOperationsMessage["payload"]) => {
            console.log(
                "[DiagramContext WS] Pending operations received:",
                payload.operations,
            )

            const result = applyOperations(
                payload.operations,
                payload.preserveUserChanges,
            )

            // 透過 WebSocket 回報結果（使用 ref 避免循環依賴）
            sendOperationResultRef.current?.(
                payload.requestId,
                result.success,
                result.applied,
                result.conflicts,
                result.newXml,
            )
        },
        [applyOperations],
    )

    // WebSocket 連線（條件啟用）
    const {
        isConnected: isWsConnected,
        clientId: wsClientId,
        sendChangesReport,
        sendOperationResult,
        subscribe,
    } = useWebSocket({
        url: USE_WEBSOCKET ? WS_URL : "", // 空 URL 時 hook 不會連線
        onDiagramUpdate: handleDiagramUpdateWS,
        onPendingOperations: handlePendingOperationsWS,
        onConnected: (clientId) => {
            console.log("[DiagramContext] WebSocket connected:", clientId)
            // 訂閱當前 tab
            if (activeTabId) {
                subscribe(activeTabId)
            }
        },
        onDisconnected: () => {
            console.log("[DiagramContext] WebSocket disconnected")
        },
    })

    // 更新 ref
    useEffect(() => {
        sendOperationResultRef.current = sendOperationResult
    }, [sendOperationResult])

    // 當 tab 變更時重新訂閱
    useEffect(() => {
        if (isWsConnected && activeTabId) {
            subscribe(activeTabId)
        }
    }, [isWsConnected, activeTabId, subscribe])

    // === Fallback: 輪詢處理（僅在 WebSocket 未連線時使用）===

    // 檢查並執行待處理操作
    const checkAndApplyPendingOperations = useCallback(async () => {
        // 如果 WebSocket 已連線，不使用 polling
        if (isWsConnected) return

        try {
            const response = await fetch("/api/mcp?action=check_pending_ops")
            const data = await response.json()

            if (data.hasPending && data.operations) {
                console.log(
                    "[DiagramContext Polling] Applying pending operations:",
                    data.operations,
                )

                const result = applyOperations(
                    data.operations,
                    data.preserveUserChanges ?? true,
                )

                // 回報結果
                await fetch("/api/mcp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "operation_result",
                        requestId: data.requestId,
                        result: {
                            success: result.success,
                            applied: result.applied,
                            conflicts: result.conflicts,
                        },
                        newXml: result.newXml,
                    }),
                })
            }
        } catch (error) {
            console.error(
                "[DiagramContext Polling] Error checking pending operations:",
                error,
            )
        }
    }, [applyOperations, isWsConnected])

    // 回報用戶變更
    const reportChangesToServer = useCallback(async () => {
        if (!chartXML) return

        const changes = getHumanChanges()

        // 優先使用 WebSocket
        if (isWsConnected && activeTabId) {
            sendChangesReport(activeTabId, changes as HumanChanges)
            return
        }

        // Fallback 到 HTTP
        try {
            await fetch("/api/mcp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "report_changes",
                    changes: changes,
                }),
            })
        } catch (error) {
            console.error(
                "[DiagramContext Polling] Error reporting changes:",
                error,
            )
        }
    }, [
        chartXML,
        getHumanChanges,
        isWsConnected,
        activeTabId,
        sendChangesReport,
    ])

    // 設定輪詢 interval（僅作為 fallback）
    useEffect(() => {
        // 如果 WebSocket 已連線，使用更長的間隔或不啟用
        const pollInterval = isWsConnected ? 10000 : 2000 // WS 連線時 10 秒，否則 2 秒
        const changesInterval = isWsConnected ? 10000 : 3000 // WS 連線時 10 秒，否則 3 秒

        const opsTimer = setInterval(
            checkAndApplyPendingOperations,
            pollInterval,
        )
        const changesTimer = setInterval(reportChangesToServer, changesInterval)

        return () => {
            clearInterval(opsTimer)
            clearInterval(changesTimer)
        }
    }, [checkAndApplyPendingOperations, reportChangesToServer, isWsConnected])

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
                // DDD Checkpoint 功能
                saveCheckpoint,
                undoCheckpoint,
                redoCheckpoint,
                canUndo,
                canRedo,
                checkpointCount,
                checkpointList,
                saveDiagramToFile,
            }}
        >
            {children}
        </DiagramContext.Provider>
    )
}

export function useDiagram() {
    const context = useContext(DiagramContext)
    if (context === undefined) {
        throw new Error("useDiagram must be used within a DiagramProvider")
    }
    return context
}
