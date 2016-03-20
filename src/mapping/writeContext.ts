import {MappingError, createErrorMessage} from "./mappingError";
import {InternalSession} from "../session";

/**
 * @hidden
 */
export class WriteContext {

    /**
     * A list of errors that occurred during serialization.
     */
    errors: MappingError[] = [];

    /**
     * Listed of objects that have been visited order order to prevent infinite loops.
     */
    visited: any[] = [];

    /**
     * True if there are errors in the context; otherwise, false.
     */
    hasErrors: boolean;

    /**
     * Constructs a Write Context.
     * @param path The current path.
     */
    constructor(public path = "") {

    }

    /**
     * Adds an error to the context.
     * @param message The error message.
     * @param path Optional. The current path if different than what's in the context.
     */
    addError(message: string, path?: string): void {

        this.errors.push({
            message: message,
            path: path || this.path
        });

        this.hasErrors = true;
    }

    /**
     * Gets a string summarizing all errors in the context.
     */
    getErrorMessage(): string {
        return createErrorMessage(this.errors);
    }
}
