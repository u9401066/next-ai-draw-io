/**
 * Domain Layer - Checkpoint Aggregate
 * 
 * Checkpoint 用於追蹤圖表版本，支援 undo/redo
 */

export { Checkpoint } from './Checkpoint';
export { CheckpointManager } from './CheckpointManager';
export type { CheckpointSource, CheckpointId, CheckpointProps } from './types';
