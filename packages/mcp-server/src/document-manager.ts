import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { DOMParser } from "linkedom"
import {
    applyDiagramOperations,
    type DiagramOperation,
    type OperationError,
} from "./diagram-operations.js"

export type RevisionActor = "human" | "agent" | "system"

export type SemanticChange =
    | { kind: "node_added"; id: string; label?: string; shape?: string }
    | { kind: "node_deleted"; id: string; label?: string }
    | { kind: "label_changed"; id: string; before: string; after: string }
    | { kind: "edge_added"; id: string; source?: string; target?: string }
    | { kind: "edge_deleted"; id: string }
    | { kind: "style_changed"; id: string; field: string; before: string; after: string }
    | { kind: "moved"; id: string }

export interface DocTab {
    tabId: string
    name: string
    xml: string
    revision: number
}

export interface RevisionEvent {
    docId: string
    revision: number
    actor: RevisionActor
    source: string
    timestamp: number
    summary?: string
    xml?: string
    semanticChanges?: SemanticChange[]
}

export interface DocSession {
    docId: string
    filePath: string | null
    title: string
    currentRevision: number
    lastSavedRevision: number
    dirty: boolean
    currentXml: string
    savedXml: string
    activeTabId: string | null
    tabs: DocTab[]
    activeClients: string[]
    createdAt: number
    updatedAt: number
}

export interface ApplyOperationsOutcome {
    document: DocSession
    revision: RevisionEvent | null
    errors: OperationError[]
}

interface ManagedDocument extends DocSession {
    revisions: RevisionEvent[]
}

interface CellSnapshot {
    id: string
    label?: string
    style?: string
    parent?: string
    source?: string
    target?: string
    edge: boolean
    shape?: string
    geometry?: {
        x?: string
        y?: string
        width?: string
        height?: string
    }
}

const DEFAULT_TAB_ID = "page-1"
const DEFAULT_TAB_NAME = "Page-1"
const DEFAULT_DIAGRAM_XML =
    '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>'

export class DocumentManager {
    private readonly documents = new Map<string, ManagedDocument>()

    async openDocument(filePath?: string): Promise<DocSession> {
        const resolvedPath = filePath ? path.resolve(filePath) : null
        if (resolvedPath) {
            const existing = this.findByPath(resolvedPath)
            if (existing) {
                return cloneSession(existing)
            }
        }

        let xml = DEFAULT_DIAGRAM_XML
        if (resolvedPath) {
            try {
                xml = await readFile(resolvedPath, "utf-8")
            } catch (error) {
                const code = (error as NodeJS.ErrnoException).code
                if (code !== "ENOENT") {
                    throw error
                }
            }
        }

        const now = Date.now()
        const docId = randomUUID()
        const tab: DocTab = {
            tabId: DEFAULT_TAB_ID,
            name: DEFAULT_TAB_NAME,
            xml,
            revision: 0,
        }

        const document: ManagedDocument = {
            docId,
            filePath: resolvedPath,
            title: resolvedPath ? path.basename(resolvedPath) : "Untitled.drawio",
            currentRevision: 0,
            lastSavedRevision: resolvedPath ? 0 : -1,
            dirty: !resolvedPath,
            currentXml: xml,
            savedXml: resolvedPath ? xml : "",
            activeTabId: tab.tabId,
            tabs: [tab],
            activeClients: [],
            createdAt: now,
            updatedAt: now,
            revisions: [],
        }

        this.documents.set(docId, document)
        return cloneSession(document)
    }

    getDocument(docId: string): DocSession | undefined {
        const document = this.requireDocument(docId)
        return cloneSession(document)
    }

    listDocuments(): DocSession[] {
        return Array.from(this.documents.values(), (document) =>
            cloneSession(document),
        )
    }

    recordBrowserSync(
        docId: string,
        xml: string,
        source = "browser",
    ): RevisionEvent | null {
        const document = this.requireDocument(docId)
        return this.recordRevisionIfChanged(document, {
            xml,
            actor: inferActorFromSource(source, "human"),
            source,
        })
    }

