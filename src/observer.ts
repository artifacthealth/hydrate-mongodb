/// <reference path="./core/observe.d.ts" />

import Reference = require("./reference");

class Observer {

    private _watching: any[] = [];
    private _onChange: (changes: ObjectChangeInfo[]) => void;

    /**
     * Creates an Observer object.
     * @param callback Called the first time any of the watched objects change.
     */
    constructor(callback: () => void) {

        this._onChange = this._createOnChangeEvent(callback);
    }

    watch(obj: any): void {
        if(!this._watching) throw new Error("Observer is destroyed.");
        Object.observe(obj, this._onChange);
        this._watching.push(obj);
    }

    destroy(): void {
        if(!this._watching) return;

        for(var i = 0; i < this._watching.length; i++) {
            Object.unobserve(this._watching[i], this._onChange);
        }

        this._watching = undefined;
    }

    private _createOnChangeEvent(callback: () => void): (changes: ObjectChangeInfo[]) => void {

        return (changes: ObjectChangeInfo[]) => {

            // Only consider changed if we have a change that was not a Reference being fetched.
            for(var i = 0; i < changes.length; i++) {
                var change = changes[i];

                if(change.type != 'update' || !Reference.areEqual(change.oldValue, (<any>change.object)[change.name])) {
                    // value has changed
                    callback();
                    this.destroy();
                    return;
                }
            }
        }
    }
}

export = Observer;
