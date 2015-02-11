/// <reference path="../typings/async.d.ts" />

import async = require("async");
import EntityMapping = require("./mapping/entityMapping");
import Collection = require("./driver/collection");
import ResultCallback = require("./core/resultCallback");
import InternalSession = require("./internalSession");
import ChangeTracking = require("./mapping/changeTracking");
import IdentityGenerator = require("./id/identityGenerator");
import Batch = require("./batch");
import Callback = require("./core/callback");
import MappingError = require("./mapping/mappingError");
import Reference = require("./reference");
import PropertyFlags = require("./mapping/propertyFlags");
import Result = require("./core/result");
import Persister = require("./persister");
import Command = require("./core/command");
import Bulk = require("./driver/bulk");
import BulkWriteResult = require("./driver/bulkWriteResult");
import Changes = require("./mapping/changes");
import Map = require("./core/map");
import QueryDefinition = require("./query/queryDefinition");
import QueryKind = require("./query/queryKind");
import IteratorCallback = require("./core/iteratorCallback");
import Cursor = require("./driver/cursor");
import QueryDocument = require("./query/queryDocument");
import ResolveContext = require("./mapping/resolveContext");
import MappingFlags = require("./mapping/mappingFlags");
import ArrayMapping = require("./mapping/arrayMapping");
import Mapping = require("./mapping/mapping");
import RegExpUtil = require("./core/regExpUtil");
import CriteriaBuilder = require("./query/criteriaBuilder");

interface FindOneQuery {

    criteria: any;
    fetchPaths?: string[];
}

interface FindAllQuery extends FindOneQuery {

    sortBy?: [string, number][];
    limitCount?: number;
    skipCount?: number;
    batchSizeValue?: number;
}

interface FindEachQuery extends FindAllQuery {

    iterator: IteratorCallback<any>;
}

interface WriteOptions {
    w?: number;
    wtimeout?: number;
    j?: number;
}

interface FindAndModifyOptions extends WriteOptions {
    remove?: boolean;
    upsert?: boolean;
    new?: boolean;
}

interface RemoveOptions extends WriteOptions {
    single?: boolean;
}

interface UpdateOptions extends WriteOptions {
    multi?: boolean;
}

interface CountOptions {
    limit: number;
    skip: number;
}

class PersisterImpl implements Persister {

    changeTracking: ChangeTracking;
    identity: IdentityGenerator;

    private _findQueue: FindQueue;
    private _mapping: EntityMapping;
    private _collection: Collection;
    private _session: InternalSession;
    private _criteriaBuilder: CriteriaBuilder;

    constructor(session: InternalSession, mapping: EntityMapping, collection: Collection) {

        this._session = session;
        this._mapping = mapping;
        this._collection = collection;

        this.changeTracking = (<EntityMapping>mapping.inheritanceRoot).changeTracking;
        this.identity = (<EntityMapping>mapping.inheritanceRoot).identity;

        this._criteriaBuilder = new CriteriaBuilder(mapping);
    }

