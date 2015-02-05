import Callback = require("../core/callback");
import ResultCallback = require("../core/resultCallback");
import InternalSession = require("../internalSession");
import Persister = require("../persister");
import Cursor = require("../cursor");
import FindOneBuilder = require("./findOneBuilder");
import FindOneAndRemoveBuilder = require("./findOneAndRemoveBuilder");
import FindOneAndUpdateBuilder = require("./findOneAndUpdateBuilder");
import CountBuilder = require("./countBuilder");

/*

session.query(Patient).findOne({ name: 'Bob' }).fetch("children", (err, result) => {
session.query(Patient).findOneAndRemove({ name: 'Bob' }).sort("name", 1, (err, result) => {
session.query(Patient).findAll({ name: 'Bob' }).toArray((err, results) => {
session.query(Patient).findAll({ name: 'Bob' }).sort("name", 1).toArray((err, results) => {
session.query(Patient).findAll({ name: 'Bob' }).sort("name", 1, (err, cursor) => {


});

 */
class Query<T> {

    private _session: InternalSession;
    private _persister: Persister;

    constructor(session: InternalSession, persister: Persister) {

        this._session = session;
        this._persister = persister;
    }

    findAll(criteria: Object): Cursor<T> {

        return null;
    }

    findOne(criteria: Object, callback?: ResultCallback<T>): FindOneBuilder<T> {

        if(callback) {
            this._session.findOne(this._persister, criteria, callback);
            return TerminalBuilder.instance;
        }

        // no callback specified so additional options are expected.
        return new Builder((options, callback) => {

            this._session.findOne(this._persister, criteria, (err, obj) => {
                if(err) return callback(err);
                this._session.fetchInternal(obj, options.fetches, callback);
            });
        });
    }

    findOneById(id: any, callback: ResultCallback<any>): FindOneBuilder<T> {

        if(typeof id === "string") {
            id = this._persister.identity.fromString(id);
        }

        if(callback) {
            this._session.findOneById(this._persister, id, callback);
            return TerminalBuilder.instance;
        }

        // no callback specified so additional options are expected.
        return new Builder((options, callback) => {

            this._session.findOneById(this._persister, id, (err, obj) => {
                if(err) return callback(err);
                this._session.fetchInternal(obj, options.fetches, callback);
            });
        });
    }

    findOneAndRemove(criteria: Object, callback?: ResultCallback<T>): FindOneAndRemoveBuilder<T> {

        if(callback) {
            this._session.findOneAndRemove(this._persister, criteria, undefined, callback);
            return TerminalBuilder.instance;
        }

        // no callback specified so additional options are expected.
        return new Builder((options, callback) => {

            this._session.findOneAndRemove(this._persister, criteria, options.sorts, (err, obj) => {
                if(err) return callback(err);

                if(options.fetches.length == 0) {
                    callback(null, obj);
                }
                else {
                    this._session.fetchInternal(obj, options.fetches, callback);
                }
            });
        });
    }

    findOneAndUpdate(criteria: Object, updateDocument: Object, callback?: ResultCallback<T>): FindOneAndUpdateBuilder<T> {

        if(callback) {
            this._session.findOneAndUpdate(this._persister, criteria, undefined, false, updateDocument, callback);
            return TerminalBuilder.instance;
        }

        // no callback specified so additional options are expected.
        return new Builder((options, callback) => {

            this._session.findOneAndUpdate(this._persister, criteria, options.sorts, options.wantsUpdated, updateDocument, (err, obj) => {
                if(err) return callback(err);

                if(options.fetches.length == 0) {
                    callback(null, obj);
                }
                else {
                    this._session.fetchInternal(obj, options.fetches, callback);
                }
            });
        });
    }

    removeAll(criteria: Object, callback?: ResultCallback<number>): void {

        this._session.removeAll(this._persister, criteria, callback);
    }

    removeOne(criteria: Object, callback?: Callback): void {

        this._session.removeOne(this._persister, criteria, callback);
    }

    updateAll(criteria: Object, updateDocument: Object, callback?: ResultCallback<number>): void {

        this._session.updateAll(this._persister, criteria, updateDocument, callback);
    }

