"use client";

import React, { createContext, useContext, useRef, useState } from "react";
import type { DrawIoEmbedRef } from "react-drawio";
import { extractDiagramXML } from "../lib/utils";

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
}

const DiagramContext = createContext<DiagramContextType | undefined>(undefined);

export function DiagramProvider({ children }: { children: React.ReactNode }) {
    const [chartXML, setChartXML] = useState<string>("");
    const [latestSvg, setLatestSvg] = useState<string>("");
    const [diagramHistory, setDiagramHistory] = useState<
        { svg: string; xml: string }[]
    >([]);
    const drawioRef = useRef<DrawIoEmbedRef | null>(null);
    const resolverRef = useRef<((value: string) => void) | null>(null);

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
    };

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
