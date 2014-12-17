import BulkWriteResult = require("./bulkWriteResult");

interface Bulk {

    /**
     * Add a single update document to the bulk operation
     * @param {object} doc update operations
     */
    update(updateDocument: any): Bulk;

    /**
     * Add a single update one document to the bulk operation
     * @param {object} doc update operations
     */
    updateOne(updateDocument: any): Bulk;

    /**
     * Add a replace one operation to the bulk operation
     * @param {object} doc the new document to replace the existing one with
     */
    replaceOne(updateDocument: any): Bulk;

    /**
     * Upsert modifier for update bulk operation
     */
    upsert(): Bulk;

    /**
     * Add a remove one operation to the bulk operation
     */
    removeOne(): Bulk;

    /**
     * Add a remove operation to the bulk operation
     */
    remove(): Bulk;

    /**
     * Add a single insert document to the bulk operation
     * @param {object} doc the document to insert
     */
    insert(document: any): Bulk;

    /**
     * Initiate a find operation for an update/updateOne/remove/removeOne/replaceOne
     * @param {object} selector The selector for the bulk operation.
     */
    find(selector: any): Bulk;

    /**
     * Execute the ordered bulk operation
     *
     * @method
     * @param {object} [options=null] Optional settings.
     * @param {(number|string)} [options.w=null] The write concern.
     * @param {number} [options.wtimeout=null] The write concern timeout.
     * @param {boolean} [options.j=false] Specify a journal write concern.
     * @param {boolean} [options.fsync=false] Specify a file sync write concern.
     * @param {UnorderedBulkOperation~resultCallback} callback The result callback
     */
    execute(callback: (err: Error, result: BulkWriteResult) => void): void;
    execute(options: any, callback: (err: Error, result: BulkWriteResult) => void): void;
}

export = Bulk;