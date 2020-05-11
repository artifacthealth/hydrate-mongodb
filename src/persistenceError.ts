/**
 * Base class for all persistence related errors.
 */
import {ErrorBase} from "./core/errorBase";

export class PersistenceError extends ErrorBase {

    /**
     * The name of the error.
     */
    name = "PersistenceError";
}

/**
 * Error returned when an entity with the specified ID cannot be found.
 */
export class EntityNotFoundError extends PersistenceError {

    /**
     * The name of the error.
     */
    name = "EntityNotFoundError";
}
