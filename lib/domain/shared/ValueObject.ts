/**
 * ValueObject 基類
 */

export abstract class ValueObject<T> {
    protected readonly props: T;

    protected constructor(props: T) {
        this.props = props;
    }

    public equals(vo?: ValueObject<T>): boolean {
        if (vo === null || vo === undefined) {
            return false;
        }
        return JSON.stringify(this.props) === JSON.stringify(vo.props);
    }
}