    dirtyCheck(batch: Batch, entity: Object, originalDocument: Object): Result<Object> {

        var errors: MappingError[] = [];
        var document = this._mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + MappingError.createErrorMessage(errors)));
        }

        if(!this._mapping.areDocumentsEqual(originalDocument, document)) {
            this._getCommand(batch).addReplace(document);
        }

        return new Result(null, document);
    }

    addInsert(batch: Batch, entity: Object): Result<Object> {

        var errors: MappingError[] = [];
        var document = this._mapping.write(entity, "", errors, []);
        if(errors.length > 0) {
            return new Result(new Error("Error serializing document:\n" + MappingError.createErrorMessage(errors)));
        }

        this._getCommand(batch).addInsert(document);
        return new Result(null, document);
    }

    addRemove(batch: Batch, entity: any): void {

        this._getCommand(batch).addRemove(entity["_id"]);
    }

    /**
     * Refreshes the managed entity with the state from the database, discarding any unwritten changes. The new
     * document is returned in the callback. There is no need to return the entity since the caller already has
     * the entity.
     * @param entity The entity to refresh.
     * @param callback The callback to call when method completes. The results parameter contains the new database
     * document.
     */
    refresh(entity: any, callback: ResultCallback<Object>): void {

        this.findOneById(entity["_id"], (err, document) => {
            if (err) return callback(err);
            this._refreshFromDocument(entity, document, callback);
        });
    }

    private _refreshFromDocument(entity: Object, document: Object, callback: ResultCallback<Object>): void {

        var errors: MappingError[] = [];
        this._mapping.refresh(this._session, entity, document, errors);
        if(errors.length > 0) {
            return callback(new Error("Error deserializing document:\n" + MappingError.createErrorMessage(errors)));
        }

        callback(null, document);
    }

    fetch(entity: any, path: string, callback: Callback): void {

        if(typeof path !== "string") {
            return callback(new Error("Path must be a string."));
        }

        this._mapping.fetch(this._session, undefined, entity, path.split("."), 0, callback);
    }

    findInverseOf(entity: Object, path: string, callback: ResultCallback<any[]>): void {

        var property = this._mapping.getProperty(path);
        if(property === undefined) {
            return callback(new Error("Missing property '" + path + "'."));
        }

        // TODO: skip prepareCriteria in findAll and create query document directly for performance?
        var query: QueryDocument = {};
        property.setFieldValue(query, entity);

        this.findAll({ criteria: query }, callback);
    }

    findOneInverseOf(entity: Object, path: string, callback: ResultCallback<any>): void {

        var property = this._mapping.getProperty(path);
        if(property === undefined) {
            return callback(new Error("Missing property '" + path + "'."));
        }

        // TODO: skip prepareCriteria in findOne and create query document directly for performance?
        var query: QueryDocument = {};
        property.setFieldValue(query, entity);

        this.findOne(query, callback);
    }

    findOneById(id: any, callback: ResultCallback<any>): void {

        // Check to see if object is already loaded. Note explicit check for undefined here. Null means
        // that the object is loaded but scheduled for delete so null should be returned.
        var entity = this._session.getObject(id);
        if (entity !== undefined) {
            return process.nextTick(() => callback(null, entity));
        }

        // TODO: FindQueue should be shared by all persisters with the same collection?
        (this._findQueue || (this._findQueue = new FindQueue(this))).add(id, callback);
    }

    // TODO: findOne uses find under the hood in the mongodb driver. Consider optimizing to not use findOne function on mongodb driver.
    findOne(criteria: QueryDocument, callback: ResultCallback<any>): void {

        this._collection.findOne(this._prepareCriteria(criteria), (err, document) => {
            if (err) return callback(err);
            var result = this._loadOne(document);
            callback(result.error, result.value);
        });
    }

    findAll(query: FindAllQuery, callback: ResultCallback<any[]>): void {

        this._prepareFind(query).toArray((err, documents) => {
            if(err) return callback(err);

            var result = this._loadAll(documents);
            callback(result.error, result.value);
        });
    }

    executeQuery(query: QueryDefinition, callback: ResultCallback<Object>): void {

        switch(query.kind) {
            case QueryKind.FindOne:
                this.findOne(query.criteria, this._fetchOne(query, callback));
                break;
            case QueryKind.FindOneById:
                this.findOneById(query.criteria, this._fetchOne(query, callback));
                break;
            case QueryKind.FindAll:
                this.findAll(query, this._fetchAll(query, callback));
                break;
            case QueryKind.FindEach:
                this._findEach(query, callback);
                break;
            case QueryKind.FindEachSeries:
                this._findEachSeries(query, callback);
                break;
            case QueryKind.FindOneAndRemove:
            case QueryKind.FindOneAndUpdate:
                this._findOneAndModify(query, this._fetchOne(query, callback));
                break;
            case QueryKind.RemoveOne:
            case QueryKind.RemoveAll:
                this._remove(query, callback);
                break;
            case QueryKind.UpdateOne:
            case QueryKind.UpdateAll:
                this._update(query, callback);
                break;
            case QueryKind.Distinct:
                this._distinct(query, callback);
                break;
            case QueryKind.Count:
                this._count(query, callback);
                break;
        }
    }

    // TODO: optimize this function by using underlying cursor from core directly
    private _findEach(query: FindEachQuery, callback: Callback): void {

        var cursor = this._prepareFind(query);
        var iterator = this._fetchIterator(query);

        var completed = 0,
            started = 0,
            finished = false,
            self = this;

        // We process all buffered items in parallel. When the buffer is empty, we replenish the buffer. Repeat.
        replenish();

        function replenish() {
            // try to retrieve a document from the cursor
            cursor.nextObject((err: Error, item: any) => {
                if(err) return error(err);

                // if the document is null then the cursor is finished
                if (item == null) {
                    // if all items have been processed then call callback; otherwise, set flag and we'll check
                    // later in 'done'.
                    if (completed >= started) {
                        callback();
                    }
                    finished = true;
                    return;
                }

                // otherwise, process the item returned then process the rest of the items in the buffer
                process(err, item);

                while(cursor.bufferedCount() > 0) {
                    cursor.nextObject(process);
                }
            });
        }

        function process(err: Error, item: any): void {
            if (err) return error(err);

            started++;

            // convert the document to an entity
            var result = self._loadOne(item);
            if(result.error) {
                return error(result.error);
            }

            // pass the entity to the iterator, and wait for done to be called
            iterator(result.value, Callback.onlyOnce(done));
        }

        function done(err: Error) {
            if (err) return error(err);

            completed++;
            // if all buffered items have been processed, check if the cursor is finished. if it's finished then
            // we are done; otherwise, replenish the buffer.
            if(cursor.bufferedCount() == 0 && completed >= started) {

                if(finished) return callback();
                replenish();
            }
        }

        function error(err: Error) {
            callback(err);
            callback = function () {}; // if called for error, make sure it can't be called again
        }
    }

    // TODO: optimize this function by using underlying cursor from core directly
    private _findEachSeries(query: FindEachQuery, callback: Callback): void {

        var cursor = this._prepareFind(query),
            iterator = this._fetchIterator(query),
            self = this;

        (function next(err?: Error) {
            if (err) return error(err);

            cursor.nextObject((err: Error, item: any) => {
                if (err) return error(err);

                if (item == null) {
                    return callback();
                }

                var result = self._loadOne(item);
                if(result.error) {
                    return error(result.error);
                }

                iterator(result.value, next);
            });
        })();

        function error(err: Error) {
            callback(err);
            callback = function () {}; // if called for error, make sure it can't be called again
        }
    }

    private _prepareFind(query: FindAllQuery): Cursor {

        var cursor = this._collection.find(this._prepareCriteria(query.criteria));

        if(query.sortBy !== undefined) {
            cursor.sort(query.sortBy);
        }

        if(query.skipCount !== undefined) {
            cursor.skip(query.skipCount);
        }

        if(query.limitCount !== undefined) {
            cursor.limit(query.limitCount);
        }

        if(query.batchSizeValue !== undefined) {
            cursor.batchSize(query.batchSizeValue);
        }

        return cursor;
    }

    private _prepareCriteria(criteria: QueryDocument): QueryDocument {

        return this._criteriaBuilder.build(criteria);
        //var query = this._prepareQueryDocument(criteria);
        //this._mapping.setDocumentDiscriminator(query);
        //return query;
    }

    private _prepareQueryDocument(query: QueryDocument, mapping?: Mapping, withinField?: boolean): QueryDocument {

        if(!query) return query;

        if(!mapping) {
            mapping = this._mapping;
        }

        var result: QueryDocument = {};
        for(var key in query) {
            if(query.hasOwnProperty(key)) {
                var value = query[key];

                // check if this is an operator
                if(key[0] == "$") {
                    // check for top level operators that require recursive processing
                    if (key == "$and" || key == "$or" || key == "$nor") {
                        if (!Array.isArray(value)) {
                            throw new Error("Value of '" + key + "' operator should be an array.");
                        }

                        var arr = new Array(value.length);
                        for (var i = 0, l = value.length; i < l; i++) {
                            arr[i] = this._prepareQueryDocument(value[i], mapping);
                        }
                        result[key] = arr;
                    }
                    else if(key == "$where" || key == "$text") {
                        // the $text operator doesn't contain any fields and we do not make any attempt to prepare
                        // field values in a $where operator, so we can just copy the value directly
                        if(withinField) {
                            throw new Error("Operator '" + key + "' is not allowed in $elemMatch.");
                        }
                        result[key] = value;
                    }
                    else if(withinField) {
                        // if we have an operator and it's not one of the top-level operators, if we are within a field
                        // then process the query as a query expression. Currently, the only field level operator that
                        // allows this is $elemMatch.
                        result = this._prepareQueryExpression(query, mapping);
                        break;
                    }
                    else {
                        // the only valid top-level operators are $and, $or, $nor, $where, and $text
                        throw new Error("Unknown top-level operator '" + key + "'.");
                    }
                }
                else {
                    // If it's not an operator then it should be a field.
                    if(key == "_id") {
                        // special case for identity field
                        if(typeof value === "string") {
                            value = this.identity.fromString(value);
                        }
                        result[key] = value;
                    }
                    else {
                        // resolve field path
                        var context = new ResolveContext(key);
                        mapping.resolve(context);
                        if(context.error) {
                            // TODO: don't throw errors
                            throw context.error;
                        }
                        var resolvedMapping = context.resolvedMapping,
                            preparedValue: any;

                        if(this._isQueryExpression(value)) {
                            // Need to prepare the query expression

                            if(resolvedMapping.flags & MappingFlags.Array) {
                                // if this is an array mapping then any query operators apply to the element mapping
                                resolvedMapping = (<ArrayMapping>resolvedMapping).elementMapping;
                            }
                            preparedValue = this._prepareQueryExpression(value, resolvedMapping);
                        }
                        else {
                            // Doesn't have any query operators so just write the value

                            if(resolvedMapping.flags & MappingFlags.Array) {
                                // if the mapping is an array we need to figure out if we are going to use the array
                                // mapping or the element mapping
                                var arrayMapping = (<ArrayMapping>resolvedMapping);
                                if(!Array.isArray(value) || (arrayMapping.nestedDepth > 1 && arrayMapping.nestedDepth > this._findArrayDepth(value))) {
                                    // use element mapping if the value is not an array OR we have nested arrays and
                                    // the depth of the nesting in the mapping is deeper than the depth in the value
                                    resolvedMapping = arrayMapping.elementMapping;
                                }
                            }

                            preparedValue = this._prepareQueryValue(context.resolvedPath, value, resolvedMapping);
                        }

                        result[context.resolvedPath] = preparedValue;
                    }
                }
            }
        }

        return result;
    }

    private _prepareQueryExpression(query: QueryDocument, mapping: Mapping): QueryDocument {

        var result: QueryDocument = {};

        for(var key in query) {
            if (query.hasOwnProperty(key)) {
                if(key[0] != "$") {
                    throw new Error("Unexpected value '" + key + "' in query expression.");
                }
                var value = query[key],
                    preparedValue: any;

                switch(key) {
                    case '$gt':
                    case '$gte':
                    case '$lt':
                    case '$lte':
                    case '$ne':
                        // handle value
                        preparedValue = this._prepareQueryValue(key, value, mapping);
                        break;
                    case '$in':
                    case '$nin':
                    case '$all':
                        // handle array of values
                        if(!Array.isArray(value)) {
                            throw new Error("Expected array.");
                        }
                        preparedValue = new Array(value.length);
                        for(var i = 0, l = value.length; i < l; i++) {
                            preparedValue[i] = this._prepareQueryValue(key , value[i], mapping);
                        }
                        break;
                    case '$not':
                        // recursive expression
                        preparedValue = this._prepareQueryExpression(value, mapping);
                        break;
                    case '$elemMatch':
                        // recursive query document
                        preparedValue = this._prepareQueryDocument(value, mapping, /*withinField*/ true);
                        break;
                    case '$exists':
                    case '$type':
                    case '$mod':
                    case '$regex':
                    case '$geoIntersects':
                    case '$geoWithin':
                    case '$nearSphere':
                    case '$near':
                    case '$size':
                    case '$comment':
                        // assign as-is
                        preparedValue = value;
                        break;
                    default:
                        throw new Error("Unknown query operator '" + key + "'.");
                }

                result[key] = preparedValue;
            }
        }

        return result;
    }

    private _prepareQueryValue(path: string, value: any, mapping: Mapping): any {

        // Regular expressions are allowed in place of strings
        if((mapping.flags & MappingFlags.String) && (value instanceof RegExp)) {
            return RegExpUtil.clone(value);
        }

        var errors: MappingError[] = [];
        var preparedValue = mapping.write(value, path, errors, []);
        if(errors.length > 0) {
            throw new Error("Bad value: " + MappingError.createErrorMessage(errors));
        }
        return preparedValue;
    }

    /**
     * Finds the maximum depth of nested arrays
     * @param value The value to check
     * @param depth The current depth. Default is 0.
     */
    private _findArrayDepth(value: any, depth = 0): number {

        if(value && Array.isArray(value)) {
            for (var i = 0, l = value.length; i < l; i++) {
                depth = Math.max(depth, this._findArrayDepth(value[i], depth + 1));
            }
        }

        return depth;
    }

    /**
     * Return true if the first property is a query operator; otherwise, return false. Query expressions won't mix
     * operator and non-operator fields like query documents can.
     * @param value The value to check.
     */
    private _isQueryExpression(value: any): boolean {

        if(typeof value === "object") {
            for (var key in value) {
                if(value.hasOwnProperty(key)) {
                    return key[0] == "$";
                }
            }
        }

        return false;
    }

    private _findOneAndModify(query: QueryDefinition, callback: ResultCallback<Object>): void {

        var options: FindAndModifyOptions = {
            remove: query.kind == QueryKind.FindOneAndRemove,
            new: query.wantsUpdated
        }

        if(query.updateDocument) {
            // TODO: prepare update document. This should include incrementing the version.
        }

        this._collection.findAndModify(this._prepareCriteria(query.criteria), query.sortBy, query.updateDocument, options, (err, response) => {
            if (err) return callback(err);

            var document = response.value;
            if (!document) return callback(null); // no match for criteria

            // check if the entity is already in the session
            var entity = this._session.getObject(document["_id"]);
            if(entity !== undefined) {
                // We check to see if the entity is already in the session so we know if we need to refresh the
                // entity or not.
                var alreadyLoaded = true;
            }
            else {
                // If the entity is not in the session, then it will be loaded and added to the session as managed.
                // The state may be changed to Removed below.
                var result = this._loadOne(document);
                if (result.error) {
                    return callback(result.error);
                }
                entity = result.value;
            }

            // If the entity is not pending deletion, then see if we need to refresh the entity from the updated
            // document or notify the session that the entity is now removed.

            // Note that if the entity is pending deletion in the session then the callback will be called with null
            // for the result. This is a little funny but seems most consistent with other methods such as findOne.
            if(entity) {
                if (options.remove) {
                    // If entity was removed then notify the session that the entity has been removed from the
                    // database. Note that the remove operation is not cascaded.
                    this._session.notifyRemoved(result.value);
                }
                else if (options.new && alreadyLoaded) {
                    // If findAndModify returned the updated document and the entity was already part of the session
                    // before findAndModify was executed, then refresh the entity from the returned document. Note
                    // that the refresh operation is not cascaded.
                    this._refreshFromDocument(entity, document, (err: Error) => {
                        if(err) return callback(err);
                        callback(null, entity);
                    });
                    return;
                }
            }

            // Note that if the updated document is not returned, the old version of the entity will remain or be
            // loaded into the session. If the entity is saved then an error will occur because the version will
            // not match. This is most consistent with an entity being modified from outside of the session, which
            // is essentially what is happening if findOneAndUpdate is called without returning the new document. If a
            // user wants to see the old version of the document and then make changes, they can always call refresh
            // after findOneAndUpdate.
            callback(null, entity);
        });
    }

    private _remove(query: QueryDefinition, callback: ResultCallback<number>): void {

        var options: RemoveOptions = {
            single: query.kind == QueryKind.RemoveOne
        }

        this._collection.remove(this._prepareCriteria(query.criteria), options, (err: Error, response: any) => {
            if(err) return callback(err);
            callback(null, response.result.n);
        });
    }

    private _update(query: QueryDefinition, callback: ResultCallback<number>): void {

        var options: UpdateOptions = {
            multi: query.kind == QueryKind.UpdateAll
        }

        this._collection.update(this._prepareCriteria(query.criteria), query.updateDocument, options, (err: Error, response: any) => {
            if(err) return callback(err);
            callback(null, response.result.nModified);
        });
    }

    private _distinct(query: QueryDefinition, callback: ResultCallback<any[]>): void {

        // TODO: add options for readpreference

        // TODO: resolve field path for distinct e.g. 'personName.last' is a valid key. Are we going to allow resolving across entities? inverse relationships?
        var property = this._mapping.getPropertyForField(query.key);
        if(property === undefined) {
            return callback(new Error("Unknown field '" + query.key + "' for entity '" + this._mapping.name + "'."));
        }

        this._collection.distinct(query.key, this._prepareCriteria(query.criteria), undefined, (err: Error, results: any[]) => {
            if(err) return callback(err);

            // read results based on property mapping
            var errors: MappingError[] = [],
                mapping = property.mapping;

            for(var i = 0, l = results.length; i < l; i++) {
                results[i] = mapping.read(this._session, results[i], "", errors);
                if (errors.length > 0) {
                    return callback(new Error("Error deserializing distinct values for property '" + property.name + "':\n" + MappingError.createErrorMessage(errors)));
                }
            }

            callback(null, results);
        });
    }

    private _count(query: QueryDefinition, callback: ResultCallback<number>): void {

        // TODO: add options for readpreference

        var options: CountOptions = {
            limit: query.limitCount,
            skip: query.skipCount
        }

        this._collection.count(this._prepareCriteria(query.criteria), options, (err: Error, result: number) => {
            if(err) return callback(err);
            callback(null, result);
        });
    }

    private _fetchOne(query: FindOneQuery, callback: ResultCallback<any>): ResultCallback<any> {

        if(!query.fetchPaths) {
            return callback;
        }

        return (err: Error, entity: any) => {
            if(err) return callback(err);
            if(!entity) return callback(null);
            this._session.fetchInternal(entity, query.fetchPaths, callback);
        }
    }

    private _fetchAll(query: FindAllQuery, callback: ResultCallback<any[]>): ResultCallback<any[]> {

        if(!query.fetchPaths) {
            return callback;
        }

        return (err: Error, entities: any) => {
            if(err) return callback(err);
            async.each(entities, (entity, done) => this._session.fetchInternal(entity, query.fetchPaths, done), err => {
                if(err) return callback(err);
                callback(null, entities);
            });
        }
    }

    private _fetchIterator(query: FindEachQuery): IteratorCallback<Object> {

        if(!query.fetchPaths) {
            return query.iterator;
        }

        return (entity: any, done: (err?: Error) => void) => {
            if(!entity) return done();

            this._session.fetchInternal(entity, query.fetchPaths, (err: Error, result: any) => {
                if(err) return done(err);
                query.iterator(result, done);
            });
        }
    }

    private _loadAll(documents: any[]): Result<Object[]> {

        if(!documents || documents.length == 0) {
            return new Result(null, []);
        }

        var entities = new Array(documents.length);
        var j = 0;
        for(var i = 0, l = documents.length; i < l; i++) {
            var result = this._loadOne(documents[i]);
            if(result.error) {
                return new Result(result.error, null);
            }
            // Filter any null values from the result because null means the object is scheduled for removal
            if(result.value !== null) {
                entities[j++] = result.value;
            }
        }
        entities.length = j;
        return new Result(null, entities);
    }

    private _loadOne(document: any): Result<Object> {

        var entity: any;

        if (!document) {
            entity = null;
        }
        else {
            // Check to see if object is already loaded. Note explicit check for undefined here. Null means
            // that the object is loaded but scheduled for delete so null should be returned.
            entity = this._session.getObject(document["_id"]);
            if (entity === undefined) {

                var errors: MappingError[] = [];
                entity = this._mapping.read(this._session, document, "", errors);
                if (errors.length > 0) {
                    return new Result(new Error("Error deserializing document:\n" + MappingError.createErrorMessage(errors)));
                }

                this._session.registerManaged(this, entity, document);
            }
        }

        return new Result(null, entity);
    }

    private _getCommand(batch: Batch): BulkOperationCommand {
        var id = this._mapping.inheritanceRoot.id;
        var command = <BulkOperationCommand>batch.getCommand(id);
        if(!command) {
            command = new BulkOperationCommand(this._collection);
            batch.addCommand(id, command);
        }
        return command;
    }

}

