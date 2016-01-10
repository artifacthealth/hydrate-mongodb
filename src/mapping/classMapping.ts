import {MappingError} from "./mappingError";
import {ObjectMapping} from "./objectMapping";
import {MappingRegistry} from "./mappingRegistry";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {Reference} from "../reference";
import {PropertyFlags} from "./propertyFlags";
import {InternalSession} from "../internalSession";
import {ResultCallback} from "../core/resultCallback";
import {ReadContext} from "./readContext";

export class ClassMapping extends ObjectMapping {

    private _baseClass: ClassMapping;
    private _subclasses: ClassMapping[];
    private _discriminatorMap: Map<string, ClassMapping>;
    private _registry: MappingRegistry;

    inheritanceRoot: ClassMapping;

    name: string;
    discriminatorField: string;
    discriminatorValue: string;
    classConstructor: Function;

    /**
     * Constructs a ClassMapping.
     * @param baseClass The baseclass mapping for this class. If no baseclass is specified then it is assumed that this
     * mapping represents the inheritance root.
     */
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

        if(typeof value !== "string") {
            throw new Error("Expected string for discriminator value.");
        }
        this.discriminatorValue = value;
        this.inheritanceRoot._addDiscriminatorMapping(value, this);
    }

    setQueryDocumentDiscriminator(obj: any): void {

        var discriminators: string[] = [];
        this._getDescendantDiscriminators(discriminators);

        if(discriminators.length == 0) {
            this.setQueryDocumentDiscriminator = <any>(function() { /*noop*/ });
            return;
        }

        var discriminator: any;

        if(discriminators.length == 1) {
            discriminator = discriminators[0];
        }
        else {
            discriminator = {
                '$in': discriminators
            }
        }

        obj[this.inheritanceRoot.discriminatorField] = discriminator;

        // TODO: escape discriminatorField
        this.setQueryDocumentDiscriminator = <any>(new Function("o", "o['" + this.inheritanceRoot.discriminatorField + "'] = " + JSON.stringify(discriminator)));
    }

    setDocumentDiscriminator(obj: any): void {

        if(this.discriminatorValue === undefined) {
            this.setDocumentDiscriminator = <any>(function() { /*noop*/ });
            return;
        }

        // TODO: escape discriminatorField and discriminatorValue
        this.setDocumentDiscriminator = <any>(new Function("o", "o['" + this.inheritanceRoot.discriminatorField + "'] = \"" + this.discriminatorValue + "\""));
        obj[this.inheritanceRoot.discriminatorField] = this.discriminatorValue;
    }

    getDocumentDiscriminator(obj: any): string {

        // TODO: escape discriminatorField
        this.getDocumentDiscriminator = <any>(new Function("o", "return o['" + this.inheritanceRoot.discriminatorField + "']"));
        return obj[this.inheritanceRoot.discriminatorField]
    }

    private _getDescendantDiscriminators(discriminators: string[]): void {

        if (this.discriminatorValue) {
            discriminators.push(this.discriminatorValue);
        }

        var subclasses = this._subclasses;
        if (subclasses) {
            for (var i = 0; i < subclasses.length; i++) {
                var discriminatorValue = subclasses[i].discriminatorValue;
                if(discriminatorValue) {
                    discriminators.push(discriminatorValue);
                }
            }
        }
    }

    get hasSubClasses(): boolean {
        return this._subclasses && this._subclasses.length > 0;
    }

    get hasBaseClass(): boolean {
        return this._baseClass !== undefined;
    }

    private _addSubClass(subclass: ClassMapping): void {

        if(!this._subclasses) {
            this._subclasses = [];
        }
        this._subclasses.push(subclass);
    }

    private _addDiscriminatorMapping(value: string, mapping: ClassMapping): void {

        if(!this._discriminatorMap) {
            this._discriminatorMap = new Map();
        }

        if(this._discriminatorMap.has(value)) {
            throw new Error("There is already a class in this inheritance hierarchy with a discriminator value of '" + value + "'.");
        }

        this._discriminatorMap.set(value, mapping);
    }

    private _ensureRegistry(): MappingRegistry {

        if(!this._registry) {
            this._registry = new MappingRegistry();
            // add this mapping to the registry then add subclasses
            this._registry.addMapping(this);
            if(this._subclasses) {
                var subclasses = this._subclasses;
                for (var i = 0, l = subclasses.length; i < l; i++) {
                    this._registry.addMapping(subclasses[i]);
                }
            }
        }

        return this._registry;
    }

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        var mapping = this.inheritanceRoot.getMapping(context, value);
        if (mapping) {
            return mapping.readClass(context, value);
        }
    }

    /**
     * Gets the mapping for the specified document. Note that this method can only be called on an inheritance root.
     * @param document The document.
     * @param path The current path. Used for error reporting.
     * @param errors An array of reported errors.
     */
    getMapping(context: ReadContext, document: any): ClassMapping {

        var mapping = this._getMappingForDocument(document);
        if(mapping === undefined) {
            context.addError("Unknown discriminator value '" + this.getDocumentDiscriminator(document) + "'.");
            return;
        }

        return mapping;
    }

    private _getMappingForDocument(document: any): ClassMapping {

        var discriminatorValue = this.getDocumentDiscriminator(document);
        return discriminatorValue === undefined ? this : this.inheritanceRoot._discriminatorMap.get(discriminatorValue);
    }

    protected readClass(context: ReadContext, value: any): any {

        return this.readObject(context, Object.create(this.classConstructor.prototype), value, /*checkRemoved*/ false);
    }

    write(value: any, path: string, errors: MappingError[], visited: any[]): any {

        if(value == null) return null;

        // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
        // does not exist, default to current mapping.
        var mapping = this._ensureRegistry().getMappingForObject(value);
        return (mapping || this).writeClass(value, path, errors, visited, !!mapping);
    }

    protected writeClass(value: any, path: string, errors: MappingError[], visited: any[], mappedConstructor: boolean): any {

        var document: any = {};

        // If the constructor is not mapped then we should be writing a query document
        if(mappedConstructor) {
            this.setDocumentDiscriminator(document);
        }
        else {
            this.setQueryDocumentDiscriminator(document);
        }

        return this.writeObject(document, value, path, errors, visited);
    }

    areEqual(documentValue1: any, documentValue2: any): boolean {

        if(documentValue1 === documentValue2) return true;
        if(documentValue1 == null || documentValue2 == null) return false;

        var mapping1 = this._getMappingForDocument(documentValue1);
        var mapping2 = this._getMappingForDocument(documentValue2);

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

        if (!value || typeof value !== "object") return;

        return (this._ensureRegistry().getMappingForObject(value) || this)._walk(session, value, flags, entities, embedded, references);
    }

    private _walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void {
        super.walk(session, value, flags, entities, embedded, references);
    }

    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {
        if (!value || typeof value !== "object") {
            return callback(null, value);
        }

        return (this._ensureRegistry().getMappingForObject(value) || this)._fetch(session, parentEntity, value, path, depth, callback);
    }

    private _fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void {
        super.fetch(session, parentEntity, value, path, depth, callback);
    }

}
