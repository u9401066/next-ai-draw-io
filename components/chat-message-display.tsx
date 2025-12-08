"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExamplePanel from "./chat-example-panel";
import { UIMessage } from "ai";
import { convertToLegalXml, replaceNodes } from "@/lib/utils";
import { Copy, Check, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useDiagram } from "@/contexts/diagram-context";

const getMessageTextContent = (message: UIMessage): string => {
    if (!message.parts) return "";
    return message.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n");
};

interface ChatMessageDisplayProps {
    messages: UIMessage[];
    error?: Error | null;
    setInput: (input: string) => void;
    setFiles: (files: File[]) => void;
}

export function ChatMessageDisplay({
    messages,
    error,
    setInput,
    setFiles,
}: ChatMessageDisplayProps) {
    const { chartXML, loadDiagram: onDisplayChart } = useDiagram();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const previousXML = useRef<string>("");
    const processedToolCalls = useRef<Set<string>>(new Set());
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>(
        {}
    );
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [copyFailedMessageId, setCopyFailedMessageId] = useState<string | null>(null);

    const copyMessageToClipboard = async (messageId: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error("Failed to copy message:", err);
            setCopyFailedMessageId(messageId);
            setTimeout(() => setCopyFailedMessageId(null), 2000);
        }
    };

    const handleDisplayChart = useCallback(
        (xml: string) => {
            const currentXml = xml || "";
            const convertedXml = convertToLegalXml(currentXml);
            if (convertedXml !== previousXML.current) {
                previousXML.current = convertedXml;
                const replacedXML = replaceNodes(chartXML, convertedXml);
                onDisplayChart(replacedXML);
            }
        },
        [chartXML, onDisplayChart]
    );

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Handle tool invocations and update diagram when needed
    useEffect(() => {
        messages.forEach((message) => {
            if (message.parts) {
                message.parts.forEach((part: any) => {
                    if (part.type?.startsWith("tool-")) {
                        const { toolCallId, state } = part;

                        // Auto-collapse args when diagrams are generated
                        if (state === "output-available") {
                            setExpandedTools((prev) => ({
                                ...prev,
                                [toolCallId]: false,
                            }));
                        }

                        // Handle diagram updates for display_diagram tool
                        if (
                            part.type === "tool-display_diagram" &&
                            part.input?.xml
                        ) {
                            // For streaming input, always update to show streaming
                            if (
                                state === "input-streaming" ||
                                state === "input-available"
                            ) {
                                handleDisplayChart(part.input.xml);
                            }
                            // For completed calls, only update if not processed yet
                            else if (
                                state === "output-available" &&
                                !processedToolCalls.current.has(toolCallId)
                            ) {
                                handleDisplayChart(part.input.xml);
                                processedToolCalls.current.add(toolCallId);
                            }
                        }
                    }
                });
            }
        });
    }, [messages, handleDisplayChart]);

    const renderToolPart = (part: any) => {
        const callId = part.toolCallId;
        const { state, input, output } = part;
        const isExpanded = expandedTools[callId] ?? true;
        const toolName = part.type?.replace("tool-", "");

        const toggleExpanded = () => {
            setExpandedTools((prev) => ({
                ...prev,
                [callId]: !isExpanded,
            }));
        };

        return (
            <div
                key={callId}
                className="p-4 my-2 text-gray-500 border border-gray-300 rounded"
            >
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="text-xs">工具: {toolName}</div>
                        {input && Object.keys(input).length > 0 && (
                            <button
                                onClick={toggleExpanded}
                                className="text-xs text-gray-500 hover:text-gray-700"
                            >
                                {isExpanded ? "隱藏參數" : "顯示參數"}
                            </button>
                        )}
                    </div>
                    {input && isExpanded && (
                        <div className="mt-1 font-mono text-xs overflow-hidden">
                            {typeof input === "object" &&
                                Object.keys(input).length > 0 &&
                                `輸入: ${JSON.stringify(input, null, 2)}`}
                        </div>
                    )}
                    <div className="mt-2 text-sm">
                        {state === "input-streaming" ? (
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : state === "output-available" ? (
                            <div className="text-green-600">
                                {output || (toolName === "display_diagram"
                                    ? "圖表已生成"
                                    : toolName === "edit_diagram"
                                        ? "圖表已編輯"
                                        : "工具已執行")}
                            </div>
                        ) : state === "output-error" ? (
                            <div className="text-red-600">
                                {output || (toolName === "display_diagram"
                                    ? "生成圖表時發生錯誤"
                                    : toolName === "edit_diagram"
                                        ? "編輯圖表時發生錯誤"
                                        : "工具執行錯誤")}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <ScrollArea className="h-full pr-4">
            {messages.length === 0 ? (
                <ExamplePanel setInput={setInput} setFiles={setFiles} />
            ) : (
                messages.map((message) => {
                    const messageText = getMessageTextContent(message);
                    const isCopied = copiedMessageId === message.id;
                    const isCopyFailed = copyFailedMessageId === message.id;

                    return (
                        <div
                            key={message.id}
                            className={`mb-4 group ${message.role === "user" ? "text-right" : "text-left"
                                }`}
                        >
                            <div
                                className={`relative inline-block px-4 py-2 whitespace-pre-wrap text-sm rounded-lg max-w-[85%] break-words ${message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                {/* Copy button for user messages */}
                                {message.role === "user" && messageText && (
                                    <button
                                        onClick={() => copyMessageToClipboard(message.id, messageText)}
                                        className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copy message"
                                    >
                                        {isCopied ? (
                                            <Check className="w-4 h-4 text-green-600" />
                                        ) : isCopyFailed ? (
                                            <X className="w-4 h-4 text-red-600" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                )}
                                {message.parts?.map((part: any, index: number) => {
                                    switch (part.type) {
                                        case "text":
                                            return (
                                                <div key={index}>{part.text}</div>
                                            );
                                        case "file":
                                            return (
                                                <div key={index} className="mt-2">
                                                    <Image
                                                        src={part.url}
                                                        width={200}
                                                        height={200}
                                                        alt={`Uploaded diagram or image for AI analysis`}
                                                        className="rounded-md border"
                                                        style={{
                                                            objectFit: "contain",
                                                        }}
                                                    />
                                                </div>
                                            );
                                        default:
                                            if (part.type?.startsWith("tool-")) {
                                                return renderToolPart(part);
                                            }
                                            return null;
                                    }
                                })}
                            </div>
                        </div>
                    );
                })
            )}
            {error && (
                <div className="text-red-500 text-sm mt-2">
                    Error: {error.message}
                </div>
            )}
            <div ref={messagesEndRef} />
        </ScrollArea>
    );
}
