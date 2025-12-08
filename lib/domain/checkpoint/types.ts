/**
 * Checkpoint 類型定義
 */

export type CheckpointSource = 'user' | 'agent';

export interface CheckpointId {
    value: string;
}

export interface CheckpointProps {
    id: CheckpointId;
    diagramId: string;
    xml: string;
    svg: string;
    source: CheckpointSource;
    description: string;
    timestamp: Date;
    parentId?: CheckpointId;
}