class BulkOperationCommand implements Command {

    collectionName: string;
    operation: Bulk;
    inserted: number;
    updated: number;
    removed: number;

    constructor(collection: Collection) {

        this.collectionName = collection.collectionName,
        this.operation = collection.initializeUnorderedBulkOp(),
        this.inserted = this.updated = this.removed = 0;
    }

    addInsert(document: any): void {

        this.inserted++;
        this.operation.insert(document);
        //console.log("INSERT: " + JSON.stringify(document, null, "\t"));
    }

    addReplace(document: any): void {

        var query: any = {
            _id: document["_id"]
        }

        this.updated++;
        this.operation.find(query).replaceOne(document);
        //console.log("REPLACE: " + JSON.stringify(document, null, "\t"));
    }

    addUpdate(id: any, changes: Changes): void {

        var query: any = {
            _id: id
        }

        this.updated++;
        this.operation.find(query).update(changes);
        //console.log("UPDATE: " + JSON.stringify(changes, null, "\t"));
    }

    addRemove(id: any): void {

        var query: any = {
            _id: id
        }

        this.removed++;
        this.operation.find(query).removeOne();
        //console.log("REMOVE: " + JSON.stringify(document, null, "\t"));
    }

    execute(callback: Callback): void {

        this.operation.execute((err: Error, result: BulkWriteResult) => {
            if(err) return callback(err);

            // TODO: provide more detailed error information
            if((result.nInserted || 0) != this.inserted) {
                return callback(new Error("Flush failed for collection '" + this.collectionName + "'. Expected to insert " + this.inserted + " documents but only inserted " + (result.nInserted || 0) + "."));
            }

            if((result.nModified || 0) != this.updated) {
                return callback(new Error("Flush failed for collection '" + this.collectionName + "'. Expected to update " + this.updated + " documents but only updated " + (result.nModified || 0) + "."));
            }

            if((result.nRemoved || 0) != this.removed) {
                return callback(new Error("Flush failed for collection '" + this.collectionName + "'. Expected to remove " + this.removed + " documents but only removed " + (result.nRemoved || 0) + "."));
            }

            callback();
        });
    }
}

