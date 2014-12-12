import Callback = require("./callback");
import Identifier = require("./id/identifier");
import UnitOfWork = require("./unitOfWork");
import Constructor = require("./constructor");
import QueryBuilder = require("./queryBuilder");
import SessionFactory = require("./sessionFactory");
import LockMode = require("./lockMode");

class Session {

    private _uow: UnitOfWork;
    private _sessionFactory: SessionFactory;

    constructor(sessionFactory: SessionFactory) {

        this._sessionFactory = sessionFactory;
        this._uow = new UnitOfWork(sessionFactory.collections, sessionFactory.mappingRegistry);
    }

    save (obj: any): void {

        this._uow.save(obj);
    }

    remove (obj: any): void {

        this._uow.remove(obj);
    }

    find<T>(ctr: Constructor<T>, id: Identifier, callback: (err: Error, result: T) => void): void {

    }

    query<T>(ctr: Constructor<T>): QueryBuilder<T> {

        return new QueryBuilder(ctr);
    }

    flush(callback: Callback): void {
        this._uow.flush(callback);
    }
}

export = Session;