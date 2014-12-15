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

    persist (obj: any): void {

        this._uow.persist(obj);
    }

    remove (obj: any): void {

        this._uow.remove(obj);
    }

    find<T>(ctr: Constructor<T>, id: Identifier, callback: (err: Error, result: T) => void): void {

        this._uow.find(ctr, id, callback);
    }

    query<T>(ctr: Constructor<T>): QueryBuilder<T> {

        return new QueryBuilder(ctr);
    }

    flush(callback: Callback): void {
        this._uow.flush(callback);
    }

    getIdentifier(obj: any): Identifier {
        return null;
    }
}

export = Session;