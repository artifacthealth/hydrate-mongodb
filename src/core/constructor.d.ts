export interface Constructor<T> {

    name?: string;
    new(...args: any[]): T;
}
