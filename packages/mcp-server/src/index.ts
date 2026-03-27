#!/usr/bin/env node
/**
 * MCP Server for Next AI Draw.io
 *
 * Enables AI agents (Claude Desktop, Cursor, etc.) to generate and edit
 * draw.io diagrams with real-time browser preview.
 *
 * Uses an embedded HTTP server - no external dependencies required.
 */

// Setup DOM polyfill for Node.js (required for XML operations)
import { DOMParser } from "linkedom"
;(globalThis as any).DOMParser = DOMParser

// Create XMLSerializer polyfill using outerHTML
class XMLSerializerPolyfill {
    serializeToString(node: any): string {
        if (node.outerHTML !== undefined) {
            return node.outerHTML
        }
        if (node.documentElement) {
            return node.documentElement.outerHTML
        }
        return ""
    }
}
;(globalThis as any).XMLSerializer = XMLSerializerPolyfill

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import os from "node:os"
import open from "open"
import { z } from "zod"
import { type DiagramOperation } from "./diagram-operations.js"
import {
    type DocSession,
    type RevisionEvent,
} from "./document-manager.js"
import { addHistory } from "./history.js"
import {
    ensureStateForDocument,
    getDocumentManager,
    getServerBasePath,
    getState,
    requestSync,
    setState,
    shutdown,
    startHttpServer,
    waitForSync,
} from "./http-server.js"
import { log } from "./logger.js"
import { validateAndFixXml } from "./xml-validation.js"

// Server configuration
const config = {
    port: parseInt(process.env.PORT || "6002", 10),
    publicBaseUrl: process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || null,
}

const documentManager = getDocumentManager()
const recentDocumentReads = new Map<string, number>()
let activeDocumentId: string | null = null

// Create MCP server
const server = new McpServer({
    name: "next-ai-drawio",
    version: "0.1.2",
})

server.prompt(
    "diagram-workflow",
    "Guidelines for creating and editing draw.io diagrams",
    () => ({
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `# Draw.io Document Workflow

## Preferred MVP flow
1. Call open_document(path?) to open or create a document and launch browser preview
2. Call get_document(docId) to fetch the latest XML and metadata
3. Call apply_operations(docId, operations) to make agent edits
4. Call get_human_changes(docId, sinceRevision) to detect manual browser edits
5. Call save_document(docId) to persist to disk

## Important notes
- Use docId returned by open_document as the primary handle
- get_document fetches the latest browser state before returning XML
- apply_operations also syncs from the browser first to reduce overwriting human edits
- save_document requires the document to already have a bound filePath
- Legacy tools (start_session, get_diagram, edit_diagram, create_new_diagram) remain as compatibility wrappers`,
                },
            },
        ],
    }),
)

function errorResult(message: string) {
    return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
    }
}

function getDocumentOrThrow(docId: string): DocSession {
    const document = documentManager.getDocument(docId)
    if (!document) {
        throw new Error(`Unknown document: ${docId}`)
    }
    return document
}

function rememberActiveDocument(docId: string, markRead = false): void {
    activeDocumentId = docId
    if (markRead) {
        recentDocumentReads.set(docId, Date.now())
    }
}

function requireActiveDocumentId(): string {
    if (!activeDocumentId) {
        throw new Error(
            "No active document. Call open_document (or start_session) first.",
        )
    }
    return activeDocumentId
}

function documentSummary(document: DocSession) {
    return {
        docId: document.docId,
        filePath: document.filePath,
        title: document.title,
        currentRevision: document.currentRevision,
        lastSavedRevision: document.lastSavedRevision,
        dirty: document.dirty,
        activeTabId: document.activeTabId,
    }
}

function documentSummaryText(document: DocSession): string {
    return [
        `docId: ${document.docId}`,
        `filePath: ${document.filePath ?? "(unsaved)"}`,
        `title: ${document.title}`,
        `currentRevision: ${document.currentRevision}`,
        `lastSavedRevision: ${document.lastSavedRevision}`,
        `dirty: ${document.dirty}`,
        `activeTabId: ${document.activeTabId ?? "(none)"}`,
    ].join("\n")
}

