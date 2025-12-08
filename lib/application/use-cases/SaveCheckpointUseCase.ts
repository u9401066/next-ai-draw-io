/**
 * SaveCheckpointUseCase - 儲存檢查點
 */

import { CheckpointManager, Checkpoint, CheckpointSource } from '../../domain/checkpoint';

export interface SaveCheckpointInput {
    diagramId: string;
    xml: string;
    svg: string;
    source: CheckpointSource;
    description?: string;
}

export interface SaveCheckpointOutput {
    checkpoint: Checkpoint;
    totalCheckpoints: number;
}

export class SaveCheckpointUseCase {
    constructor(private readonly checkpointManager: CheckpointManager) { }

    execute(input: SaveCheckpointInput): SaveCheckpointOutput {
        const checkpoint = this.checkpointManager.save(
            input.diagramId,
            input.xml,
            input.svg,
            input.source,
            input.description
        );

        return {
            checkpoint,
            totalCheckpoints: this.checkpointManager.count(input.diagramId),
        };
    }
}
