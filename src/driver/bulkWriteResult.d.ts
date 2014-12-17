interface BulkWriteResult {

    /**
     * Did bulk operation correctly execute
     */
    ok: boolean;

    /**
     * Number of inserted documents
     */
    nInserted: number;

    /**
     * Number of upserted documents
     */
    nUpserted: number;

    /**
     * Number of matched documents
     */
    nMatched: number;

    /**
     * Number of modified documents
     */
    nModified: number;

    /**
     * Number of removed documents
     */
    nRemoved: number;

    /**
     * Return an array of inserted ids
     *
     * @return {object[]}
     */
    getInsertedIds(): any[];

    /**
     * Return an array of upserted ids
     *
     * @return {object[]}
     */
    getUpsertedIds(): any[];

    /**
     * Return the upserted id at position x
     *
     * @param {number} index the number of the upserted id to return, returns undefined if no result for passed in index
     * @return {object}
     */
    getUpsertedIdAtn(index: number): any;


    /**
     * Return raw internal result
     *
     * @return {object}
     */
    getRawResponse(): any;

    /**
     * Returns true if the bulk operation contains a write error
     *
     * @return {boolean}
     */
    hasWriteErrors(): boolean;

    /**
     * Returns the number of write errors off the bulk operation
     *
     * @return {number}
     */
    getWriteErrorCount(): number;

    /**
     * Returns a specific write error object
     *
     * @return {WriteError}
     */
    getWriteErrorAt(index: number): any;

    /**
     * Retrieve all write errors
     */
    getWriteErrors(): any[];

    /**
     * Retrieve lastOp if available
     *
     * @return {object}
     */
    getLastOp(): any;

    /**
     * Retrieve the write concern error if any
     *
     * @return {WriteConcernError}
     */
    getWriteConcernError(): any;

    toJSON(): any;

    toString(): string;

    isOk(): boolean;
}

export = BulkWriteResult;