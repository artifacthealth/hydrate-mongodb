import {MappingBuilder} from "./mappingBuilder";
import {Configuration} from "../../config/configuration";
import {MappingModel} from "../mappingModel";
import {
    ConverterAnnotation,
    IndexAnnotation,
    ReferenceManyAnnotation,
    ReferenceOneAnnotation,
    EmbedManyAnnotation,
    EmbedOneAnnotation,
    FieldAnnotation,
    EnumeratedAnnotation
} from "./annotations";
import {PropertyFlags} from "../propertyFlags";
import {MappingFlags} from "../mappingFlags";
import {Type} from "../../core/type";
import {Symbol} from "../../core/symbol";
import {Constructor} from "../../core/constructor";
import {EnumType} from "../enumType";
import {Index} from "../index";
import {IdentityMapping} from "../identityMapping";

export class ObjectMappingBuilder extends MappingBuilder {

    protected populateCore(): void {

        this._processType(this.type);
    }

    private _processType(type: Type): void {

        var mapping = <MappingModel.ObjectMapping>this.mapping;

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

        // The mapping should hold properties from base types as well so process those types
        if(type.baseType) {
            this._processType(type.baseType);
        }
    }

    private _createProperty(symbol: Symbol): MappingModel.Property {

        var propertyMapping = this._createPropertyMapping(symbol);
        if(!propertyMapping) {
            return null;
        }

        var property = MappingModel.createProperty(symbol.name, propertyMapping);

        // process all property annotations
        var annotations = symbol.getAnnotations(),
            indexAnnotations: IndexAnnotation[];

        for (var i = 0, l = annotations.length; i < l; i++) {
            var annotation = this.context.currentAnnotation = annotations[i];

            switch (annotation.constructor.name) {

                case "ReferenceManyAnnotation":
                    this._setReferenced(property, <ReferenceManyAnnotation>annotation);
                    break;
                case "ReferenceOneAnnotation":
                    this._setReferenced(property, <ReferenceOneAnnotation>annotation);
                    break;
                case "FieldAnnotation":
                    this._setField(property, <FieldAnnotation>annotation);
                    break;
                case "IndexAnnotation":
                    // queue up index annotations until after all annotations are processed and default mappings
                    // are applied because we may not know the field name yet.
                    (indexAnnotations || (indexAnnotations = [])).push(<IndexAnnotation>annotation);
                    break;
                case "IdAnnotation":
                    this._setIdentity(property);
                    break;
            }
        }
        this.context.currentAnnotation = null;

        // add default values
        if(!property.field && !(property.flags & PropertyFlags.Ignored)) {
            property.field = this.context.config.fieldNamingStrategy(property.name);
        }

        // after all annotations are processed and default mappings are set, add any property indexes
        if(indexAnnotations) {
            for (var i = 0, l = indexAnnotations.length; i < l; i++) {
                var indexAnnotation = this.context.currentAnnotation = indexAnnotations[i];
                // TODO: what if it's not an object mapping? somehow this needs to be moved to the EntityMappingBuilder
                this._addPropertyIndex(<MappingModel.EntityMapping>this.mapping, property, indexAnnotation);
            }
        }
        this.context.currentAnnotation = null;

        return property;
    }

    private _createPropertyMapping(symbol: Symbol): MappingModel.Mapping {

        if(symbol.hasAnnotation(ConverterAnnotation)) {
            return symbol.getAnnotations(ConverterAnnotation)[0].createMapping(this.context);
        }

        var propertyType = this._getPropertyType(symbol);
        if(!propertyType) {
            this.context.addError("Unable to determine type of property. This may be because of a circular reference or the type is used before it is defined. Try adding @EmbedOne or @ReferenceOne annotation with the name of the class as the target.");
            return;
        }

        if(symbol.hasAnnotation(EnumeratedAnnotation)) {
            return this._createEnumMapping(propertyType, symbol.getAnnotations(EnumeratedAnnotation)[0]);
        }

        var referencedAnnotation = symbol.getAnnotations(ReferenceManyAnnotation)[0];
        if(referencedAnnotation) {
            if(!referencedAnnotation.target) {
                this.context.addError("Unable to determine type of target. This may be because of a circular reference or the type is used before it is defined. Try changing target to name of class .");
                return;
            }

            var mapping = this._getMapping(referencedAnnotation.target);
            if(!mapping) return;

            if(!(mapping.flags & MappingFlags.Entity)) {
                this.context.addError("Target of @ReferenceMany annotation must be an Entity.");
                return;
            }

            if(!propertyType.isIterable) {
                this.context.addError("Properties annotated @ReferenceMany must have a type that is iterable.");
            }

            return this._createCollectionMapping(propertyType, mapping);
        }

        var embeddedAnnotation = symbol.getAnnotations(EmbedManyAnnotation)[0];
        if(embeddedAnnotation) {
            if(!embeddedAnnotation.target) {
                this.context.addError("Unable to determine type of target. This may be because of a circular reference or the type is used before it is defined. Try changing target to name of class.");
                return;
            }

            var mapping = this._getMapping(embeddedAnnotation.target);
            if(!mapping) return;

            if(!(mapping.flags & (MappingFlags.Embeddable | MappingFlags.Boolean | MappingFlags.String | MappingFlags.Number | MappingFlags.Enum | MappingFlags.RegExp | MappingFlags.Date | MappingFlags.Buffer))) {
                this.context.addError("Target of @EmbedMany annotation must be a built-in type or a class annotated with @Embeddable.");
                return;
            }

            if(!propertyType.isIterable) {
                this.context.addError("Properties annotated @EmbedMany must have a type that is iterable.");
            }

            return this._createCollectionMapping(propertyType, mapping);
        }

        if(propertyType.isArray) {
            this.context.addError("Properties with array types must be annotated with @ReferenceMany or @EmbedMany.");
            return;
        }

        return this._getMapping(propertyType);
    }

