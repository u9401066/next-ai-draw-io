/**
 * RedoOperationUseCase - 重做操作
 */

import { CheckpointManager, Checkpoint } from '../../domain/checkpoint';

export interface RedoOperationInput {
    diagramId: string;
}

export interface RedoOperationOutput {
    success: boolean;
    checkpoint: Checkpoint | null;
    canUndo: boolean;
    canRedoMore: boolean;
}

export class RedoOperationUseCase {
    constructor(private readonly checkpointManager: CheckpointManager) { }

    execute(input: RedoOperationInput): RedoOperationOutput {
        const checkpoint = this.checkpointManager.redo(input.diagramId);

        return {
            success: checkpoint !== null,
            checkpoint,
            canUndo: this.checkpointManager.canUndo(input.diagramId),
            canRedoMore: this.checkpointManager.canRedo(input.diagramId),
        };
    }
}