function getLanBaseUrl(port: number): string | null {
    const interfaces = os.networkInterfaces()

    for (const addresses of Object.values(interfaces)) {
        for (const address of addresses || []) {
            if (address.family === "IPv4" && !address.internal) {
                return `http://${address.address}:${port}`
            }
        }
    }

    return null
}

function getPublicUrl(
    port: number,
    docId: string,
    basePath: string,
): string | null {
    if (config.publicBaseUrl) {
        return `${config.publicBaseUrl}/?docId=${docId}`
    }

    const lanBaseUrl = getLanBaseUrl(port)
    if (!lanBaseUrl) {
        return null
    }

    return `${lanBaseUrl}${basePath || ""}/?docId=${docId}`
}

function documentResult(
    heading: string,
    document: DocSession,
    options?: {
        browserUrl?: string
        publicUrl?: string | null
        includeXml?: boolean
        extraText?: string[]
        extraStructured?: Record<string, unknown>
    },
) {
    const sections = [heading, "", documentSummaryText(document)]

    if (options?.browserUrl) {
        sections.push("", `browserUrl: ${options.browserUrl}`)
    }

    if (options?.publicUrl) {
        sections.push("", `publicUrl: ${options.publicUrl}`)
    }

    if (options?.extraText?.length) {
        sections.push("", ...options.extraText)
    }

    if (options?.includeXml) {
        sections.push("", "XML:", document.currentXml)
    }

    return {
        content: [{ type: "text" as const, text: sections.join("\n") }],
        structuredContent: {
            ...documentSummary(document),
            ...(options?.browserUrl ? { browserUrl: options.browserUrl } : {}),
            ...(options?.publicUrl ? { publicUrl: options.publicUrl } : {}),
            ...(options?.includeXml ? { xml: document.currentXml } : {}),
            ...(options?.extraStructured || {}),
        },
    }
}

async function openDocumentWorkflow(filePath?: string) {
    const port = await startHttpServer(config.port)
    const document = await documentManager.openDocument(filePath)
    ensureStateForDocument(document)

    const basePath = getServerBasePath()
    const browserPath = `${basePath || ""}/?docId=${document.docId}`
    const browserUrl = `http://localhost:${port}${browserPath}`
    const publicUrl = getPublicUrl(port, document.docId, basePath)
    await open(browserUrl)

    rememberActiveDocument(document.docId)
    log.info(
        `Opened document ${document.docId} (${document.filePath ?? "untitled"}), browser at ${browserUrl}${publicUrl ? `, public at ${publicUrl}` : ""}`,
    )

    return { document, browserUrl, publicUrl }
}

async function syncDocumentFromBrowser(
    docId: string,
    source = "browser-sync",
): Promise<DocSession> {
    const initial = getDocumentOrThrow(docId)
    ensureStateForDocument(initial)

    const syncRequested = requestSync(docId)
    if (syncRequested) {
        const synced = await waitForSync(docId)
        if (!synced) {
            log.warn(`Sync timeout for document ${docId}; using latest known state`)
        }
    }

    const browserState = getState(docId)
    if (browserState?.xml) {
        documentManager.recordBrowserSync(docId, browserState.xml, source)
    }

    const document = getDocumentOrThrow(docId)
    ensureStateForDocument(document)
    return document
}

function validateOperations(operations: DiagramOperation[]): DiagramOperation[] {
    return operations.map((operation) => {
        if (!operation.new_xml) {
            return operation
        }

        const { valid, error, fixed, fixes } = validateAndFixXml(
            operation.new_xml,
        )

        if (fixed) {
            log.info(
                `Operation ${operation.operation} ${operation.cell_id}: XML auto-fixed: ${fixes.join(", ")}`,
            )
            return { ...operation, new_xml: fixed }
        }

        if (!valid && error) {
            log.warn(
                `Operation ${operation.operation} ${operation.cell_id}: XML validation failed: ${error}`,
            )
        }

        return operation
    })
}

