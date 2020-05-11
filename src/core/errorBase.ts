/**
 * A base class for custom errors.
 */
export abstract class ErrorBase implements Error {

    /**
     * The name of the error.
     */
    name = "Error";

    /**
     * A human readable message explaining the reason for the error.
     */
    message: string;

    /**
     * The stack trace.
     */
    stack: string;

    /**
     * The cause of this error.
     */
    private _cause: Error;

    constructor(message: string, cause?: Error) {

        Error.call(this, message);

        if (cause) {
            this._cause = cause;
        }

        this.message = message;

        if ((<any>Error).captureStackTrace) {
            (<any>Error).captureStackTrace(this, this.constructor);
        }
        else {
            this.stack = (<any>new Error(message)).stack;
        }
    }
}

// typeScript declares Error as an Interface instead of a class so use prototypical inheritance
ErrorBase.prototype = <any>Object.create(Error.prototype);
ErrorBase.prototype.constructor = ErrorBase;

// we need to define the cause method on the prototype since we are manually deriving from Error above
(<any>ErrorBase.prototype).cause = function() {
    return this._cause;
};
