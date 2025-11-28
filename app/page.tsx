"use client";
import React, { useState, useEffect, useCallback } from "react";
import { DrawIoEmbed } from "react-drawio";
import ChatPanel from "@/components/chat-panel";
import { useDiagram } from "@/contexts/diagram-context";
import { useMCPPolling } from "@/lib/use-mcp-polling";

export default function Home() {
    const { drawioRef, handleDiagramExport, loadDiagram } = useDiagram();
    const [isMobile, setIsMobile] = useState(false);
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [isDrawioReady, setIsDrawioReady] = useState(false);

    // Handle when Draw.io is loaded and ready
    const handleDrawioLoad = useCallback(() => {
        setIsDrawioReady(true);
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
        <div className="flex h-screen bg-gray-100 relative">
            {/* Mobile warning overlay - keeps components mounted */}
            {isMobile && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100">
                    <div className="text-center p-8">
                        <h1 className="text-2xl font-semibold text-gray-800">
                            Please open this application on a desktop or laptop
                        </h1>
                    </div>
                </div>
            )}

            <div className={`${isChatVisible ? 'w-2/3' : 'w-full'} p-1 h-full relative transition-all duration-300 ease-in-out`}>
                <DrawIoEmbed
                    ref={drawioRef}
                    onExport={handleDiagramExport}
                    onLoad={handleDrawioLoad}
                    urlParameters={{
                        spin: true,
                        libraries: false,
                        saveAndExit: false,
                        noExitBtn: true,
                    }}
                />
            </div>
            <div className={`${isChatVisible ? 'w-1/3' : 'w-12'} h-full p-1 transition-all duration-300 ease-in-out`}>
                <ChatPanel
                    isVisible={isChatVisible}
                    onToggleVisibility={() => setIsChatVisible(!isChatVisible)}
                />
            </div>
        </div>
    );
}
