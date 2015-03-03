/// <reference path="./core/observe.d.ts" />
import Callback = require("./core/callback");

class Observer {

    private _watching: any[] = [];
    private _onChange: () => void;
    private _callback: Callback;

    /**
     * Creates an Observer object.
     * @param callback Called the first time any of the watched objects change.
     */
    constructor(callback: Callback) {
        // create an event function bound to the 'this' context.
        this._onChange = this._createOnChangeEvent();
        this._callback = callback;
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

    private _createOnChangeEvent(): () => void {

        return () => {
            this._callback();
            this.destroy();
        }
    }
}

export = Observer;