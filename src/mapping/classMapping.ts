import Map = require("../core/map");
import MappingError = require("./mappingError");
import ObjectMapping = require("./objectMapping");
import MappingRegistry = require("./mappingRegistry");
import MappingFlags = require("./mappingFlags");
import Changes = require("./changes");

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


    read(value: any, path: string, errors: MappingError[]): any {

        var root = this.inheritanceRoot;

        var discriminatorValue = value[root.discriminatorField];
        if(discriminatorValue === undefined) {
            errors.push({ message: "Expected discriminator field '" + root.discriminatorField + "'.", path: path, value: value });
            return;
        }

        var mapping = root._discriminatorMap[discriminatorValue];
        if(mapping === undefined) {
            errors.push({ message: "Unknown discriminator value '" + discriminatorValue + "'.", path: path, value: value });
            return;
        }

        return mapping.readClass(value, path, errors);
    }

    protected readClass(value: any, path: string, errors: MappingError[]): any {

        return this.readObject(Object.create(this.classConstructor.prototype), value, path, errors);
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

        // Object may be a subclass of the class whose type was passed, so retrieve mapping for the object. If it
        // does not exist, default to current mapping.
        (this.registry.getMappingForObject(objectValue) || this).compareClass(objectValue, documentValue, changes, path);
    }

    protected compareClass(objectValue: any, documentValue: any, changes: Changes, path: string): void {

        super.compare(objectValue, documentValue, changes, path);
    }

}

export = ClassMapping;