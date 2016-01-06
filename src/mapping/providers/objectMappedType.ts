import {MappedType} from "./mappedType";
import {Configuration} from "../../config/configuration";
import {Mapping} from "../mapping";
import {
    EntityAnnotation,
    EmbeddableAnnotation,
    ConverterAnnotation,
    CollectionAnnotation,
    IndexAnnotation,
    VersionFieldAnnotation,
    VersionedAnnotation,
    ChangeTrackingAnnotation,
    DiscriminatorFieldAnnotation,
    DiscriminatorValueAnnotation,
    TransientAnnotation,
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

export class ObjectMappedType extends MappedType {

    protected populateCore(): void {

        this._processType(this.type);
    }

    private _processType(type: Type): void {

        for(var symbol of type.properties) {

            try {
                var property = this._createProperty(symbol);
                if(property) {
                    // add to mapping after property has been fully initialized
                    (<Mapping.ObjectMapping>this.mapping).addProperty(property);
                }
            }
            catch(e) {
                this.context.addError("Invalid property '" + symbol.name + "' on type '" + type.name + "': " + e.message);
                return;
            }
        }

        // The mapping should hold properties from base types as well so process those types
        if(type.baseType) {
            this._processType(type.baseType);
        }
    }

    private _createProperty(symbol: Symbol): Mapping.Property {

        try {
            var propertyMapping = this._createPropertyMapping(symbol);
        }
        catch(e) {
            this.context.addError("Error creating property '" + symbol.name + "' of type '" + symbol.parent.name + "': " + e.message);
            return null;
        }

        var property = Mapping.createProperty(symbol.name, propertyMapping);

        // process all property annotations
        var annotations = symbol.getAnnotations(),
            indexAnnotations: IndexAnnotation[];

        try {
            for (var i = 0, l = annotations.length; i < l; i++) {
                var annotation = annotations[i];

                switch (annotation.constructor.name) {
                    // TODO: Confirm that the Transient annotation is no longer needed
                    /*
                     case "transient":
                     property.setFlags(PropertyFlags.Ignored);
                     break;
                     */
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
                }
            }
        }
        catch (e) {
            this.context.addPropertyAnnotationError(symbol, annotation, e.message);
        }

        // add default values
        if(!property.field && !(property.flags & PropertyFlags.Ignored)) {
            property.field = this.context.config.fieldNamingStrategy(property.name);
        }

        // after all annotations are processed and default mappings are set, add any property indexes
        if(indexAnnotations) {
            try {
                for (var i = 0, l = indexAnnotations.length; i < l; i++) {
                    var indexAnnotation = indexAnnotations[i];
                    // TODO: what if it's not an object mapping? somehow this needs to be moved to the EntityMappedType
                    this._addPropertyIndex(<Mapping.EntityMapping>this.mapping, property, indexAnnotations[i]);
                }
            }
            catch (e) {
                this.context.addPropertyAnnotationError(symbol, indexAnnotation, e.message);
            }
        }

        return property;
    }

    private _createPropertyMapping(symbol: Symbol): Mapping {

        if(symbol.hasAnnotation(ConverterAnnotation)) {
            return symbol.getAnnotations(ConverterAnnotation)[0].createConverterMapping(this.context);
        }

        var propertyType = this._getPropertyType(symbol);
        if(!propertyType) {
            throw new Error("Unable to determine type of property. This may be because of a circular reference or the type is used before it is defined. Try adding @EmbedOne or @ReferenceOne annotation with the name of the class as the target.");
        }

        if(symbol.hasAnnotation(EnumeratedAnnotation)) {
            return this._createEnumMapping(propertyType, symbol.getAnnotations(EnumeratedAnnotation)[0]);
        }

        if(propertyType.isCollection) {
            var referencedAnnotation = symbol.getAnnotations(ReferenceManyAnnotation)[0];
            if(referencedAnnotation) {
                if(!referencedAnnotation.target) {
                    throw new Error("Unable to determine type of target. This may be because of a circular reference or the type is used before it is defined. Try changing target to name of class .");
                }
                var mapping = this._getMapping(referencedAnnotation.target);
                if(!(mapping.flags & MappingFlags.Entity)) {
                    throw new Error("Target of @ReferenceMany annotation must be an Entity.");
                }
                return Mapping.createArrayMapping(mapping);
            }

            var embeddedAnnotation = symbol.getAnnotations(EmbedManyAnnotation)[0];
            if(embeddedAnnotation) {
                if(!embeddedAnnotation.target) {
                    throw new Error("Unable to determine type of target. This may be because of a circular reference or the type is used before it is defined. Try changing target to name of class.");
                }
                var mapping = this._getMapping(embeddedAnnotation.target);
                if(!(mapping.flags & (MappingFlags.Embeddable | MappingFlags.Boolean | MappingFlags.String | MappingFlags.Number | MappingFlags.Enum | MappingFlags.RegExp | MappingFlags.Date | MappingFlags.Buffer))) {
                    throw new Error("Target of @EmbedMany annotation must be a built-in type or a class annotated with @Embeddable.");
                }
                return Mapping.createArrayMapping(mapping);
            }

            throw new Error("Properties with array types must be annotated with @ReferenceMany or @EmbedMany.");
        }

        return this._getMapping(propertyType);
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

    private _createEnumMapping(type: Type, annotation: EnumeratedAnnotation): Mapping {

        if(!type.isNumber) {
            throw new Error("Cannot use @Enumerated annotation on a non-numeric field.");
        }

        var members: { [name: string]: number } = {};

        // Pull the name => number side out of the enum since that is what the EnumMappingImpl expects.
        for(var name in annotation.members) {
            if(typeof name === "string" && annotation.members.hasOwnProperty(name)) {
                members[name] = (<any>annotation.members)[name];
            }
        }

        var enumMapping = Mapping.createEnumMapping(members);
        enumMapping.type = EnumType.String;

        return enumMapping;
    }

    private _getMapping(target: Type | Constructor<any> | string): Mapping {

        var type: Type;

        if(typeof target === "string" || typeof target === "function") {
            type = this.context.getType(<(Constructor<any> | string)>target);
        }
        else {
            type = <Type>target;
        }

        var mappedType = this.context.getMappedType(type);
        if(mappedType && mappedType.mapping) {
            return mappedType.mapping;
        }

        throw new Error("Unable to create mapping for '" + type.name + "'.");
    }

    private _setReferenced(property: Mapping.Property, annotation: ReferenceManyAnnotation): void {

        if(annotation.inverseOf) {
            // TODO: validate inverse relationship
            property.inverseOf = annotation.inverseOf;
            property.setFlags(PropertyFlags.InverseSide);
        }

        if(annotation.cascade) {
            property.setFlags(annotation.cascade & PropertyFlags.CascadeAll);
        }
    }

    private _setField(property: Mapping.Property, annotation: FieldAnnotation): void {

        if(annotation.name) {
            property.field = annotation.name;
        }
        if(annotation.nullable) {
            property.setFlags(PropertyFlags.Nullable);
        }
    }

    private _addPropertyIndex(mapping: Mapping.EntityMapping, property: Mapping.Property, value: IndexAnnotation): void {

        // TODO: allow indexes in embedded types and map to containing root type
        this._assertEntityMapping(mapping);

        var keys: [string, number][] = [];

        var order: number;
        if(value.order !== undefined) {
            order = value.order;
            if(order != 1 && order != -1) {
                throw new Error("Valid values for property 'order' are 1 or -1.");
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
    protected _assertEntityMapping(mapping: Mapping): void {

        if(!(mapping.flags & MappingFlags.Entity)) {
            throw new Error("Annotation can only be defined on entities.");
        }
    }

    // TODO: code shoudl be shared with entity mapping
    protected _addIndex(mapping: Mapping.EntityMapping, value: Index): void {

        // TODO: allow indexes in embedded types and map to containing root type
        this._assertEntityMapping(mapping);

        if(!value.keys) {
            throw new Error("Missing require property 'keys'.");
        }

        // TODO: validate index options

        // TODO: validate index keys
        mapping.addIndex(value);
    }

}