class FindQueue {

    private _persister: PersisterImpl;
    private _ids: any[];
    private _callbacks: Map<ResultCallback<any>>;

    constructor(persister: PersisterImpl) {
        this._persister = persister;
    }

    add(id: any, callback: ResultCallback<any>): void {
        if(!this._ids) {
            // this is the first entry in the queue so create the queue and schedule processing on the next tick
            this._ids = [];
            this._callbacks = {};
            process.nextTick(() => this._process());
        }

        var key = id.toString();
        var existingCallback = this._callbacks[key];
        if(existingCallback === undefined) {
            this._ids.push(id);
            this._callbacks[key] = callback;
        }
        else {
            // this id is already in the queue so chain the callbacks
            this._callbacks[key] = ResultCallback.chain(callback, existingCallback);
        }
    }

    private _process(): void {

        // pull values local
        var callbacks = this._callbacks,
            ids = this._ids;

        // clear queue
        this._ids = this._callbacks = undefined;

        // check for simple case of only a single find in the queue
        if(ids.length == 1) {
            var id = ids[0],
                callback = callbacks[id.toString()];

            this._persister.findOne({ _id:  id }, (err, entity) => {
                if(err) return callback(err);

                if(!entity) {
                    return callback(new Error("Unable to find document with identifier '" + id.toString() + "'."));
                }
                callback(null, entity);
            });
            return;
        }

        this._persister.findAll({ criteria: { _id: { $in: ids }}}, (err, entities) => {
            if(!err) {
                for (var i = 0, l = entities.length; i < l; i++) {
                    var entity = entities[i];

                    var id = entity["_id"].toString(),
                        callback = callbacks[id];

                    callback(null, entity);
                    // mark the callback as called
                    callbacks[id] = undefined;
                }
            }

            // TODO: add test to make sure callbacks are called if document cannot be found

            // pass error message to any callbacks that have not been called yet
            for (var id in callbacks) {
                if (callbacks.hasOwnProperty(id)) {
                    var callback = callbacks[id];
                    if(callback) {
                        callback(err || new Error("Unable to find document with identifier '" + id + "'."));
                    }
                }
            }
        });
    }
}

export = PersisterImpl;