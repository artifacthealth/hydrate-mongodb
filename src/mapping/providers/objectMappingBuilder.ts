import {MappingBuilder} from "./mappingBuilder";
import {MappingModel} from "../mappingModel";
import {
    Annotation,
    ClassAnnotation,
    PropertyAnnotation,
    ConverterAnnotation,
    TypeAnnotation,
    ElementTypeAnnotation,
    EnumeratedAnnotation
} from "./annotations";
import {Type, Property} from "reflect-helper";
import {Constructor} from "../../index";
import {MethodAnnotation} from "./annotations";


/**
 * @hidden
 */
export class ObjectMappingBuilder extends MappingBuilder {

    protected populateCore(): void {

        var mapping = <MappingModel.ObjectMapping>this.mapping,
            annotations = this.type.getAnnotations();

        Annotation.sort(annotations);

        for(var i = 0, l = annotations.length; i < l; i++) {
            var annotation = this.context.currentAnnotation = annotations[i];
            if(annotation.processClassAnnotation) {
                (<ClassAnnotation>annotation).processClassAnnotation(this.context, mapping, annotation);
            }
        }

        this.context.currentAnnotation = null;

        this._processType(this.type);
    }

    private _processType(type: Type): void {

        var mapping = <MappingModel.ObjectMapping>this.mapping;

        // The mapping should hold properties from base types as well so process those types
        if(type.baseType) {
            this._processType(type.baseType);
        }

        // process properties
        for(var symbol of type.properties) {

            this.context.currentProperty = symbol;
            var property = this._createProperty(symbol);
            if(property) {
                var error = mapping.validateProperty(property);
                if(error) {
                    this.context.addError(error);
                    return;
                }

                mapping.addProperty(property);
            }
        }
        this.context.currentProperty = null;

        // process any method annotations
        for(var method of type.methods) {

            this.context.currentMethod = method;

            var annotations = method.getAnnotations();
            if(Array.isArray(annotations)) {
                Annotation.sort(annotations);

                for (var i = 0, l = annotations.length; i < l; i++) {
                    var annotation = this.context.currentAnnotation = annotations[i];
                    if (annotation.processMethodAnnotation) {
                        (<MethodAnnotation>annotation).processMethodAnnotation(this.context, <MappingModel.ObjectMapping>this.mapping, method, annotation);
                    }
                }
            }

            this.context.currentAnnotation = null;
        }
        this.context.currentMethod = null;
    }

    private _createProperty(symbol: Property): MappingModel.Property {

        var propertyMapping = this._createPropertyMapping(symbol);
        if(!propertyMapping) {
            return null;
        }

        var property = MappingModel.createProperty(symbol.name, propertyMapping);

        // add default field value
        property.field = this.context.config.fieldNamingStrategy(property.name);

        // process all property annotations
        var annotations = symbol.getAnnotations();
        if(Array.isArray(annotations)) {
            Annotation.sort(annotations);

            for (var i = 0, l = annotations.length; i < l; i++) {
                var annotation = this.context.currentAnnotation = annotations[i];
                if (annotation.processPropertyAnnotation) {
                    (<PropertyAnnotation>annotation).processPropertyAnnotation(this.context, <MappingModel.ObjectMapping>this.mapping, property, symbol, annotation);
                }
            }
            this.context.currentAnnotation = null;
        }

        return property;
    }

    private _createPropertyMapping(symbol: Property): MappingModel.Mapping {

        if(symbol.hasAnnotation(ConverterAnnotation)) {
            return symbol.getAnnotations(ConverterAnnotation)[0].createMapping(this.context);
        }

        var propertyType = this._getPropertyType(symbol);
        if(!propertyType) {
            this.context.addError("Unable to determine type of property. This may be because of a circular reference or the type is used before it is defined. Try adding the @Type decorator with the name of the class as the target.");
            return;
        }

        if(symbol.hasAnnotation(EnumeratedAnnotation)) {
            return this._createEnumMapping(propertyType, symbol.getAnnotations(EnumeratedAnnotation)[0]);
        }

        var elementTypeAnnotation = symbol.getAnnotations(ElementTypeAnnotation)[0];
        if(elementTypeAnnotation) {
            if(!elementTypeAnnotation.target) {
                this.context.addError("Unable to determine type of target. This may be because of a circular reference or the type is used before it is defined. Try changing target to name of class .");
                return;
            }

            var mapping = this._getMapping(elementTypeAnnotation.target);
            if(!mapping) return;

            if(!propertyType.isIterable) {
                this.context.addError("Properties annotated @ElementType must have a type that is iterable.");
            }

            return this._createCollectionMapping(propertyType, mapping);
        }

        if(propertyType.isArray) {
            this.context.addError("Properties with array types must be annotated with @ElementType to indicate the type of the array element.");
            return;
        }

        return this._getMapping(propertyType);
    }

    private _createCollectionMapping(propertyType: Type, mapping: MappingModel.Mapping): MappingModel.Mapping {

        if(propertyType.isArray) {
            return MappingModel.createArrayMapping(mapping);
        }

        this.context.addError("Collections other than 'Array' are not currently supported.");
        return null;
    }

    private _getPropertyType(symbol: Property): Type {

        // Check to see if type is specified by an annotation
        var target: Constructor<any> | string;

        var typeAnnotation = symbol.getAnnotations(TypeAnnotation)[0];
        if(typeAnnotation) {
            target = typeAnnotation.target;
        }

        if(target) {
            return this.context.getType(target);
        }

        // get property type from the compiler generated metadata.
        return symbol.type;
    }

    private _createEnumMapping(type: Type, annotation: EnumeratedAnnotation): MappingModel.Mapping {

        if(!type.isNumber) {
            this.context.addError("Cannot use @Enumerated annotation on a non-numeric field.");
            return;
        }

        var members: { [name: string]: number } = {};

        // Pull the name => number side out of the enum since that is what the EnumMappingImpl expects.
        for(var name in annotation.members) {
            if(typeof name === "string" && annotation.members.hasOwnProperty(name)) {
                members[name] = (<any>annotation.members)[name];
            }
        }

        var enumMapping = MappingModel.createEnumMapping(members);

        return enumMapping;
    }

    private _getMapping(target: Type | Constructor<any> | string): MappingModel.Mapping {

        var type: Type;

        if(typeof target === "string" || typeof target === "function") {
            type = this.context.getType(<(Constructor<any> | string)>target);
        }
        else {
            type = <Type>target;
        }

        var builder = this.context.getBuilder(type);
        if(builder && builder.mapping) {
            return builder.mapping;
        }

        this.context.addError("Unable to determine mapping for '" + type.name + "'.");
    }
}