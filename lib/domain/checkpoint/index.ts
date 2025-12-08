/**
 * Domain Layer - Checkpoint Aggregate
 * 
 * Checkpoint 用於追蹤圖表版本，支援 undo/redo
 */

export { Checkpoint } from './Checkpoint';
export { CheckpointManager } from './CheckpointManager';
export { CheckpointSource, CheckpointId, CheckpointProps } from './types';
export type { CheckpointSource as CheckpointSourceType } from './types';