    updateOne(criteria: Object, updateDocument: Object, callback?: Callback): void {

        this._session.updateOne(this._persister, criteria, updateDocument, callback);
    }

    distinct(key: string, criteria: Object, callback: ResultCallback<T[]>): void {

        this._session.distinct(this._persister, key, criteria, callback);
    }

    count(criteria: Object, callback?: ResultCallback<number>): CountBuilder<number> {

        if(callback) {
            this._session.count(this._persister, criteria, undefined, undefined, callback);
            return TerminalBuilder.instance;
        }

        // no callback specified so additional options are expected.
        return new Builder((options, callback) => this._session.count(this._persister, criteria, options.limitValue, options.skipValue, callback));
    }
}

interface QueryOptions {

    fetches: string[];
    sorts: [string, number][];
    wantsUpdated: boolean;
    limitValue: number;
    skipValue: number;
}

class Builder<T> implements QueryOptions, FindOneBuilder<T>, FindOneAndRemoveBuilder<T>, FindOneAndUpdateBuilder<T>, CountBuilder<T> {

    private _execute: (options: QueryOptions, callback: ResultCallback<T>) => void;

    fetches: string[] = [];
    sorts: [string, number][];
    wantsUpdated: boolean;
    limitValue: number;
    skipValue: number;

    constructor(execute: (options: QueryOptions, callback: ResultCallback<T>) => void) {
        this._execute = execute;
    }

    fetch(path: string | string[], callback?: ResultCallback<T>): any {

        if(typeof path === "string") {
            this.fetches.push(path);
        }
        else {
            this.fetches = this.fetches.concat(path);
        }

        return this._handleCallback(callback);
    }

    sort(field: string | [string, number][], directionOrCallback: number | ResultCallback<T>, callback?: ResultCallback<T>): any {

        if(typeof field === "string" ) {
            if(typeof directionOrCallback === "number") {
                this.sorts.push([field, directionOrCallback]);
            }
            else {
                throw new Error("Expected second parameter to be the sort direction when first parameter is a string.");
            }
        }
        else {
            this.sorts = this.sorts.concat(field);
        }

        if(typeof directionOrCallback === "number") {
            return this._handleCallback(callback);
        }
        else {
            return this._handleCallback(directionOrCallback);
        }
    }

    returnUpdated(callback?: ResultCallback<T>): any {

        this.wantsUpdated = true;
        return this._handleCallback(callback);
    }

    limit(value: number, callback?: ResultCallback<T>): any {

        this.limitValue = value;
        return this._handleCallback(callback);
    }

    skip(value: number, callback?: ResultCallback<T>): any {

        this.skipValue = value;
        return this._handleCallback(callback);
    }

    private _handleCallback(callback?: ResultCallback<T>): any {

        if(callback) {
            // we've reached the end of the chain
            this._execute(this, callback);
            return TerminalBuilder.instance;
        }

        return this;
    }
}

class TerminalBuilder<T>  implements FindOneBuilder<T>, FindOneAndRemoveBuilder<T>, FindOneAndUpdateBuilder<T>, CountBuilder<T> {

    static instance = new TerminalBuilder<any>();

    fetch(path: any, callback?: ResultCallback<T>): TerminalBuilder<T> {
        return this._handleCallback(callback);
    }

    sort(fields: any, directionOrCallback: any, callback?: ResultCallback<T>): TerminalBuilder<T> {
        return this._handleCallback(callback || directionOrCallback);
    }

    returnUpdated(callback?: ResultCallback<T>): TerminalBuilder<T> {
        return this._handleCallback(callback);
    }

    limit(value: number, callback?: ResultCallback<T>): TerminalBuilder<T> {
        return this._handleCallback(callback);
    }

    skip(value: number, callback?: ResultCallback<T>): TerminalBuilder<T> {
        return this._handleCallback(callback);
    }

    private _handleCallback(callback: ResultCallback<T>): TerminalBuilder<T> {
        if(callback) {
            callback(new Error("Only one function in the chain can be passed a callback."));
        }
        return this;
    }
}

export = Query;