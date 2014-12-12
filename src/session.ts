import Callback = require("./callback");
import Connection = require("./driver/connection");
import ObjectId = require("./driver/objectId");
import UnitOfWork = require("./unitOfWork");
import Constructor = require("./constructor");
import QueryBuilder = require("./queryBuilder");
import SessionFactory = require("./sessionFactory");
import LockMode = require("./lockMode");

class Session {

    private _connection: Connection;
    private _uow: UnitOfWork;
    private _sessionFactory: SessionFactory;

    constructor(connection: Connection, sessionFactory: SessionFactory) {

        this._connection = connection;
        this._sessionFactory = sessionFactory;
        this._uow = new UnitOfWork(connection, sessionFactory.mappingRegistry);
    }

    save (obj: any): void {

        this._uow.save(obj);
    }

    remove (obj: any): void {

        this._uow.remove(obj);
    }

    find<T>(ctr: Constructor<T>, id: ObjectId, callback: (err: Error, result: T) => void): void {

    }

    query<T>(ctr: Constructor<T>): QueryBuilder<T> {

        return new QueryBuilder(ctr);
    }

    flush(callback: Callback): void {
        this._uow.flush(callback);
    }
}

export = Session;