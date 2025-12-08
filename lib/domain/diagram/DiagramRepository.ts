/**
 * DiagramRepository 介面
 * 
 * 定義圖表的儲存和讀取操作，由 Infrastructure 層實作
 */

import { Diagram } from './Diagram';
import { DiagramId } from './types';

export interface DiagramRepository {
    /**
     * 儲存圖表
     */
    save(diagram: Diagram): Promise<void>;

    /**
     * 根據 ID 取得圖表
     */
    findById(id: DiagramId): Promise<Diagram | null>;

    /**
     * 根據 Tab ID 取得圖表
     */
    findByTabId(tabId: string): Promise<Diagram | null>;

    /**
     * 取得所有圖表
     */
    findAll(): Promise<Diagram[]>;

    /**
     * 刪除圖表
     */
    delete(id: DiagramId): Promise<void>;

    /**
     * 清除所有圖表
     */
    clear(): Promise<void>;
}
