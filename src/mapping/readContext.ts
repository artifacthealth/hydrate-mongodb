import MappingError = require("./mappingError");
import InternalSession = require("../internalSession");
import Observer = require("../observer");

class ReadContext {

    /**
     * The current path.
     */
    path: string = "";

    /**
     * A list of errors that occurred during deserialization.
     */
    errors: MappingError[] = [];

    /**
     * True if there are errors in the context; otherwise, false.
     */
    hasErrors: boolean;

    /**
     * Observer used to watch deserialized objects, if specified.
     */
    observer: Observer;

    constructor(public session: InternalSession) {

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
        return MappingError.createErrorMessage(this.errors);
    }
}

export = ReadContext;