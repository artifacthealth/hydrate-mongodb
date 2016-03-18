/**
 * Represents an error during reading or writing from the database.
 * @hidden
 */
export interface MappingError {

    message: string;
    value?: any;
    path: string;
}

/**
 * Creates an error message to display to the user.
 * @hidden
 */
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
