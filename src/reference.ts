import InternalSession = require("./internalSession");
import EntityMapping = require("./mapping/entityMapping");
import ResultCallback = require("./core/resultCallback");

class Reference {

    /**
     * True if the Reference has been fetched; otherwise, false.
     */
    constructor(public mapping: EntityMapping, private _id: any) {

    }

    fetch(session: InternalSession, callback: ResultCallback<any>): void {

        if(this.mapping) {
            var persister = session.getPersister(this.mapping);
        }

        if (!persister) {
            process.nextTick(() => callback(new Error("Object type is not mapped as an entity.")));
            return;
        }

        persister.findOneById(this._id, callback);
    }

    getId(): any {
        return this._id;
    }

    /**
     * Returns true if other is another reference with the same id or the resolved entity for the reference.
     * @param other The reference or entity to compare.
     */
    equals(other: any): boolean {

        if (other == null) return false;

        var id = other instanceof Reference ? (<Reference>other)._id : other._id;
        if (id == null) return false;

        return (<EntityMapping>this.mapping.inheritanceRoot).identity.areEqual(this._id, id)
    }

    /**
     * Returns true if values are equivalent. Either value can be a Reference or an Entity. However, if neither
     * value is a Reference then the function returns false.
     * @param value1 The first reference or entity to compare.
     * @param value2 The second reference or entity to compare.
     */
    static areEqual(value1: any, value2: any): boolean {

        if(value1 == value2) return true;
        if(value1 == null || value2 == null) return false;

        if(value1 instanceof Reference) {
            var mapping1 = (<Reference>value1).mapping;
            var id1 = (<Reference>value1)._id;
        }
        else {
            // if value is not a Reference, we assume it's an Entity
            var id1 = value1._id;
        }

        if(value2 instanceof Reference) {
            var mapping2 = (<Reference>value2).mapping;
            var id2 = (<Reference>value2)._id;
        }
        else {
            // if value is not a Reference, we assume it's an Entity
            var id2 = value2._id;
        }

        // if neither value is a Reference, then return false
        if (mapping1 == null && mapping2 == null) return false;

        // if we are not able to find both identifiers, then return false
        if (id1 == null || id2 == null) return false;

        // No need to check that the mappings are equivalent since the identifiers are assumed to be globally
        // unique. The identity generator's 'areEqual' function should return false if identifier types are
        // not compatible.
        return (<EntityMapping>(mapping1 || mapping2).inheritanceRoot).identity.areEqual(id1, id2)
    }

    static isReference(obj: any): boolean {

        return obj instanceof Reference;
    }
}

export = Reference;