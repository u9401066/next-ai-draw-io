/**
 * CheckpointManager Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CheckpointManager } from '@/lib/domain/checkpoint/CheckpointManager';
import { Checkpoint } from '@/lib/domain/checkpoint/Checkpoint';

describe('CheckpointManager', () => {
    let manager: CheckpointManager;
    const diagramId = 'test-diagram-1';

    beforeEach(() => {
        manager = new CheckpointManager(10);
    });

    describe('save', () => {
        it('should save a new checkpoint', () => {
            const checkpoint = manager.save(diagramId, '<xml>test</xml>', '<svg>test</svg>', 'user', 'Initial');

            expect(checkpoint).toBeDefined();
            expect(checkpoint.xml).toBe('<xml>test</xml>');
            expect(checkpoint.svg).toBe('<svg>test</svg>');
            expect(checkpoint.source).toBe('user');
            expect(checkpoint.description).toBe('Initial');
        });

        it('should increment checkpoint count', () => {
            expect(manager.count(diagramId)).toBe(0);

            manager.save(diagramId, '<xml>1</xml>', '<svg>1</svg>', 'user');
            expect(manager.count(diagramId)).toBe(1);

            manager.save(diagramId, '<xml>2</xml>', '<svg>2</svg>', 'agent');
            expect(manager.count(diagramId)).toBe(2);
        });

        it('should limit checkpoints to maxCheckpoints', () => {
            const smallManager = new CheckpointManager(3);

            smallManager.save(diagramId, '<xml>1</xml>', '', 'user');
            smallManager.save(diagramId, '<xml>2</xml>', '', 'user');
            smallManager.save(diagramId, '<xml>3</xml>', '', 'user');
            smallManager.save(diagramId, '<xml>4</xml>', '', 'user');

            expect(smallManager.count(diagramId)).toBe(3);
            expect(smallManager.list(diagramId)[0].xml).toBe('<xml>2</xml>');
        });
    });

    describe('undo/redo', () => {
        beforeEach(() => {
            manager.save(diagramId, '<xml>v1</xml>', '<svg>v1</svg>', 'user', 'Version 1');
            manager.save(diagramId, '<xml>v2</xml>', '<svg>v2</svg>', 'agent', 'Version 2');
            manager.save(diagramId, '<xml>v3</xml>', '<svg>v3</svg>', 'user', 'Version 3');
        });

        it('should undo to previous checkpoint', () => {
            expect(manager.canUndo(diagramId)).toBe(true);

            const undone = manager.undo(diagramId);

            expect(undone).toBeDefined();
            expect(undone?.xml).toBe('<xml>v2</xml>');
            expect(undone?.description).toBe('Version 2');
        });

        it('should redo to next checkpoint', () => {
            manager.undo(diagramId);
            expect(manager.canRedo(diagramId)).toBe(true);

            const redone = manager.redo(diagramId);

            expect(redone).toBeDefined();
            expect(redone?.xml).toBe('<xml>v3</xml>');
        });

        it('should return null when cannot undo', () => {
            // At position 2 (last), undo twice to position 0
            manager.undo(diagramId);
            manager.undo(diagramId);

            // Now at position 0, cannot undo more
            expect(manager.canUndo(diagramId)).toBe(false);
            expect(manager.undo(diagramId)).toBeNull();
        });

        it('should return null when cannot redo', () => {
            expect(manager.canRedo(diagramId)).toBe(false);
            expect(manager.redo(diagramId)).toBeNull();
        });
    });

    describe('goTo', () => {
        it('should jump to specific checkpoint', () => {
            const cp1 = manager.save(diagramId, '<xml>v1</xml>', '', 'user');
            manager.save(diagramId, '<xml>v2</xml>', '', 'user');
            manager.save(diagramId, '<xml>v3</xml>', '', 'user');

            const result = manager.goTo(diagramId, cp1.id);

            expect(result).toBeDefined();
            expect(result?.xml).toBe('<xml>v1</xml>');
        });

        it('should return null for invalid checkpoint id', () => {
            manager.save(diagramId, '<xml>v1</xml>', '', 'user');

            const result = manager.goTo(diagramId, { value: 'invalid-id' });

            expect(result).toBeNull();
        });
    });

    describe('list and getCurrent', () => {
        it('should list all checkpoints', () => {
            manager.save(diagramId, '<xml>v1</xml>', '', 'user');
            manager.save(diagramId, '<xml>v2</xml>', '', 'agent');

            const list = manager.list(diagramId);

            expect(list.length).toBe(2);
            expect(list[0].xml).toBe('<xml>v1</xml>');
            expect(list[1].xml).toBe('<xml>v2</xml>');
        });

        it('should get current checkpoint', () => {
            manager.save(diagramId, '<xml>v1</xml>', '', 'user');
            manager.save(diagramId, '<xml>v2</xml>', '', 'agent');

            const current = manager.getCurrent(diagramId);

            expect(current).toBeDefined();
            expect(current?.xml).toBe('<xml>v2</xml>');
        });
    });

    describe('clear', () => {
        it('should clear checkpoints for a diagram', () => {
            manager.save(diagramId, '<xml>v1</xml>', '', 'user');
            manager.save('other-diagram', '<xml>other</xml>', '', 'user');

            manager.clear(diagramId);

            expect(manager.count(diagramId)).toBe(0);
            expect(manager.count('other-diagram')).toBe(1);
        });

        it('should clear all checkpoints', () => {
            manager.save(diagramId, '<xml>v1</xml>', '', 'user');
            manager.save('other-diagram', '<xml>other</xml>', '', 'user');

            manager.clearAll();

            expect(manager.count(diagramId)).toBe(0);
            expect(manager.count('other-diagram')).toBe(0);
        });
    });
});
