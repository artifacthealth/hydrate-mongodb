interface Cursor {

    filter(filter: any): Cursor;
    project(value: any): Cursor;
    rewind() : Cursor;
    toArray(callback: (err: Error, results: any[]) => any) : void;
    each(callback: (err: Error, item: any) => boolean) : void;
    forEach(iterator: (value: any) => void, callback: (err: Error) => void): void;
    count(applySkipLimit: boolean, callback: (err: Error, count: number) => void) : void;
    sort(keyOrList: any, direction?: number): Cursor;
    sort(keyOrList: String, direction : string, callback : (err: Error, result: any) => void): Cursor;
    limit(limit: number, callback?: (err: Error, result: any) => void): Cursor;
    setReadPreference(preference: string, callback?: Function): Cursor;
    skip(skip: number, callback?: (err: Error, result: any) => void): Cursor;
    batchSize(batchSize: number, callback?: (err: Error, result: any) => void): Cursor;
    nextObject(callback: (err: Error, doc: any) => void) : void;
    explain(callback: (err: Error, result: any) => void) : void;
    close(callback: (err: Error, result: any) => void) : void;
    isClosed(): boolean;
    bufferedCount?(): number;
}

export = Cursor;