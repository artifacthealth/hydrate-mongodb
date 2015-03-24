var Property = (function () {
    function Property(name, mapping) {
        if (!name) {
            throw new Error("Missing required argument 'name'.");
        }
        if (!mapping) {
            throw new Error("Missing required argument 'mapping'.");
        }
        this.name = name;
        this.mapping = mapping;
    }
    Property.prototype.setFlags = function (flags) {
        if (this.flags === undefined) {
            this.flags = flags;
        }
        else {
            this.flags |= flags;
        }
    };
    Property.prototype.getPropertyValue = function (obj) {
        // Generate getters for VM optimization on first call to the getter. Verified that this improves performance
        // more than 3x for subsequent calls. We need to wait until the first call to generate the getter because
        // the 'flags' are not necessarily set in the constructor. See: http://tinyurl.com/kap2g2r
        this.getPropertyValue = (new Function("o", "return o['" + this.name + "']"));
        return obj[this.name];
    };
    Property.prototype.setPropertyValue = function (obj, value) {
        // See comment in getPropertyValue. Verified performance improvement for setting a value as well, but for
        // setting we got almost a 10x performance improvement.
        this.setPropertyValue = (new Function("o,v", "o['" + this.name + "'] = v"));
        obj[this.name] = value;
    };
    Property.prototype.getFieldValue = function (document) {
        this.getFieldValue = (new Function("o", "return o['" + this.field + "']"));
        return document[this.field];
    };
    Property.prototype.setFieldValue = function (document, value) {
        this.setFieldValue = (new Function("o,v", "o['" + this.field + "'] = v"));
        document[this.field] = value;
    };
    return Property;
})();
module.exports = Property;
