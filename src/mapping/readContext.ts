import MappingError = require("./mappingError");
import InternalSession = require("../internalSession");
import Observer = require("../observer");

class ReadContext {

    path: string = "";
    errors: MappingError[] = [];
    hasErrors: boolean;

    observer: Observer;

    constructor(public session: InternalSession) {

    }

    addError(message: string, path?: string): void {

        this.errors.push({
            message: message,
            path: path || this.path
        });

        this.hasErrors = true;
    }

    getErrorMessage(): string {
        return MappingError.createErrorMessage(this.errors);
    }
}

export = ReadContext;