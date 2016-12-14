/**
 * Base class for all persistence related errors.
 */
export class PersistenceError implements Error {

    /**
     * The name of the error.
     */
    name = "PersistenceError";

    /**
     * A human readable message explaining the reason for the error.
     */
    message: string;

    /**
     * The stack trace.
     */
    stack: string;

    constructor(message?: string) {
        Error.call(this, message);

        this.message = message;
        this.stack = (<any>new Error(message)).stack;
    }
}

// typeScript declares Error as an Interface instead of a class so use prototypical inheritance
PersistenceError.prototype = Object.create(Error.prototype);
PersistenceError.prototype.constructor = PersistenceError;

export class EntityNotFoundError extends PersistenceError {

}