async function applyOperationsWorkflow(
    docId: string,
    operations: DiagramOperation[],
    source: string,
) {
    const current = await syncDocumentFromBrowser(docId, `${source}-pre-sync`)
    const browserState = getState(docId)
    addHistory(docId, current.currentXml, browserState?.svg || "")

    const validatedOperations = validateOperations(operations)
    const outcome = documentManager.applyOperations(
        docId,
        validatedOperations,
        source,
    )

    ensureStateForDocument(outcome.document)
    setState(docId, outcome.document.currentXml)
    addHistory(docId, outcome.document.currentXml, "")
    rememberActiveDocument(docId, true)

    return outcome
}

function formatRevisionEvent(revision: RevisionEvent) {
    return {
        docId: revision.docId,
        revision: revision.revision,
        actor: revision.actor,
        source: revision.source,
        timestamp: revision.timestamp,
        summary: revision.summary,
        semanticChanges: revision.semanticChanges || [],
    }
}

// Tool: open_document
server.registerTool(
    "open_document",
    {
        description:
            "Open an existing draw.io document or create a new one, start the embedded HTTP server, and open browser preview. Returns the docId to use with the document-scoped MCP tools.",
        inputSchema: {
            path: z
                .string()
                .optional()
                .describe(
                    "Optional file path to open. If omitted, creates a new untitled document.",
                ),
        },
    },
    async ({ path }) => {
        try {
            const { document, browserUrl, publicUrl } = await openDocumentWorkflow(path)
            return documentResult("Document opened successfully!", document, {
                browserUrl,
                publicUrl,
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("open_document failed:", message)
            return errorResult(message)
        }
    },
)

// Tool: get_document
server.registerTool(
    "get_document",
    {
        description:
            "Fetch the latest document XML and metadata for a specific docId. This syncs from the browser first so human edits are reflected.",
        inputSchema: {
            docId: z
                .string()
                .describe("Document ID returned by open_document"),
        },
    },
    async ({ docId }) => {
        try {
            const document = await syncDocumentFromBrowser(
                docId,
                "mcp-get_document",
            )
            rememberActiveDocument(docId, true)
            return documentResult("Current document state", document, {
                includeXml: true,
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("get_document failed:", message)
            return errorResult(message)
        }
    },
)

// Tool: apply_operations
server.registerTool(
    "apply_operations",
    {
        description:
            "Apply add/update/delete mxCell operations to a specific document. Syncs the latest browser state first, then pushes the updated XML back to the preview.",
        inputSchema: {
            docId: z
                .string()
                .describe("Document ID returned by open_document"),
            operations: z
                .array(
                    z.object({
                        operation: z
                            .enum(["update", "add", "delete"])
                            .describe(
                                "Operation to perform: add, update, or delete",
                            ),
                        cell_id: z.string().describe("The id of the mxCell"),
                        new_xml: z
                            .string()
                            .optional()
                            .describe(
                                "Complete mxCell XML element (required for update/add)",
                            ),
                    }),
                )
                .describe("Array of operations to apply"),
        },
    },
    async ({ docId, operations }) => {
        try {
            const outcome = await applyOperationsWorkflow(
                docId,
                operations as DiagramOperation[],
                "mcp-apply_operations",
            )

            const warnings = outcome.errors.map(
                (error) => `- ${error.type} ${error.cellId}: ${error.message}`,
            )
            const revision = outcome.revision
                ? formatRevisionEvent(outcome.revision)
                : null

            return documentResult(
                "Operations applied successfully!",
                outcome.document,
                {
                    extraText: [
                        `operationsApplied: ${operations.length}`,
                        `revisionCreated: ${revision?.revision ?? "(no-op)"}`,
                        ...(warnings.length ? ["", "Warnings:", ...warnings] : []),
                    ],
                    extraStructured: {
                        operationsApplied: operations.length,
                        revision,
                        warnings: outcome.errors,
                    },
                },
            )
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("apply_operations failed:", message)
            return errorResult(message)
        }
    },
)

// Tool: get_human_changes
server.registerTool(
    "get_human_changes",
    {
        description:
            "Return human/browser-originated revisions for a specific document after the given revision number.",
        inputSchema: {
            docId: z
                .string()
                .describe("Document ID returned by open_document"),
            sinceRevision: z
                .number()
                .int()
                .min(0)
                .describe(
                    "Return human changes with revision numbers greater than this value",
                ),
        },
    },
    async ({ docId, sinceRevision }) => {
        try {
            const document = await syncDocumentFromBrowser(
                docId,
                "mcp-get_human_changes",
            )
            const changes = documentManager
                .getHumanChanges(docId, sinceRevision)
                .map(formatRevisionEvent)

            rememberActiveDocument(docId, true)

            return documentResult("Human changes fetched", document, {
                extraText: [
                    `sinceRevision: ${sinceRevision}`,
                    `changeCount: ${changes.length}`,
                    "",
                    "changes:",
                    JSON.stringify(changes, null, 2),
                ],
                extraStructured: {
                    sinceRevision,
                    changeCount: changes.length,
                    changes,
                },
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("get_human_changes failed:", message)
            return errorResult(message)
        }
    },
)

// Tool: save_document
server.registerTool(
    "save_document",
    {
        description:
            "Save a specific document back to its bound file path. The document must have been opened from a path already.",
        inputSchema: {
            docId: z
                .string()
                .describe("Document ID returned by open_document"),
        },
    },
    async ({ docId }) => {
        try {
            await syncDocumentFromBrowser(docId, "mcp-save_document")
            const document = await documentManager.saveDocument(docId)
            ensureStateForDocument(document)
            rememberActiveDocument(docId)
            return documentResult("Document saved successfully!", document)
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("save_document failed:", message)
            return errorResult(message)
        }
    },
)

// Compatibility alias: start_session
server.registerTool(
    "start_session",
    {
        description:
            "Compatibility alias for open_document() with no path. Starts a new untitled document session and opens browser preview.",
        inputSchema: {},
    },
    async () => {
        try {
            const { document, browserUrl, publicUrl } = await openDocumentWorkflow()
            return documentResult("Session started successfully!", document, {
                browserUrl,
                publicUrl,
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("start_session failed:", message)
            return errorResult(message)
        }
    },
)

// Compatibility alias: create_new_diagram
server.registerTool(
    "create_new_diagram",
    {
        description:
            "Compatibility tool that replaces the active document XML with the provided mxGraphModel content.",
        inputSchema: {
            xml: z
                .string()
                .describe(
                    "REQUIRED: The complete mxGraphModel XML. Must always be provided.",
                ),
        },
    },
    async ({ xml: inputXml }) => {
        try {
            const docId = requireActiveDocumentId()
            const current = await syncDocumentFromBrowser(
                docId,
                "mcp-create_new_diagram-pre-sync",
            )
            const browserState = getState(docId)
            addHistory(docId, current.currentXml, browserState?.svg || "")

            let xml = inputXml
            const { valid, error, fixed, fixes } = validateAndFixXml(xml)
            if (fixed) {
                xml = fixed
                log.info(`XML auto-fixed: ${fixes.join(", ")}`)
            }
            if (!valid && error) {
                return errorResult(`XML validation failed - ${error}`)
            }

            documentManager.recordBrowserSync(docId, xml, "agent-create_new_diagram")
            const updated = getDocumentOrThrow(docId)
            ensureStateForDocument(updated)
            setState(docId, updated.currentXml)
            addHistory(docId, updated.currentXml, "")
            rememberActiveDocument(docId, true)

            return documentResult("Diagram content set successfully!", updated, {
                extraText: [`xmlLength: ${updated.currentXml.length} characters`],
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("create_new_diagram failed:", message)
            return errorResult(message)
        }
    },
)

// Compatibility alias: edit_diagram
server.registerTool(
    "edit_diagram",
    {
        description:
            "Compatibility wrapper for apply_operations on the active document. Requires get_diagram/get_document first to reduce accidental overwrites.",
        inputSchema: {
            operations: z
                .array(
                    z.object({
                        operation: z
                            .enum(["update", "add", "delete"])
                            .describe(
                                "Operation to perform: add, update, or delete",
                            ),
                        cell_id: z.string().describe("The id of the mxCell"),
                        new_xml: z
                            .string()
                            .optional()
                            .describe(
                                "Complete mxCell XML element (required for update/add)",
                            ),
                    }),
                )
                .describe("Array of operations to apply"),
        },
    },
    async ({ operations }) => {
        try {
            const docId = requireActiveDocumentId()
            const lastRead = recentDocumentReads.get(docId) || 0
            if (Date.now() - lastRead > 30000) {
                return errorResult(
                    "You must call get_document or get_diagram first before edit_diagram so the latest browser state is synced.",
                )
            }

            const outcome = await applyOperationsWorkflow(
                docId,
                operations as DiagramOperation[],
                "agent-edit_diagram",
            )

            const warnings = outcome.errors.map(
                (error) => `- ${error.type} ${error.cellId}: ${error.message}`,
            )

            return documentResult(
                "Diagram edited successfully!",
                outcome.document,
                {
                    extraText: [
                        `operationsApplied: ${operations.length}`,
                        ...(warnings.length ? ["", "Warnings:", ...warnings] : []),
                    ],
                    extraStructured: {
                        operationsApplied: operations.length,
                        revision: outcome.revision
                            ? formatRevisionEvent(outcome.revision)
                            : null,
                        warnings: outcome.errors,
                    },
                },
            )
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("edit_diagram failed:", message)
            return errorResult(message)
        }
    },
)

// Compatibility alias: get_diagram
server.registerTool(
    "get_diagram",
    {
        description:
            "Compatibility wrapper for get_document on the active document. Returns the latest XML after syncing browser edits.",
    },
    async () => {
        try {
            const docId = requireActiveDocumentId()
            const document = await syncDocumentFromBrowser(docId, "mcp-get_diagram")
            rememberActiveDocument(docId, true)
            return documentResult("Current diagram XML", document, {
                includeXml: true,
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("get_diagram failed:", message)
            return errorResult(message)
        }
    },
)

// Compatibility tool: export_diagram
server.registerTool(
    "export_diagram",
    {
        description:
            "Export the active document to a file. Supports .drawio (XML), .png, and .svg formats.",
        inputSchema: {
            path: z
                .string()
                .describe(
                    "File path to save the diagram (e.g., ./diagram.drawio, ./diagram.png, ./diagram.svg)",
                ),
            format: z
                .enum(["drawio", "png", "svg"])
                .optional()
                .describe(
                    "Export format. If omitted, detected from file extension. Defaults to drawio.",
                ),
        },
    },
    async ({ path, format }) => {
        try {
            const docId = requireActiveDocumentId()
            const document = await syncDocumentFromBrowser(
                docId,
                "mcp-export_diagram",
            )

            const fs = await import("node:fs/promises")
            const nodePath = await import("node:path")

            const ext = nodePath.extname(path).toLowerCase()
            const detectedFormat =
                format ||
                (ext === ".png" ? "png" : ext === ".svg" ? "svg" : "drawio")

            if (detectedFormat === "drawio") {
                let filePath = path
                if (!filePath.endsWith(".drawio")) {
                    filePath = `${filePath}.drawio`
                }
                const absolutePath = nodePath.resolve(filePath)
                await fs.writeFile(absolutePath, document.currentXml, "utf-8")
                return {
                    content: [
                        {
                            type: "text",
                            text: `Diagram exported successfully!\n\nFile: ${absolutePath}\nFormat: drawio\ndocId: ${document.docId}\ncurrentRevision: ${document.currentRevision}\ndirty: ${document.dirty}`,
                        },
                    ],
                    structuredContent: {
                        ...documentSummary(document),
                        exportPath: absolutePath,
                        exportFormat: "drawio",
                    },
                }
            }

            let filePath = path
            if (ext !== `.${detectedFormat}`) {
                if (ext === ".drawio" || ext === ".png" || ext === ".svg") {
                    filePath = filePath.slice(0, -ext.length)
                }
                filePath = `${filePath}.${detectedFormat}`
            }
            const absolutePath = nodePath.resolve(filePath)

            const state = getState(docId)
            if (!state) {
                return errorResult(
                    "Session state not found. Open the document in the browser before exporting.",
                )
            }

            state.exportFormat = detectedFormat as "png" | "svg"
            state.exportData = undefined

            const timeoutMs = 10000
            const start = Date.now()
            while (Date.now() - start < timeoutMs) {
                if (state.exportData) {
                    break
                }
                await new Promise((resolve) => setTimeout(resolve, 200))
            }

            const exportData = state.exportData as string | undefined
            state.exportData = undefined
            state.exportFormat = undefined

            if (!exportData) {
                return errorResult(
                    "Export timed out. Make sure the browser tab is open and the diagram is loaded.",
                )
            }

            if (detectedFormat === "png") {
                const base64 = exportData.replace(
                    /^data:image\/png;base64,/,
                    "",
                )
                await fs.writeFile(absolutePath, Buffer.from(base64, "base64"))
            } else {
                let svgContent = exportData
                if (svgContent.startsWith("data:image/svg+xml;base64,")) {
                    const base64 = svgContent.replace(
                        /^data:image\/svg\+xml;base64,/,
                        "",
                    )
                    svgContent = Buffer.from(base64, "base64").toString(
                        "utf-8",
                    )
                }
                await fs.writeFile(absolutePath, svgContent, "utf-8")
            }

            const stat = await fs.stat(absolutePath)
            return {
                content: [
                    {
                        type: "text",
                        text: `Diagram exported successfully!\n\nFile: ${absolutePath}\nFormat: ${detectedFormat}\nSize: ${stat.size} bytes\ndocId: ${document.docId}\ncurrentRevision: ${document.currentRevision}\ndirty: ${document.dirty}`,
                    },
                ],
                structuredContent: {
                    ...documentSummary(document),
                    exportPath: absolutePath,
                    exportFormat: detectedFormat,
                    size: stat.size,
                },
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            log.error("export_diagram failed:", message)
            return errorResult(message)
        }
    },
)

// Graceful shutdown handler
let isShuttingDown = false
function gracefulShutdown(reason: string) {
    if (isShuttingDown) return
    isShuttingDown = true
    log.info(`Shutting down: ${reason}`)
    shutdown()
    process.exit(0)
}

// Handle stdin close (primary method - works on all platforms including Windows)
process.stdin.on("close", () => gracefulShutdown("stdin closed"))
process.stdin.on("end", () => gracefulShutdown("stdin ended"))

// Handle signals (may not work reliably on Windows)
process.on("SIGINT", () => gracefulShutdown("SIGINT"))
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))

// Handle broken pipe (writing to closed stdout)
process.stdout.on("error", (err) => {
    if (err.code === "EPIPE" || err.code === "ERR_STREAM_DESTROYED") {
        gracefulShutdown("stdout error")
    }
})

// Start the MCP server
async function main() {
    log.info("Starting MCP server for Next AI Draw.io (embedded mode)...")

    const transport = new StdioServerTransport()
    await server.connect(transport)

    log.info("MCP server running on stdio")
}

main().catch((error) => {
    log.error("Fatal error:", error)
    process.exit(1)
})