    applyOperations(
        docId: string,
        operations: DiagramOperation[],
        source = "agent",
    ): ApplyOperationsOutcome {
        const document = this.requireDocument(docId)
        const { result, errors } = applyDiagramOperations(
            document.currentXml,
            operations,
        )

        const revision = this.recordRevisionIfChanged(document, {
            xml: result,
            actor: inferActorFromSource(source, "agent"),
            source,
        })

        return {
            document: cloneSession(document),
            revision,
            errors,
        }
    }

    async saveDocument(docId: string): Promise<DocSession> {
        const document = this.requireDocument(docId)
        if (!document.filePath) {
            throw new Error(`Document ${docId} does not have a bound file path`)
        }

        await mkdir(path.dirname(document.filePath), { recursive: true })
        await writeFile(document.filePath, document.currentXml, "utf-8")

        document.savedXml = document.currentXml
        document.lastSavedRevision = document.currentRevision
        document.dirty = false
        document.updatedAt = Date.now()

        return cloneSession(document)
    }

    async saveAs(docId: string, newPath: string): Promise<DocSession> {
        const document = this.requireDocument(docId)
        const resolvedPath = path.resolve(newPath)

        document.filePath = resolvedPath
        document.title = path.basename(resolvedPath)

        return this.saveDocument(docId)
    }

    getHumanChanges(docId: string, sinceRevision: number): RevisionEvent[] {
        const document = this.requireDocument(docId)
        return document.revisions
            .filter(
                (revision) =>
                    revision.actor === "human" &&
                    revision.revision > sinceRevision,
            )
            .map(cloneRevision)
    }

    private findByPath(filePath: string): ManagedDocument | undefined {
        return Array.from(this.documents.values()).find(
            (document) => document.filePath === filePath,
        )
    }

    private requireDocument(docId: string): ManagedDocument {
        const document = this.documents.get(docId)
        if (!document) {
            throw new Error(`Unknown document: ${docId}`)
        }
        return document
    }

    private recordRevisionIfChanged(
        document: ManagedDocument,
        params: {
            xml: string
            actor: RevisionActor
            source: string
        },
    ): RevisionEvent | null {
        const { xml, actor, source } = params
        if (xml === document.currentXml) {
            document.updatedAt = Date.now()
            this.updateActiveTab(document)
            return null
        }

        const semanticChanges = extractSemanticChanges(document.currentXml, xml)
        const revision: RevisionEvent = {
            docId: document.docId,
            revision: document.currentRevision + 1,
            actor,
            source,
            timestamp: Date.now(),
            summary: summarizeChanges(actor, semanticChanges),
            xml,
            semanticChanges,
        }

        document.currentXml = xml
        document.currentRevision = revision.revision
        document.updatedAt = revision.timestamp
        document.dirty = document.currentXml !== document.savedXml
        document.revisions.push(revision)

        this.updateActiveTab(document)
        return cloneRevision(revision)
    }

    private updateActiveTab(document: ManagedDocument): void {
        const activeTab =
            document.tabs.find((tab) => tab.tabId === document.activeTabId) ||
            document.tabs[0]

        if (!activeTab) {
            return
        }

        activeTab.xml = document.currentXml
        activeTab.revision = document.currentRevision
    }
}

function inferActorFromSource(
    source: string,
    fallback: RevisionActor,
): RevisionActor {
    const normalized = source.trim().toLowerCase()
    if (
        normalized.includes("human") ||
        normalized.includes("browser") ||
        normalized.includes("user")
    ) {
        return "human"
    }
    if (
        normalized.includes("system") ||
        normalized.includes("autosave") ||
        normalized.includes("save")
    ) {
        return "system"
    }
    if (normalized.includes("agent") || normalized.includes("mcp")) {
        return "agent"
    }
    return fallback
}

