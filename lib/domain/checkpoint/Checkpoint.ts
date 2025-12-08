/**
 * Checkpoint 實體
 * 
 * 表示圖表的一個版本快照
 */

import { CheckpointId, CheckpointProps, CheckpointSource } from './types';

export class Checkpoint {
    private readonly props: CheckpointProps;

    private constructor(props: CheckpointProps) {
        this.props = props;
    }

    // === Factory Methods ===

    static create(
        diagramId: string,
        xml: string,
        svg: string,
        source: CheckpointSource,
        description?: string,
        parentId?: CheckpointId
    ): Checkpoint {
        const id: CheckpointId = { value: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };

        return new Checkpoint({
            id,
            diagramId,
            xml,
            svg,
            source,
            description: description || `${source === 'agent' ? 'Agent' : 'User'} 操作`,
            timestamp: new Date(),
            parentId,
        });
    }

    static fromProps(props: CheckpointProps): Checkpoint {
        return new Checkpoint(props);
    }

    // === Getters ===

    get id(): CheckpointId {
        return this.props.id;
    }

    get diagramId(): string {
        return this.props.diagramId;
    }

    get xml(): string {
        return this.props.xml;
    }

    get svg(): string {
        return this.props.svg;
    }

    get source(): CheckpointSource {
        return this.props.source;
    }

    get description(): string {
        return this.props.description;
    }

    get timestamp(): Date {
        return this.props.timestamp;
    }

    get parentId(): CheckpointId | undefined {
        return this.props.parentId;
    }

    // === Queries ===

    isFromAgent(): boolean {
        return this.source === 'agent';
    }

    isFromUser(): boolean {
        return this.source === 'user';
    }

    toProps(): CheckpointProps {
        return { ...this.props };
    }
}
