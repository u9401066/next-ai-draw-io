/**
 * CheckpointManager - 管理圖表版本歷史
 * 
 * 負責：
 * - 儲存檢查點
 * - Undo/Redo 操作
 * - 歷史瀏覽
 */

import { Checkpoint } from './Checkpoint';
import { CheckpointId, CheckpointSource } from './types';

export class CheckpointManager {
    private checkpoints: Map<string, Checkpoint[]> = new Map(); // diagramId -> checkpoints
    private currentIndex: Map<string, number> = new Map(); // diagramId -> current index
    private readonly maxCheckpoints: number;

    constructor(maxCheckpoints: number = 50) {
        this.maxCheckpoints = maxCheckpoints;
    }

    // === Commands ===

    /**
     * 儲存新的檢查點
     */
    save(
        diagramId: string,
        xml: string,
        svg: string,
        source: CheckpointSource,
        description?: string
    ): Checkpoint {
        const checkpoints = this.getCheckpointsForDiagram(diagramId);
        const currentIdx = this.currentIndex.get(diagramId) ?? -1;

        // 如果不在最新位置，移除後面的檢查點（分支歷史）
        if (currentIdx < checkpoints.length - 1) {
            checkpoints.splice(currentIdx + 1);
        }

        // 取得父 ID
        const parentId = currentIdx >= 0 ? checkpoints[currentIdx]?.id : undefined;

        // 建立新檢查點
        const checkpoint = Checkpoint.create(diagramId, xml, svg, source, description, parentId);
        checkpoints.push(checkpoint);

        // 限制數量
        if (checkpoints.length > this.maxCheckpoints) {
            checkpoints.shift();
        }

        // 更新索引
        this.checkpoints.set(diagramId, checkpoints);
        this.currentIndex.set(diagramId, checkpoints.length - 1);

        return checkpoint;
    }

    /**
     * Undo - 回到上一個檢查點
     */
    undo(diagramId: string): Checkpoint | null {
        const currentIdx = this.currentIndex.get(diagramId) ?? -1;

        if (currentIdx <= 0) return null;

        const newIndex = currentIdx - 1;
        this.currentIndex.set(diagramId, newIndex);

        const checkpoints = this.getCheckpointsForDiagram(diagramId);
        return checkpoints[newIndex] || null;
    }

    /**
     * Redo - 前進到下一個檢查點
     */
    redo(diagramId: string): Checkpoint | null {
        const checkpoints = this.getCheckpointsForDiagram(diagramId);
        const currentIdx = this.currentIndex.get(diagramId) ?? -1;

        if (currentIdx >= checkpoints.length - 1) return null;

        const newIndex = currentIdx + 1;
        this.currentIndex.set(diagramId, newIndex);

        return checkpoints[newIndex] || null;
    }

    /**
     * 跳轉到指定檢查點
     */
    goTo(diagramId: string, checkpointId: CheckpointId): Checkpoint | null {
        const checkpoints = this.getCheckpointsForDiagram(diagramId);
        const index = checkpoints.findIndex(cp => cp.id.value === checkpointId.value);

        if (index === -1) return null;

        this.currentIndex.set(diagramId, index);
        return checkpoints[index];
    }

    // === Queries ===

    /**
     * 取得所有檢查點
     */
    list(diagramId: string): Checkpoint[] {
        return [...this.getCheckpointsForDiagram(diagramId)];
    }

    /**
     * 取得當前檢查點
     */
    getCurrent(diagramId: string): Checkpoint | null {
        const checkpoints = this.getCheckpointsForDiagram(diagramId);
        const currentIdx = this.currentIndex.get(diagramId) ?? -1;
        return checkpoints[currentIdx] || null;
    }

    /**
     * 是否可以 Undo
     */
    canUndo(diagramId: string): boolean {
        const currentIdx = this.currentIndex.get(diagramId) ?? -1;
        return currentIdx > 0;
    }

    /**
     * 是否可以 Redo
     */
    canRedo(diagramId: string): boolean {
        const checkpoints = this.getCheckpointsForDiagram(diagramId);
        const currentIdx = this.currentIndex.get(diagramId) ?? -1;
        return currentIdx < checkpoints.length - 1;
    }

    /**
     * 取得檢查點數量
     */
    count(diagramId: string): number {
        return this.getCheckpointsForDiagram(diagramId).length;
    }

    /**
     * 清除圖表的所有檢查點
     */
    clear(diagramId: string): void {
        this.checkpoints.delete(diagramId);
        this.currentIndex.delete(diagramId);
    }

    /**
     * 清除所有檢查點
     */
    clearAll(): void {
        this.checkpoints.clear();
        this.currentIndex.clear();
    }

    // === Private ===

    private getCheckpointsForDiagram(diagramId: string): Checkpoint[] {
        if (!this.checkpoints.has(diagramId)) {
            this.checkpoints.set(diagramId, []);
        }
        return this.checkpoints.get(diagramId)!;
    }
}
