interface Object {

    /**
     * The Object.observe() method is used for asynchronously observing the changes to an object. It provides a stream
     * of changes in the order in which they occur.
     * @param obj The object to be observed.
     * @param callback The function called each time changes are made.
     */
    observe(obj: any, callback: (changes: ObjectChangeInfo[]) => void): void;
    unobserve(obj: any, callback: (changes: ObjectChangeInfo[]) => void): void;
}

interface ObjectChangeInfo {

    /**
     * The name of the property which was changed.
     */
    name: string;

    /**
     *  The changed object after the change was made.
     */
    object: Object;

    /**
     * A string indicating the type of change taking place. One of "add", "update", or "delete".
     */
    type: string;

    /**
     * Only for "update" and "delete" types. The value before the change.
     */
    oldValue?: any;
}

interface Array<T> {

    /**
     * The Array.observe() method is used for asynchronously observing changes to Arrays, similar to Object.observe()
     * for objects. It provides a stream of changes in order of occurrence.
     * @param arr The array to be observed.
     * @param callback The function called each time changes are made.
     */
    observe(arr: any[], callback: (changes: ArrayChangeInfo<T>[]) => void): void;
    unobserve(arr: any[], callback: (changes: ArrayChangeInfo<T>[]) => void): void;
}

/**
 * Represents a change to an array
 */
interface ArrayChangeInfo<T> {

    /**
     * The name of the property which was changed.
     */
    name?: string;

    /**
     * The changed array after the change was made.
     */
    object: T[];

    /**
     * A string indicating the type of change taking place. One of "add", "update", "delete", or "splice".
     */
    type: string;

    /**
     * Only for "update" and "delete" types. The value before the change.
     */
    oldValue?: any;

    /**
     * Only for the "splice" type. The index at which the change occurred.
     */
    index?: number;

    /**
     * Only for the "splice" type. An array of the removed elements.
     */
    removed?: T[];

    /**
     * Only for the "splice" type. The number of elements added.
     */
    addedCount?: number;
}