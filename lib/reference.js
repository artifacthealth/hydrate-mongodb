var Reference = (function () {
    /**
     * True if the Reference has been fetched; otherwise, false.
     */
    function Reference(mapping, id) {
        this.mapping = mapping;
        this.id = id;
    }
    Reference.prototype.fetch = function (session, callback) {
        if (this.mapping) {
            var persister = session.getPersister(this.mapping);
        }
        if (!persister) {
            process.nextTick(function () { return callback(new Error("Object type is not mapped as an entity.")); });
            return;
        }
        persister.findOneById(this.id, callback);
    };
    /**
     * Returns true if other is another reference with the same id or the resolved entity for the reference.
     * @param other The reference or entity to compare.
     */
    Reference.prototype.equals = function (other) {
        if (other == null)
            return false;
        var id = other instanceof Reference ? other.id : other._id;
        if (id == null)
            return false;
        return this.mapping.inheritanceRoot.identity.areEqual(this.id, id);
    };
    /**
     * Returns true if values are equivalent. Either value can be a Reference or an Entity. However, if neither
     * value is a Reference then the function returns false.
     * @param value1 The first reference or entity to compare.
     * @param value2 The second reference or entity to compare.
     */
    Reference.areEqual = function (value1, value2) {
        if (value1 == value2)
            return true;
        if (value1 == null || value2 == null)
            return false;
        if (value1 instanceof Reference) {
            var mapping1 = value1.mapping;
            var id1 = value1.id;
        }
        else {
            // if value is not a Reference, we assume it's an Entity
            var id1 = value1._id;
        }
        if (value2 instanceof Reference) {
            var mapping2 = value2.mapping;
            var id2 = value2.id;
        }
        else {
            // if value is not a Reference, we assume it's an Entity
            var id2 = value2._id;
        }
        // if neither value is a Reference, then return false
        if (mapping1 == null && mapping2 == null)
            return false;
        // if we are not able to find both identifiers, then return false
        if (id1 == null || id2 == null)
            return false;
        // No need to check that the mappings are equivalent since the identifiers are assumed to be globally
        // unique. The identity generator's 'areEqual' function should return false if identifier types are
        // not compatible.
        return (mapping1 || mapping2).inheritanceRoot.identity.areEqual(id1, id2);
    };
    Reference.isReference = function (obj) {
        return obj instanceof Reference;
    };
    return Reference;
})();
module.exports = Reference;
