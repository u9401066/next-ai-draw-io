/**
 * Diagram 聚合根
 * 
 * 封裝圖表的核心業務邏輯，包括：
 * - XML 內容管理
 * - 元素操作
 * - 狀態追蹤
 */

import { DiagramId, DiagramProps, DiagramElement, DiagramSnapshot } from './types';

export class Diagram {
    private readonly props: DiagramProps;
    private snapshots: DiagramSnapshot[] = [];

    private constructor(props: DiagramProps) {
        this.props = props;
    }

    // === Factory Methods ===

    static create(name: string, xml?: string): Diagram {
        const now = new Date();
        const id: DiagramId = { value: `diagram-${Date.now()}` };

        return new Diagram({
            id,
            name,
            xml: xml || Diagram.emptyXml(),
            createdAt: now,
            updatedAt: now,
        });
    }

    static fromProps(props: DiagramProps): Diagram {
        return new Diagram(props);
    }

    static emptyXml(): string {
        return `<mxfile>
      <diagram name="Page-1" id="page-1">
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
          </root>
        </mxGraphModel>
      </diagram>
    </mxfile>`;
    }

    // === Getters ===

    get id(): DiagramId {
        return this.props.id;
    }

    get name(): string {
        return this.props.name;
    }

    get xml(): string {
        return this.props.xml;
    }

    get svg(): string | undefined {
        return this.props.svg;
    }

    get tabId(): string | undefined {
        return this.props.tabId;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    // === Commands ===

    updateXml(xml: string, svg?: string): void {
        // 儲存快照（用於 undo）
        this.saveSnapshot();

        this.props.xml = xml;
        if (svg) {
            this.props.svg = svg;
        }
        this.props.updatedAt = new Date();
    }

    updateName(name: string): void {
        this.props.name = name;
        this.props.updatedAt = new Date();
    }

    setTabId(tabId: string): void {
        this.props.tabId = tabId;
    }

    // === Snapshot Management ===

    saveSnapshot(): void {
        if (this.props.xml) {
            this.snapshots.push({
                xml: this.props.xml,
                svg: this.props.svg || '',
                timestamp: new Date(),
            });

            // 限制快照數量（避免記憶體爆掉）
            if (this.snapshots.length > 50) {
                this.snapshots.shift();
            }
        }
    }

    getSnapshots(): DiagramSnapshot[] {
        return [...this.snapshots];
    }

    restoreSnapshot(index: number): boolean {
        const snapshot = this.snapshots[index];
        if (!snapshot) return false;

        this.props.xml = snapshot.xml;
        this.props.svg = snapshot.svg;
        this.props.updatedAt = new Date();

        // 移除此快照之後的所有快照
        this.snapshots = this.snapshots.slice(0, index);

        return true;
    }

    canUndo(): boolean {
        return this.snapshots.length > 0;
    }

    undo(): DiagramSnapshot | null {
        if (!this.canUndo()) return null;

        const lastIndex = this.snapshots.length - 1;
        const snapshot = this.snapshots[lastIndex];
        this.restoreSnapshot(lastIndex);

        return snapshot;
    }

    // === Queries ===

    isEmpty(): boolean {
        // 檢查是否只有空的 root cells
        return !this.props.xml ||
            !this.props.xml.includes('mxCell id="') ||
            (this.props.xml.match(/mxCell/g) || []).length <= 2;
    }

    toProps(): DiagramProps {
        return { ...this.props };
    }
}
