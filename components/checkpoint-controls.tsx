"use client";

/**
 * CheckpointControls - Undo/Redo 按鈕元件
 * 
 * 提供圖表的版本回復控制
 */

import React, { useEffect, useCallback } from 'react';
import { Undo2, Redo2, History } from 'lucide-react';
import { ButtonWithTooltip } from '@/components/button-with-tooltip';
import { useDiagram } from '@/contexts/diagram-context';

interface CheckpointControlsProps {
    onShowHistory?: () => void;
    className?: string;
}

export function CheckpointControls({ onShowHistory, className }: CheckpointControlsProps) {
    const {
        undoCheckpoint,
        redoCheckpoint,
        saveCheckpoint,
        canUndo,
        canRedo,
        checkpointCount,
    } = useDiagram();

    // 鍵盤快捷鍵處理
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ctrl+Shift+Z = Undo checkpoint (不是普通的 Ctrl+Z，避免與 draw.io 衝突)
        if (event.ctrlKey && event.shiftKey && event.key === 'Z') {
            event.preventDefault();
            if (canUndo) {
                undoCheckpoint();
                console.log('[CheckpointControls] Undo via keyboard shortcut');
            }
        }

        // Ctrl+Shift+Y = Redo checkpoint
        if (event.ctrlKey && event.shiftKey && event.key === 'Y') {
            event.preventDefault();
            if (canRedo) {
                redoCheckpoint();
                console.log('[CheckpointControls] Redo via keyboard shortcut');
            }
        }

        // Ctrl+Shift+S = 手動儲存 checkpoint
        if (event.ctrlKey && event.shiftKey && event.key === 'S') {
            event.preventDefault();
            saveCheckpoint('user', '手動儲存');
            console.log('[CheckpointControls] Manual save via keyboard shortcut');
        }
    }, [canUndo, canRedo, undoCheckpoint, redoCheckpoint, saveCheckpoint]);

    // 監聽鍵盤事件
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className={`flex items-center gap-1 ${className || ''}`}>
            {/* Undo Button */}
            <ButtonWithTooltip
                variant="ghost"
                size="icon"
                onClick={() => undoCheckpoint()}
                disabled={!canUndo}
                title="復原 (Ctrl+Shift+Z)"
                tooltipContent="回到上一個版本"
                className="h-8 w-8"
            >
                <Undo2 className="h-4 w-4" />
            </ButtonWithTooltip>

            {/* Redo Button */}
            <ButtonWithTooltip
                variant="ghost"
                size="icon"
                onClick={() => redoCheckpoint()}
                disabled={!canRedo}
                title="重做 (Ctrl+Shift+Y)"
                tooltipContent="前進到下一個版本"
                className="h-8 w-8"
            >
                <Redo2 className="h-4 w-4" />
            </ButtonWithTooltip>

            {/* History Button (如果有提供 callback) */}
            {onShowHistory && (
                <ButtonWithTooltip
                    variant="ghost"
                    size="icon"
                    onClick={onShowHistory}
                    title="歷史記錄"
                    tooltipContent={`檢視版本歷史 (${checkpointCount} 個版本)`}
                    className="h-8 w-8"
                >
                    <History className="h-4 w-4" />
                </ButtonWithTooltip>
            )}

            {/* Checkpoint Count Badge */}
            {checkpointCount > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                    {checkpointCount}
                </span>
            )}
        </div>
    );
}
