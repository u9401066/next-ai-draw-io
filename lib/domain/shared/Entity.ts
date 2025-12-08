/**
 * Entity 基類
 */

export abstract class Entity<T> {
    protected readonly props: T;

    protected constructor(props: T) {
        this.props = props;
    }

    public abstract get id(): unknown;

    public equals(entity?: Entity<T>): boolean {
        if (entity === null || entity === undefined) {
            return false;
        }
        if (this === entity) {
            return true;
        }
        return JSON.stringify(this.id) === JSON.stringify(entity.id);
    }
}
