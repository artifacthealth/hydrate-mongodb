import Mapping = require("./mapping");

class ResolveContext {

    get currentProperty(): string {
        return this._path[this._depth];
    }

    get isEop(): boolean {
        return this._depth >= this._path.length;
    }

    get isFirst(): boolean {
        return this._depth == 0;
    }

    get resolvedPath(): string {
        return this._resolvePath.join(".");
    }

    resolvedMapping: Mapping;
    error: Error;

    private _path: string[];
    private _resolvePath: string[]
    private _depth: number;

    constructor(public path: string) {
        if(typeof path !== "string") {
            throw new Error("Expected argument 'path' to be a string.");
        }
        this._path = path.split(".");
        this._resolvePath = new Array(this._path.length);
        this._depth = 0;
    }

    setError(message: string): void {
        if(this._path.length == 1) {
            this.error = new Error("Invalid path '" + this.path + "': " + message);
        }
        else {
            this.error = new Error("Invalid path '" + this.path + "' at property '" + this.currentProperty + "': " + message);
        }
    }

    resolveProperty(mapping: Mapping, resolvedProperty: string): boolean {
        this._resolvePath[this._depth] = resolvedProperty;
        this._depth++;
        if(this._depth === this._path.length) {
            this.resolvedMapping = mapping;
            return true;
        }
        return false;
    }
}

export = ResolveContext;