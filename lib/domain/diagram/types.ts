/**
 * Diagram 聚合根的類型定義
 */

export interface DiagramId {
    value: string;
}

export interface DiagramProps {
    id: DiagramId;
    name: string;
    xml: string;
    svg?: string;
    tabId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DiagramElement {
    id: string;
    type: 'node' | 'edge';
    value: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    source?: string;
    target?: string;
    style?: string;
}

export interface DiagramSnapshot {
    xml: string;
    svg: string;
    timestamp: Date;
}
