/**
 * useCheckpoint - React Hook for Checkpoint Management
 * 
 * 封裝 DDD CheckpointManager 為 React Hook
 */

import { useRef, useCallback, useMemo } from 'react';
import { CheckpointManager, Checkpoint, CheckpointSource } from '../lib/domain/checkpoint';

interface UseCheckpointReturn {
    // Commands
    saveCheckpoint: (
        diagramId: string,
        xml: string,
        svg: string,
        source: CheckpointSource,
        description?: string
    ) => Checkpoint;
    undo: (diagramId: string) => Checkpoint | null;
    redo: (diagramId: string) => Checkpoint | null;
    goTo: (diagramId: string, checkpointId: string) => Checkpoint | null;
    clear: (diagramId: string) => void;

    // Queries
    list: (diagramId: string) => Checkpoint[];
    getCurrent: (diagramId: string) => Checkpoint | null;
    canUndo: (diagramId: string) => boolean;
    canRedo: (diagramId: string) => boolean;
    count: (diagramId: string) => number;
}

export function useCheckpoint(): UseCheckpointReturn {
    const managerRef = useRef<CheckpointManager>(new CheckpointManager(50));

    const saveCheckpoint = useCallback((
        diagramId: string,
        xml: string,
        svg: string,
        source: CheckpointSource,
        description?: string
    ): Checkpoint => {
        return managerRef.current.save(diagramId, xml, svg, source, description);
    }, []);

    const undo = useCallback((diagramId: string): Checkpoint | null => {
        return managerRef.current.undo(diagramId);
    }, []);

    const redo = useCallback((diagramId: string): Checkpoint | null => {
        return managerRef.current.redo(diagramId);
    }, []);

    const goTo = useCallback((diagramId: string, checkpointId: string): Checkpoint | null => {
        return managerRef.current.goTo(diagramId, { value: checkpointId });
    }, []);

    const clear = useCallback((diagramId: string): void => {
        managerRef.current.clear(diagramId);
    }, []);

    const list = useCallback((diagramId: string): Checkpoint[] => {
        return managerRef.current.list(diagramId);
    }, []);

    const getCurrent = useCallback((diagramId: string): Checkpoint | null => {
        return managerRef.current.getCurrent(diagramId);
    }, []);

    const canUndo = useCallback((diagramId: string): boolean => {
        return managerRef.current.canUndo(diagramId);
    }, []);

    const canRedo = useCallback((diagramId: string): boolean => {
        return managerRef.current.canRedo(diagramId);
    }, []);

    const count = useCallback((diagramId: string): number => {
        return managerRef.current.count(diagramId);
    }, []);

    return useMemo(() => ({
        saveCheckpoint,
        undo,
        redo,
        goTo,
        clear,
        list,
        getCurrent,
        canUndo,
        canRedo,
        count,
    }), [saveCheckpoint, undo, redo, goTo, clear, list, getCurrent, canUndo, canRedo, count]);
}
