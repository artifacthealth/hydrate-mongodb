import Map = require("../core/map");
import MappingError = require("./mappingError");
import ObjectMapping = require("./objectMapping");
import MappingRegistry = require("./mappingRegistry");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("./reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");

class ClassMapping extends ObjectMapping {

    private _discriminatorMap: Map<ClassMapping>;

    name: string;
    discriminatorField: string;
    discriminatorValue: string;
    classConstructor: Function;

    constructor(protected registry: MappingRegistry, public inheritanceRoot?: ClassMapping) {
        super();

        this.flags |= MappingFlags.Class;

        if(!inheritanceRoot) {
            this.flags |= MappingFlags.InheritanceRoot;
            this.inheritanceRoot = this;
        }
    }

    setDiscriminatorValue(value: string): void {

        this.discriminatorValue = value;
        this.inheritanceRoot._addDiscriminatorMapping(value, this);
    }

    private _addDiscriminatorMapping(value: string, mapping: ClassMapping): void {

        if(!this._discriminatorMap) {
            this._discriminatorMap = {};
        }

        if(this._discriminatorMap[value]) {
            throw new Error("There is already a class in this inheritance hierarchy with a discriminator value of '" + value + "'.");
        }

        this._discriminatorMap[value] = mapping;
    }


    read(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        var mapping = this.inheritanceRoot.getMapping(value, path, errors);
        if (mapping) {
            return mapping.readClass(session, value, path, errors);
        }
    }

    /**
     * Gets the mapping for the specified document. Note that this method can only be called on an inheritance root.
     * @param document The document.
     * @param path The current path. Used for error reporting.
     * @param errors An array of reported errors.
     */
    getMapping(document: any, path: string, errors: MappingError[]): ClassMapping {

        var discriminatorValue = document[this.discriminatorField];
        if(discriminatorValue === undefined) {
            errors.push({ message: "Expected discriminator field '" + this.discriminatorField + "'.", path: path, value: document });
            return;
        }

        var mapping = this._discriminatorMap[discriminatorValue];
        if(mapping === undefined) {
            errors.push({ message: "Unknown discriminator value '" + discriminatorValue + "'.", path: path, value: document });
            return;
        }

        return mapping;
    }

    protected readClass(session: InternalSession, value: any, path: string, errors: MappingError[]): any {

        return this.readObject(session, Object.create(this.classConstructor.prototype), value, path, errors, /*checkRemoved*/ false);
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
        // does not exist, default to current mapping.
        return (this.registry.getMappingForObject(value) || this).writeClass(value, path, errors, visited);
    }

    protected writeClass(value: any, path: string, errors: MappingError[], visited: any[]): any {

        var document: any = {};
        document[this.inheritanceRoot.discriminatorField] = this.discriminatorValue;

        return this.writeObject(document, value, path, errors, visited);
    }

    compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        var objectMapping = (this.registry.getMappingForObject(objectValue) || this);

        /*
        TODO: handle situation where objectMapping != documentMapping
        var discriminatorValue = documentValue[this.inheritanceRoot.discriminatorField];
        var documentMapping = this.inheritanceRoot._discriminatorMap[discriminatorValue];
        */

        objectMapping._compare(objectValue, documentValue, changes, path);
    }

    private _compare(objectValue: any, documentValue: any, changes: Changes, path: string): void {
        super.compare(objectValue, documentValue, changes, path);
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        var root = this.inheritanceRoot;

        // get mappings for documents based on discriminator
        var discriminatorValue1 = documentValue1[root.discriminatorField],
            discriminatorValue2 = documentValue2[root.discriminatorField];

        if (discriminatorValue1 === undefined || discriminatorValue2 === undefined) {
            return false;
        }

        var mapping1 = root._discriminatorMap[discriminatorValue1],
            mapping2 = root._discriminatorMap[discriminatorValue2];

        // make sure both documents have the same mapping
        if(mapping1 === undefined || mapping2 === undefined || mapping1 !== mapping2) {
            return false;
        }

        return mapping1._areEqual(documentValue1, documentValue2);
    }

    private _areEqual(documentValue1: any, documentValue2: any): boolean {

        return super.areEqual(documentValue1, documentValue2);
    }

    walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (value === null || value === undefined || typeof value !== "object") return;

        return (this.registry.getMappingForObject(value) || this)._walk(session, value, flags, entities, embedded, references);
    }

    private _walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {
        super.walk(session, value, flags, entities, embedded, references);
    }

}

export = ClassMapping;