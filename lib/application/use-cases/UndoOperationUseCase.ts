/**
 * UndoOperationUseCase - 復原操作
 */

import { CheckpointManager, Checkpoint } from '../../domain/checkpoint';

export interface UndoOperationInput {
    diagramId: string;
}

export interface UndoOperationOutput {
    success: boolean;
    checkpoint: Checkpoint | null;
    canUndoMore: boolean;
    canRedo: boolean;
}

export class UndoOperationUseCase {
    constructor(private readonly checkpointManager: CheckpointManager) { }

    execute(input: UndoOperationInput): UndoOperationOutput {
        const checkpoint = this.checkpointManager.undo(input.diagramId);

        return {
            success: checkpoint !== null,
            checkpoint,
            canUndoMore: this.checkpointManager.canUndo(input.diagramId),
            canRedo: this.checkpointManager.canRedo(input.diagramId),
        };
    }
}
