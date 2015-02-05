import Session = require("./session");
import Callback = require("./core/callback");
import ResultCallback = require("./core/resultCallback");
import Identifier = require("./id/identifier");
import Persister = require("./persister");
import EntityMapping = require("./mapping/entityMapping");
import InternalSessionFactory = require("./internalSessionFactory");
import Cursor = require("./cursor");

interface InternalSession extends Session {

    factory: InternalSessionFactory;

    getObject(id: Identifier): any;
    registerManaged(persister: Persister, entity: any, document: any): void;
    getPersister(mapping: EntityMapping): Persister;
    getReferenceInternal(mapping: EntityMapping, id: Identifier): any;
    fetchInternal(obj: any, paths: string[], callback: ResultCallback<any>): void;

    findAll(persister: Persister, criteria: any): Cursor<any>;
    findOne(persister: Persister, criteria: any, callback: ResultCallback<any>): void;
    findOneById(persister: Persister, id: Identifier, callback: ResultCallback<any>): void;
    findOneAndRemove(persister: Persister, criteria: Object, sort: [string, number][], callback: ResultCallback<any>): void;
    findOneAndUpdate(persister: Persister, criteria: Object, sort: [string, number][], returnNew: boolean, updateDocument: Object, callback: ResultCallback<any>): void;
    distinct(persister: Persister, key: string, criteria: Object, callback: ResultCallback<any[]>): void;
    count(persister: Persister, criteria: Object, limit: number, skip: number, callback: ResultCallback<number>): void;
    removeAll(persister: Persister, criteria: Object, callback?: ResultCallback<number>): void;
    removeOne(persister: Persister, criteria: Object, callback?: Callback): void;
    updateAll(persister: Persister, criteria: Object, updateDocument: Object, callback?: ResultCallback<number>): void;
    updateOne(persister: Persister, criteria: Object, updateDocument: Object, callback?: Callback): void;
}

export = InternalSession;