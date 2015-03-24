import InternalMapping = require("./internalMapping");

class ResolveContext {

    resolvedPath: string;
    resolvedMapping: InternalMapping;
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

    get currentProperty(): string {
        return this._path[this._depth];
    }

    get isEop(): boolean {
        return this.path === undefined;
    }

    get isFirst(): boolean {
        return this._depth === 0;
    }

    setError(message: string): void {

        if(this._path.length == 1) {
            this.error = new Error("Invalid path '" + this.path + "': " + message);
        }
        else {
            this.error = new Error("Invalid path '" + this.path + "' at property '" + this.currentProperty + "': " + message);
        }
        this._finished();
    }

    resolveProperty(mapping: InternalMapping, resolvedProperty: string): boolean {

        this._resolvePath[this._depth] = resolvedProperty;

        this._depth++;
        if(this._depth === this._path.length) {

            this.resolvedMapping = mapping;
            this.resolvedPath = this._resolvePath.join(".");
            this._finished();
            return true;
        }
        return false;
    }

    private _finished(): void {
        // clear out some variables we are no longer using since we will be caching this class
        this._depth = undefined;
        this._path = undefined;
        this._resolvePath = undefined;
    }
}

export = ResolveContext;