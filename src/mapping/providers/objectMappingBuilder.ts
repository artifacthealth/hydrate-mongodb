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
import ClassMapping = MappingModel.ClassMapping;


/**
 * @hidden
 */
export class ObjectMappingBuilder extends MappingBuilder {

    protected populateCore(): void {

        var mapping = <MappingModel.ObjectMapping>this.mapping;
        var annotations = this.type.getAnnotations();

        if (mapping.hasFlags(MappingModel.MappingFlags.InheritanceRoot)) {
            // concat the arrays, don't push onto the array because it'll change the type annotations
            annotations = annotations.concat(this._getInheritedAnnotations(this.type.baseType));
        }

        for(var i = 0, l = annotations.length; i < l; i++) {
            var annotation = this.context.currentAnnotation = annotations[i];
            if(annotation.processClassAnnotation) {
                (<ClassAnnotation>annotation).processClassAnnotation(this.context, mapping, annotation);
            }
        }

        this.context.currentAnnotation = null;

        this._processType(this.type);
    }

    private _getInheritedAnnotations(type: Type): any[] {

        var result: any[] = [],
            oldType = this.context.currentType;

        while (type) {
            var annotations = type.getAnnotations();
            for (var i = 0; i < annotations.length; i++) {
                var annotation = annotations[i];
                if(annotation.processClassAnnotation) {
                    if (annotation.inherited) {
                        result.push(annotation);
                    }
                    else {
                        this.context.currentType = type;
                        this.context.currentAnnotation = annotation;
                        this.context.addError("Annotation cannot be defined on a mapped superclass.");
                    }
                }
            }
            type = type.baseType;
        }

        this.context.currentType = oldType;
        return result;
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

                // set default value for `nullable` if not specified
                if (property.nullable === undefined) {
                    property.nullable = this.context.config.nullable;
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
        if (!propertyMapping) {
            return null;
        }

        var property = MappingModel.createProperty(symbol.name, propertyMapping);

        // add default field value
        property.field = this.context.config.fieldNamingStrategy(property.name);

        // process all property annotations
        var annotations = symbol.getAnnotations();
        if (Array.isArray(annotations)) {

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

        var typeName;
        if (type) {
            typeName = type.name;
        }
        else if (typeof target === "string") {
            typeName = target;
        }
        else if (typeof target === "function") {
            typeName = target.name;
        }
        else {
            typeName = "unknown";
        }

        this.context.addError("Unable to determine mapping for '" + typeName + "'."
            + " Has the type been added to the AnnotationMappingProvider?");
    }
}