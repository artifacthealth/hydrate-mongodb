export interface ResultCallback<T> {

    (err: Error, result?: T): void;
}
