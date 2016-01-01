/**
 * Gets or sets hidden key associated with arbitrary object for use in indexing an array-based table.
 */
export class TableKey {

    private _name: string;
    private _nextValue: number = 0;
    private static _nextKeyId = 0;

    constructor() {
        this._name = "__key" + (TableKey._nextKeyId++).toString() + (new Date().getTime().toString()) + "__";
        // V8 cannot optimize property access if variable is used for property name, so we generate a function for access.
        // See Angular design doc here: http://tinyurl.com/kap2g2r
        this.getValue = <any>(new Function("o", "return o['" + this._name + "']"));
        this.hasValue = <any>(new Function("o", "return o['" + this._name + "'] !== undefined"));
    }

    hasValue: (obj: any) => boolean;

    getValue: (obj: any) => number;

    ensureValue(obj: any): number {
        var value = this.getValue(obj);
        if(value !== undefined) return value;
        return this.setValue(obj, this._nextValue++);
    }

    setValue(obj: any, value: number): number {

        if(!Object.isExtensible(obj)) {
            throw new Error("Cannot set key for object that is not extensible.");
        }

        Object.defineProperty(obj, this._name, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: value
        });

        return value;
    }
}
