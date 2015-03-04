/// <reference path="./core/observe.d.ts" />

import Reference = require("../reference");

class Observer {

    private _watching: any[] = [];
    private _onChange: () => void;

    /**
     * Creates an Observer object.
     * @param callback Called the first time any of the watched objects change.
     */
    constructor(callback: () => void) {
        // create an event function bound to the 'this' context.
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

    private _createOnChangeEvent(callback: () => void): () => void {

        return (changes: ObjectChangeInfo[]) => {

            var changed = false;

            // Check to see if there were any changes besides resolving a reference. We don't consider resolving a
            // referene as a change.
            for(var i = 0; i < changes.length; i++) {
                var change = changes[i];
                if(change.type != 'update' || !(<Reference>change.oldValue).fetched || !Reference.isReference(change.oldValue)) {
                    changed = true;
                    break;
                }
            }

            if(!changed) return;

            callback();
            this.destroy();
        }
    }
}

export = Observer;