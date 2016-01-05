import {InternalSession} from "./internalSession";
import {EntityMapping} from "./mapping/entityMapping";
import {ResultCallback} from "./core/resultCallback";
import {Constructor} from "./core/constructor";

export class Reference {

    /**
     * The referenced id.
     */
    private _id: any;

    /**
     * The mapping for the referenced type. May not be available until after a fetch is performed on the Reference.
     */
    mapping: EntityMapping;

    /**
     * The constructor for the referenced type if the mapping is not available.
     */
    private _ctr: Constructor<any>;

    /**
     * True if the Reference has been fetched; otherwise, false.
     */
    constructor(mapping: EntityMapping, ctr: Constructor<any>, id: any) {

        this.mapping = mapping;
        this._ctr = ctr;
        this._id = id;
    }

    fetch(session: InternalSession, callback: ResultCallback<any>): void {

        if (this._id == null) {
            process.nextTick(() => callback(new Error("Reference has missing or invalid identifier.")));
            return;
        }

        if(this.mapping) {
            this._fetchObject(session, this.mapping, callback);
            return;
        }

        session.factory.getMappingForConstructor(this._ctr, (err, mapping) => {
            if(err) return callback(err);

            this._fetchObject(session, this.mapping = mapping, callback);
        });
    }

    private _fetchObject(session: InternalSession, mapping: EntityMapping, callback: ResultCallback<any>): void {

        session.getPersister(mapping, (err, persister) => {
            if (err) return callback(err);

            persister.findOneById(this._id, callback);
        });
    }

    getId(): any {
        return this._id;
    }

    /**
     * Returns true if other is another reference with the same id or the resolved entity for the reference.
     * @param other The reference or entity to compare.
     */
    equals(other: any): boolean {

        return Reference.areEqual(this, other);
    }

    /**
     * Returns true if values are equivalent. Either value can be a Reference or an Entity.
     * @param value1 The first reference or entity to compare.
     * @param value2 The second reference or entity to compare.
     */
    static areEqual(value1: any, value2: any): boolean {

        if(value1 == value2) return true;
        if(value1 == null || value2 == null) return false;

        var id1 = value1._id,
            id2 = value2._id;

        // if we are not able to find both identifiers, then return false
        if (id1 == null || id2 == null) return false;

        // identifiers are required to be globally unique so there is no need to check the mapping, etc.

        // if the id has an equals function then use it
        if(id1.equals) {
            return id1.equals(id2);
        }

        // otherwise, convert to a string and compare
        return id1.toString() === id2.toString();
    }

    static isReference(obj: any): boolean {

        return obj instanceof Reference;
    }

    /**
     * Fetches the Reference if the object is a Reference; otherwise, returns the passed object in the callback.
     * @param session The current session.
     * @param obj The object to fetch.
     * @param callback Called with the fetched object.
     */
    static fetch(session: InternalSession, obj: any, callback: ResultCallback<any>): void {

        if(Reference.isReference(obj)) {
            (<Reference>obj).fetch(session, callback);
        }
        else {
            callback(null, obj);
        }
    }
}

