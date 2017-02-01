import {MappingError, createErrorMessage} from "./mappingError";
import {InternalSession} from "../session";
import {Observer} from "../observer";

/**
 * @hidden
 */
export class ReadContext {

    /**
     * The current path.
     */
    path: string = "";

    /**
     * A list of errors that occurred during deserialization.
     */
    errors: MappingError[];

    /**
     * True if there are errors in the context; otherwise, false.
     */
    hasErrors: boolean;

    /**
     * Observer used to watch deserialized objects, if specified.
     */
    observer: Observer;

    /**
     * Fetches found while walking the object.
     */
    fetches: string[];

    /**
     * The parent object.
     */
    parent: Object;

    constructor(public session: InternalSession) {

    }

    /**
     * Adds an error to the context.
     * @param message The error message.
     * @param path Optional. The current path if different than what's in the context.
     */
    addError(message: string, path?: string): void {

        if (!this.errors) {
            this.errors = [];
            this.hasErrors = true;
        }

        this.errors.push({
            message: message,
            path: path || this.path
        });
    }

    addFetch(path: string): void {

        if (!this.fetches) {
            this.fetches = [];
        }
        this.fetches.push(path);
    }

    /**
     * Gets a string summarizing all errors in the context.
     */
    getErrorMessage(): string {
        return createErrorMessage(this.errors);
    }
}