    private _createCollectionMapping(propertyType: Type, mapping: MappingModel.Mapping): MappingModel.Mapping {

        if(propertyType.isArray) {
            return MappingModel.createArrayMapping(mapping);
        }

        return MappingModel.createIterableMapping(propertyType.ctr, mapping);
    }

    private _getPropertyType(symbol: Symbol): Type {

        // Check to see if type is specified by an annotation
        var target: Constructor<any> | string;

        var referencedAnnotation = symbol.getAnnotations(ReferenceOneAnnotation)[0];
        if(referencedAnnotation) {
            target = referencedAnnotation.target;
        }
        else {
            var embeddedAnnotation = symbol.getAnnotations(EmbedOneAnnotation)[0];
            if (embeddedAnnotation) {
                target = embeddedAnnotation.target;
            }
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
        enumMapping.type = EnumType.String;

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

    private _setReferenced(property: MappingModel.Property, annotation: ReferenceManyAnnotation): void {

        if(annotation.inverseOf) {
            // TODO: validate inverse relationship
            property.inverseOf = annotation.inverseOf;
            property.setFlags(PropertyFlags.InverseSide);
        }

        if(annotation.cascade) {
            property.setFlags(annotation.cascade & PropertyFlags.CascadeAll);
        }
    }

    private _setField(property: MappingModel.Property, annotation: FieldAnnotation): void {

        if(annotation.name) {
            property.field = annotation.name;
        }
        if(annotation.nullable) {
            property.setFlags(PropertyFlags.Nullable);
        }
    }

    private _setIdentity(property: MappingModel.Property): void {

        if(!this._assertEntityMapping(this.mapping)) return;

        property.setFlags(PropertyFlags.ReadOnly);
        property.field = "_id";
        property.mapping = new IdentityMapping();
    }

    private _addPropertyIndex(mapping: MappingModel.EntityMapping, property: MappingModel.Property, value: IndexAnnotation): void {

        // TODO: allow indexes in embedded types and map to containing root type
        if(!this._assertEntityMapping(mapping)) return;

        var keys: [string, number][] = [];

        var order: number;
        if(value.order !== undefined) {
            order = value.order;
            if(order != 1 && order != -1) {
                this.context.addError("Valid values for property 'order' are 1 or -1.");
                return;
            }
            // TODO: 'order' property should not be passed in options object. When we validate options in the future, this will throw an error.
            // However, we can't just delete it from the project because then that removes it from the annotation as well and subsequent
            // processing of the annotation would then not have the order value. Instead we should copy properties from the annotation value
            // to the index options.
        }
        else {
            order = 1;
        }
        keys.push([property.field, order]);

        this._addIndex(mapping, {
            keys: keys,
            options: value.options
        });
    }

    // TODO: Fix where this goes
    protected _assertEntityMapping(mapping: MappingModel.Mapping): boolean {

        if(!(mapping.flags & MappingFlags.Entity)) {
            this.context.addError("Annotation can only be defined on entities.");
            return false;
        }
        return true;
    }

    // TODO: code should be shared with entity mapping
    protected _addIndex(mapping: MappingModel.EntityMapping, value: Index): void {

        // TODO: allow indexes in embedded types and map to containing root type
        if(this._assertEntityMapping(mapping)) {

            if (!value.keys) {
                this.context.addError("Missing require property 'keys'.");
                return;
            }

            // TODO: validate index options

            // TODO: validate index keys
            mapping.addIndex(value);
        }
    }

}