function extractSemanticChanges(
    previousXml: string,
    nextXml: string,
): SemanticChange[] {
    const previous = parseCells(previousXml)
    const next = parseCells(nextXml)
    const changes: SemanticChange[] = []

    for (const [id, after] of next) {
        if (id === "0" || id === "1") {
            continue
        }

        const before = previous.get(id)
        if (!before) {
            if (after.edge) {
                changes.push({
                    kind: "edge_added",
                    id,
                    source: after.source,
                    target: after.target,
                })
            } else {
                changes.push({
                    kind: "node_added",
                    id,
                    label: after.label,
                    shape: after.shape,
                })
            }
            continue
        }

        if ((before.label || "") !== (after.label || "")) {
            changes.push({
                kind: "label_changed",
                id,
                before: before.label || "",
                after: after.label || "",
            })
        }

        if ((before.style || "") !== (after.style || "")) {
            changes.push({
                kind: "style_changed",
                id,
                field: "style",
                before: before.style || "",
                after: after.style || "",
            })
        }

        const beforeGeometry = before.geometry || {}
        const afterGeometry = after.geometry || {}
        if (
            beforeGeometry.x !== afterGeometry.x ||
            beforeGeometry.y !== afterGeometry.y
        ) {
            changes.push({ kind: "moved", id })
        }
    }

    for (const [id, before] of previous) {
        if (id === "0" || id === "1" || next.has(id)) {
            continue
        }

        if (before.edge) {
            changes.push({ kind: "edge_deleted", id })
        } else {
            changes.push({ kind: "node_deleted", id, label: before.label })
        }
    }

    return changes
}

function parseCells(xml: string): Map<string, CellSnapshot> {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "text/xml")
    const cells = new Map<string, CellSnapshot>()

    doc.querySelectorAll("mxCell").forEach((cell: Element) => {
        const id = cell.getAttribute("id")
        if (!id) {
            return
        }

        const style = cell.getAttribute("style") || undefined
        const geometry = cell.querySelector("mxGeometry")
        const shape = extractShape(style)

        cells.set(id, {
            id,
            label: cell.getAttribute("value") || undefined,
            style,
            parent: cell.getAttribute("parent") || undefined,
            source: cell.getAttribute("source") || undefined,
            target: cell.getAttribute("target") || undefined,
            edge: cell.getAttribute("edge") === "1",
            shape,
            geometry: geometry
                ? {
                      x: geometry.getAttribute("x") || undefined,
                      y: geometry.getAttribute("y") || undefined,
                      width: geometry.getAttribute("width") || undefined,
                      height: geometry.getAttribute("height") || undefined,
                  }
                : undefined,
        })
    })

    return cells
}

function extractShape(style?: string): string | undefined {
    if (!style) {
        return undefined
    }

    const match = style.match(/(?:^|;)shape=([^;]+)/)
    return match?.[1]
}

function summarizeChanges(
    actor: RevisionActor,
    semanticChanges: SemanticChange[],
): string {
    if (semanticChanges.length === 0) {
        return actor === "human"
            ? "Human edited the diagram"
            : actor === "agent"
              ? "Agent updated the diagram"
              : "System updated the diagram"
    }

    const counts = new Map<string, number>()
    for (const change of semanticChanges) {
        counts.set(change.kind, (counts.get(change.kind) || 0) + 1)
    }

    const detail = Array.from(counts.entries())
        .map(([kind, count]) => `${count} ${kind}`)
        .join(", ")

    return `${capitalize(actor)} changes: ${detail}`
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

function cloneSession(document: ManagedDocument): DocSession {
    return {
        docId: document.docId,
        filePath: document.filePath,
        title: document.title,
        currentRevision: document.currentRevision,
        lastSavedRevision: document.lastSavedRevision,
        dirty: document.dirty,
        currentXml: document.currentXml,
        savedXml: document.savedXml,
        activeTabId: document.activeTabId,
        tabs: document.tabs.map((tab) => ({ ...tab })),
        activeClients: [...document.activeClients],
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
    }
}

function cloneRevision(revision: RevisionEvent): RevisionEvent {
    return {
        ...revision,
        semanticChanges: revision.semanticChanges?.map((change) => ({ ...change })),
    }
}

export type { DiagramOperation, OperationError }
