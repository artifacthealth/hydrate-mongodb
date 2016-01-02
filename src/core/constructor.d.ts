export interface Constructor<T> {

    name?: string;
    new(...args: any[]): T;
}

export interface ParameterlessConstructor<T> {

    name?: string;
    new(): T;
}
