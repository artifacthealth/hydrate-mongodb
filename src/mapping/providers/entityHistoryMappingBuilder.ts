import {ChangeTrackingType, MappingModel} from "../mappingModel";
import {MappingBuilderContext} from "./mappingBuilderContext";
import {MappingBuilder} from "./mappingBuilder";
import {Type} from "reflect-helper";

/**
 * @hidden
 */
export class EntityHistoryMappingBuilder extends MappingBuilder {

    private _entityType: Type;

    constructor(context: MappingBuilderContext, mapping: MappingModel.Mapping, entityType: Type) {
        super(context, mapping, entityType.name + context.config.historySuffix);

        this._entityType = entityType;
    }

    protected constructCore(): void {

        var mapping = <MappingModel.EntityMapping>this.mapping;

        mapping.name = this.name;
        mapping.classConstructor = createConstructor(mapping.name);

        // add inheritance root values
        if (mapping.flags & MappingModel.MappingFlags.InheritanceRoot) {

            mapping.discriminatorField = this.context.config.discriminatorField;
            mapping.versioned = false;
            mapping.changeTracking = ChangeTrackingType.None;
            mapping.collectionName = this.context.config.collectionNamingStrategy(mapping.name);
            mapping.historyEntityProperty = this.context.config.historyEntityProperty;
            mapping.historyVersionProperty = this.context.config.historyVersionProperty;
            mapping.historyEntityField = this.context.config.fieldNamingStrategy(mapping.historyEntityProperty);
            mapping.historyVersionField = this.context.config.fieldNamingStrategy(mapping.historyVersionProperty);

            mapping.identity = this.context.config.identityGenerator;

            if (this.context.config.collectionPrefix) {
                mapping.collectionName = this.context.config.collectionPrefix + mapping.collectionName;
            }

            mapping.addIndex({ keys: [[mapping.historyEntityProperty, 1], [mapping.historyVersionProperty, -1]] });
        }

        // if we are a document type and the the discriminatorValue is not set, default to the class name
        if (!mapping.discriminatorValue  && (mapping.hasBaseClass || mapping.hasSubClasses)) {
            mapping.setDiscriminatorValue(this.context.config.discriminatorNamingStrategy(mapping.name));
        }

        var entityMapping = <MappingModel.EntityMapping>this.context.getMapping(this._entityType);
        if (!entityMapping) {
            this.context.addError(`Could not get entity mapping for type '${this._entityType.name}'.`);
            return;
        }

        // flush the entity history before the entity
        mapping.flushPriority = entityMapping.flushPriority + 1;
    }

    protected populateCore(): void {

        var mapping = <MappingModel.EntityMapping>this.mapping;

        var entityMapping = <MappingModel.EntityMapping>this.context.getMapping(this._entityType);
        if (!entityMapping) {
            this.context.addError(`Could not get entity mapping for type '${this._entityType.name}'.`);
            return;
        }

        // make sure that the entity that we are tracking history for is versioned
        if (!entityMapping.versioned) {
            this.context.addError(`Cannot track history on '${entityMapping.name}' which is not versioned.`);
            return;
        }

        // add all properties from the entity mapping to the entity history mapping
        entityMapping.properties.forEach(property => {
            if (!property.hasFlags(MappingModel.PropertyFlags.DoNotTrackHistory)) {
                mapping.addProperty(property)
            }
        });

        // add additional properties
        this._addProperty(mapping.historyEntityProperty, mapping.historyEntityField, entityMapping);
        this._addProperty(mapping.historyVersionProperty, mapping.historyVersionField, this.context.getMapping("Number"));
    }

    private _addProperty(name: string, field: string, mapping: MappingModel.Mapping): void {

        var property = MappingModel.createProperty(name, mapping);
        property.field = field;
        (<MappingModel.EntityMapping>this.mapping).addProperty(property);
    }
}

function createConstructor(className: string): Function {

    return new Function("return function " + className + "(){ return this; }")();
}
