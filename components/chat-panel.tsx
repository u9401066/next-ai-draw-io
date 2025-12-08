"use client";

import type React from "react";
import { useRef, useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import Link from "next/link";

import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatInput } from "@/components/chat-input";
import { ChatMessageDisplay } from "./chat-message-display";
import { useDiagram } from "@/contexts/diagram-context";
import { replaceNodes, formatXML } from "@/lib/utils";
import { ButtonWithTooltip } from "@/components/button-with-tooltip";
import { SettingsDialog } from "@/components/settings-dialog";
import { CheckpointControls } from "@/components/checkpoint-controls";

interface ChatPanelProps {
    isVisible: boolean;
    onToggleVisibility: () => void;
}

export default function ChatPanel({ isVisible, onToggleVisibility }: ChatPanelProps) {
    const {
        loadDiagram: onDisplayChart,
        handleExport: onExport,
        resolverRef,
        chartXML,
        clearDiagram,
    } = useDiagram();

    const onFetchChart = () => {
        return Promise.race([
            new Promise<string>((resolve) => {
                if (resolverRef && "current" in resolverRef) {
                    resolverRef.current = resolve;
                }
                onExport();
            }),
            new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error("Chart export timed out after 10 seconds")), 10000)
            )
        ]);
    };
    // Add a step counter to track updates

    // Add state for file attachments
    const [files, setFiles] = useState<File[]>([]);
    // Add state for showing the history dialog
    const [showHistory, setShowHistory] = useState(false);

    // Convert File[] to FileList for experimental_attachments
    const createFileList = (files: File[]): FileList => {
        const dt = new DataTransfer();
        files.forEach((file) => dt.items.add(file));
        return dt.files;
    };

    // Add state for input management
    const [input, setInput] = useState("");

    // Add state for chat settings
    const [chatSettings, setChatSettings] = useState<import("@/components/settings-dialog").ChatSettings>({
        provider: 'bedrock',
        model: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0',
        checkAccessCode: false,
        accessCode: ''
    });

    // Remove the currentXmlRef and related useEffect
    const { messages, sendMessage, addToolResult, status, error, setMessages } =
        useChat({
            transport: new DefaultChatTransport({
                api: "/api/chat",
            }),
            async onToolCall({ toolCall }) {
                if (toolCall.toolName === "display_diagram") {
                    // Diagram is handled streamingly in the ChatMessageDisplay component
                    addToolResult({
                        tool: "display_diagram",
                        toolCallId: toolCall.toolCallId,
                        output: "成功顯示圖表。",
                    });
                } else if (toolCall.toolName === "edit_diagram") {
                    const { edits } = toolCall.input as {
                        edits: Array<{ search: string; replace: string }>;
                    };

                    let currentXml = '';
                    try {
                        // Fetch current chart XML
                        currentXml = await onFetchChart();

                        // Apply edits using the utility function
                        const { replaceXMLParts } = await import("@/lib/utils");
                        const editedXml = replaceXMLParts(currentXml, edits);

                        // Load the edited diagram
                        onDisplayChart(editedXml);

                        addToolResult({
                            tool: "edit_diagram",
                            toolCallId: toolCall.toolCallId,
                            output: `成功將 ${edits.length} 個更改應用於圖表。`,
                        });
                    } catch (error) {
                        console.error("Edit diagram failed:", error);

                        const errorMessage = error instanceof Error ? error.message : String(error);

                        // Provide detailed error with current diagram XML
                        addToolResult({
                            tool: "edit_diagram",
                            toolCallId: toolCall.toolCallId,
                            output: `Edit failed: ${errorMessage}

Current diagram XML:
\`\`\`xml
${currentXml}
\`\`\`

Please retry with an adjusted search pattern or use display_diagram if retries are exhausted.`,
                        });
                    }
                }
            },
            onError: (error) => {
                console.error("Chat error:", error);
            },
        });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Debug: Log status changes
    useEffect(() => {
        console.log('[ChatPanel] Status changed to:', status);
    }, [status]);

    // 同步 chatSettings 到 MCP（讓 Agent 可以查詢）
    useEffect(() => {
        const syncSettings = async () => {
            try {
                await fetch('/api/mcp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'sync_settings',
                        settings: {
                            checkAccessCode: chatSettings.checkAccessCode,
                            // 可以在這裡添加其他非 LLM 相關的設定
                        }
                    }),
                });
                console.log('[ChatPanel] Settings synced to MCP');
            } catch (error) {
                console.debug('[ChatPanel] Failed to sync settings:', error);
            }
        };
        syncSettings();
    }, [chatSettings.checkAccessCode]); // 只在相關設定變更時同步

    const onFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const isProcessing = status === "streaming" || status === "submitted";
        if (input.trim() && !isProcessing) {
            try {
                // Fetch chart data before sending message
                let chartXml = await onFetchChart();

                // Format the XML to ensure consistency
                chartXml = formatXML(chartXml);

                // Create message parts
                const parts: any[] = [{ type: "text", text: input }];

                // Add file parts if files exist
                if (files.length > 0) {
                    for (const file of files) {
                        const reader = new FileReader();
                        const dataUrl = await new Promise<string>((resolve) => {
                            reader.onload = () =>
                                resolve(reader.result as string);
                            reader.readAsDataURL(file);
                        });

                        parts.push({
                            type: "file",
                            url: dataUrl,
                            mediaType: file.type,
                        });
                    }
                }

                sendMessage(
                    { parts },
                    {
                        body: {
                            xml: chartXml,
                            provider: chatSettings.provider,
                            modelId: chatSettings.model,
                            accessCode: chatSettings.checkAccessCode ? chatSettings.accessCode : undefined
                        },
                    }
                );

                // Clear input and files after submission
                setInput("");
                setFiles([]);
            } catch (error) {
                console.error("Error fetching chart data:", error);
            }
        }
    };

    // Handle input change
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setInput(e.target.value);
    };

    // Helper function to handle file changes
    const handleFileChange = (newFiles: File[]) => {
        setFiles(newFiles);
    };

    // Collapsed view when chat is hidden
    if (!isVisible) {
        return (
            <Card className="h-full flex flex-col rounded-none py-0 gap-0 items-center justify-start pt-4">
                <ButtonWithTooltip
                    tooltipContent="顯示聊天面板 (Ctrl+B)"
                    variant="ghost"
                    size="icon"
                    onClick={onToggleVisibility}
                >
                    <PanelRightOpen className="h-5 w-5" />
                </ButtonWithTooltip>
                <div
                    className="text-sm text-gray-500 mt-8"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                    聊天
                </div>
            </Card>
        );
    }

    // Full view when chat is visible
    return (
        <Card className="h-full flex flex-col rounded-none py-0 gap-0">
            <CardHeader className="p-4 flex flex-row justify-between items-center">
                <div className="flex items-center gap-3">
                    <CardTitle>Next-AI-Drawio</CardTitle>
                    <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        關於
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <CheckpointControls />
                    <SettingsDialog
                        settings={chatSettings}
                        onSettingsChange={setChatSettings}
                    />
                    <ButtonWithTooltip
                        tooltipContent="隱藏聊天面板 (Ctrl+B)"
                        variant="ghost"
                        size="icon"
                        onClick={onToggleVisibility}
                    >
                        <PanelRightClose className="h-5 w-5" />
                    </ButtonWithTooltip>
                    <a
                        href="https://github.com/DayuanJiang/next-ai-draw-io"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <FaGithub className="w-6 h-6" />
                    </a>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden px-2">
                <ChatMessageDisplay
                    messages={messages}
                    error={error}
                    setInput={setInput}
                    setFiles={handleFileChange}
                />
            </CardContent>

            <CardFooter className="p-2">
                <ChatInput
                    input={input}
                    status={status}
                    onSubmit={onFormSubmit}
                    onChange={handleInputChange}
                    onClearChat={() => {
                        setMessages([]);
                        clearDiagram();
                    }}
                    files={files}
                    onFileChange={handleFileChange}
                    showHistory={showHistory}
                    onToggleHistory={setShowHistory}
                />
            </CardFooter>
        </Card>
    );
}
