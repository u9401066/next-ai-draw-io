"use client";
import React, { useState, useEffect, useCallback } from "react";
import { DrawIoEmbed, EventSave } from "react-drawio";
import ChatPanel from "@/components/chat-panel";
import { useDiagram } from "@/contexts/diagram-context";
import { useMCPPolling } from "@/lib/use-mcp-polling";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

export default function Home() {
    const { drawioRef, handleDiagramExport, loadDiagram } = useDiagram();
    const [isMobile, setIsMobile] = useState(false);
    const [isChatVisible, setIsChatVisible] = useState(false); // 預設隱藏 Chat Panel
    const [isDrawioReady, setIsDrawioReady] = useState(false);

    // Handle when Draw.io is loaded and ready
    const handleDrawioLoad = useCallback(() => {
        setIsDrawioReady(true);
    }, []);

    // Track last save time to prevent duplicate downloads
    const lastSaveRef = React.useRef<number>(0);
    const SAVE_DEBOUNCE_MS = 2000; // Minimum 2 seconds between saves

    // Handle user save event (Ctrl+S or menu save)
    // This will: 1) Download the file locally, 2) Report event to MCP for Agent
    const handleSave = useCallback(async (data: EventSave) => {
        const now = Date.now();
        console.log('[Draw.io] User save event:', {
            hasXml: !!data.xml,
            xmlLength: data.xml?.length,
            xmlPrefix: data.xml?.substring?.(0, 100),
        });

        // 1. 觸發檔案下載（真正存檔）- 防止短時間內重複下載
        if (now - lastSaveRef.current > SAVE_DEBOUNCE_MS) {
            lastSaveRef.current = now;
            try {
                const xml = data.xml || '';
                const blob = new Blob([xml], { type: 'application/xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // 使用更友善的檔名格式
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                a.download = `diagram-${timestamp}.drawio`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('[Draw.io] File download triggered');
            } catch (downloadError) {
                console.error('[Draw.io] Failed to trigger download:', downloadError);
            }
        } else {
            console.log('[Draw.io] Save debounced (too frequent)');
        }

        // 2. 記錄事件到 MCP（讓 Agent 可以查詢）- 每次都記錄
        try {
            await fetch('/api/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'user_save',
                    xml: data.xml,
                }),
            });
        } catch (error) {
            console.error('[Draw.io] Failed to report save event:', error);
        }
    }, []);

    // Enable MCP polling to receive updates from GitHub Copilot
    const { syncDiagram } = useMCPPolling({
        onUpdate: (xml) => {
            if (isDrawioReady) {
                loadDiagram(xml);
            }
        },
        enabled: isDrawioReady, // Only poll when Draw.io is ready
        pollInterval: 500, // Poll every 500ms for responsive updates
    });

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Check on mount
        checkMobile();

        // Add event listener for resize
        window.addEventListener("resize", checkMobile);

        // Cleanup
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Add keyboard shortcut for toggling chat panel (Ctrl+B)
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                setIsChatVisible((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div className="flex h-screen bg-gray-100 relative overflow-hidden">
            {/* Mobile warning overlay - keeps components mounted */}
            {isMobile && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-8">
                        <h1 className="text-2xl font-semibold text-gray-800">
                            請在桌機或筆記型電腦上開啟此應用程式
                        </h1>
                    </div>
                </div>
            )}

            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={70} minSize={30}>
                    <div className="h-full w-full p-1 relative">
                        <DrawIoEmbed
                            ref={drawioRef}
                            onExport={handleDiagramExport}
                            onLoad={handleDrawioLoad}
                            onSave={handleSave}
                            urlParameters={{
                                spin: true,
                                libraries: false,
                                saveAndExit: false,
                                noExitBtn: true,
                            }}
                        />
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel
                    defaultSize={30}
                    minSize={20}
                    maxSize={50}
                    collapsible={true}
                    collapsedSize={0}
                    onCollapse={() => setIsChatVisible(false)}
                    onExpand={() => setIsChatVisible(true)}
                    className={cn(
                        "transition-all duration-300 ease-in-out",
                        !isChatVisible && "min-w-[50px]"
                    )}
                >
                    <div className="h-full p-1">
                        <ChatPanel
                            isVisible={true} // Always visible content, panel logic handles collapse
                            onToggleVisibility={() => setIsChatVisible(!isChatVisible)}
                        />
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
