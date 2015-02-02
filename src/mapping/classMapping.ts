import Map = require("../core/map");
import MappingError = require("./mappingError");
import ObjectMapping = require("./objectMapping");
import MappingRegistry = require("./mappingRegistry");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");
import Reference = require("../reference");
import PropertyFlags = require("./propertyFlags");
import InternalSession = require("../internalSession");
import ResultCallback = require("../core/resultCallback");

class ClassMapping extends ObjectMapping {

    private _baseClass: ClassMapping;
    private _subclasses: ClassMapping[];
    private _discriminatorMap: Map<ClassMapping>;
    private _registry: MappingRegistry;

    inheritanceRoot: ClassMapping;

    name: string;
    discriminatorField: string;
    discriminatorValue: string;
    classConstructor: Function;

    constructor(baseClass?: ClassMapping) {
        super();

        this.flags |= MappingFlags.Class;

        this._baseClass = baseClass;
        if(!baseClass) {
            this.flags |= MappingFlags.InheritanceRoot;
            this.inheritanceRoot = this;
        }
        else {
            var previous = baseClass;
            while(baseClass) {
                baseClass._addSubClass(this);
                previous = baseClass;
                baseClass = baseClass._baseClass;
            }
            this.inheritanceRoot = previous;
        }
    }

    setDiscriminatorValue(value: string): void {

        this.discriminatorValue = value;
        this.inheritanceRoot._addDiscriminatorMapping(value, this);
    }

    private _addSubClass(subclass: ClassMapping): void {

        if(!this._subclasses) {
            this._subclasses = [];
        }
        this._subclasses.push(subclass);
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

    private _ensureRegistry(): MappingRegistry {

        if(!this._registry) {
            this._registry = new MappingRegistry();
            if(this._subclasses) {
                var subclasses = this._subclasses;
                for (var i = 0, l = subclasses.length; i < l; i++) {
                    this._registry.addMapping(subclasses[i]);
                }
            }
        }

        return this._registry;
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
        return (this._ensureRegistry().getMappingForObject(value) || this).writeClass(value, path, errors, visited);
    }

    protected writeClass(value: any, path: string, errors: MappingError[], visited: any[]): any {

        var document: any = {};
        document[this.inheritanceRoot.discriminatorField] = this.discriminatorValue;

        return this.writeObject(document, value, path, errors, visited);
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

    walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {

        if (!value || typeof value !== "object") return;

        return (this._ensureRegistry().getMappingForObject(value) || this)._walk(value, flags, entities, embedded, references);
    }

    private _walk(value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {
        super.walk(value, flags, entities, embedded, references);
    }

    resolve(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {
        if (!value || typeof value !== "object") {
            return callback(null, value);
        }

        return (this._ensureRegistry().getMappingForObject(value) || this)._resolve(session, parentEntity, value, path, depth, callback);
    }

    private _resolve(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {
        super.resolve(session, parentEntity, value, path, depth, callback);
    }

}

export = ClassMapping;