interface Loader<T> {

    load(callback: (err: Error, value: T) => void): void;
}

export = Loader;