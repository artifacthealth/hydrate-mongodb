interface MappingError {

    message: string;
    value: any;
    path: string;
}

module MappingError {

    export function createErrorMessage(errors: MappingError[]): string {

        var message: string[] = [];

        for(var i = 0, l = errors.length; i < l; i++) {
            var error = errors[i];
            message.push(error.path, ": ", error.message, "\n");
        }

        return message.join("");
    }
}

export = MappingError;
