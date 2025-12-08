/**
 * DomainEvent 基類
 */

export abstract class DomainEvent {
    public readonly occurredOn: Date;
    public readonly eventType: string;

    protected constructor(eventType: string) {
        this.occurredOn = new Date();
        this.eventType = eventType;
    }
}

// === Diagram Events ===

export class DiagramCreatedEvent extends DomainEvent {
    constructor(
        public readonly diagramId: string,
        public readonly name: string
    ) {
        super('DiagramCreated');
    }
}

export class DiagramUpdatedEvent extends DomainEvent {
    constructor(
        public readonly diagramId: string,
        public readonly source: 'user' | 'agent'
    ) {
        super('DiagramUpdated');
    }
}

export class CheckpointCreatedEvent extends DomainEvent {
    constructor(
        public readonly checkpointId: string,
        public readonly diagramId: string,
        public readonly source: 'user' | 'agent'
    ) {
        super('CheckpointCreated');
    }
}

export class CheckpointRestoredEvent extends DomainEvent {
    constructor(
        public readonly checkpointId: string,
        public readonly diagramId: string
    ) {
        super('CheckpointRestored');
    }
}
