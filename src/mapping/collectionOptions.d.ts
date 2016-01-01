export interface CollectionOptions {

    /**
     * The write concern.
     */
    w?: string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Create a capped collection.
     */
    capped?: boolean;

    /**
     * The size of the capped collection in bytes.
     */
    size?: number;

    /**
     * The maximum number of document in the capped collection.
     */
    max?: number;

    /**
     * The preferred read preference
     */
    readPreference?: string;

    /**
     * Strict mode
     */
    strict?: boolean;
}
