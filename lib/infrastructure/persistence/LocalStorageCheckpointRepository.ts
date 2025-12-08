/**
 * LocalStorageCheckpointRepository - 將 Checkpoint 持久化到 localStorage
 */

import { Checkpoint } from '../../domain/checkpoint';
import { CheckpointProps } from '../../domain/checkpoint/types';

const STORAGE_KEY = 'drawio-checkpoints';

export class LocalStorageCheckpointRepository {

    /**
     * 儲存所有檢查點
     */
    saveAll(diagramId: string, checkpoints: Checkpoint[]): void {
        try {
            const allData = this.loadAllData();
            allData[diagramId] = checkpoints.map(cp => cp.toProps());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        } catch (error) {
            console.error('[LocalStorageCheckpointRepository] Failed to save:', error);
        }
    }

    /**
     * 載入指定圖表的所有檢查點
     */
    loadByDiagramId(diagramId: string): Checkpoint[] {
        try {
            const allData = this.loadAllData();
            const propsArray = allData[diagramId] || [];
            return propsArray.map((props: CheckpointProps) =>
                Checkpoint.fromProps({
                    ...props,
                    timestamp: new Date(props.timestamp),
                })
            );
        } catch (error) {
            console.error('[LocalStorageCheckpointRepository] Failed to load:', error);
            return [];
        }
    }

    /**
     * 清除指定圖表的檢查點
     */
    clearByDiagramId(diagramId: string): void {
        try {
            const allData = this.loadAllData();
            delete allData[diagramId];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        } catch (error) {
            console.error('[LocalStorageCheckpointRepository] Failed to clear:', error);
        }
    }

    /**
     * 清除所有檢查點
     */
    clearAll(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('[LocalStorageCheckpointRepository] Failed to clear all:', error);
        }
    }

    private loadAllData(): Record<string, CheckpointProps[]> {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }
}
