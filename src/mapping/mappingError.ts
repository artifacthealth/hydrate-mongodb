interface MappingError {

    message: string;
    value: any;
    path: string;
}

module MappingError {

    export function createErrorMessage(errors: MappingError[]): string {

        var message: string[] = [];

        for(var i = 0, l = errors.length; i < l; i++) {
            if(i > 0) {
                message.push("\n");
            }
            var error = errors[i];
            if(error.path) {
                message.push(error.path, ": ");
            }
            message.push(error.message);
        }

        return message.join("");
    }
}

export = MappingError;
