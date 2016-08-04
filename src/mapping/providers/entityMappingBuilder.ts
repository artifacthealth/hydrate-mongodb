import {ClassMappingBuilder} from "./classMappingBuilder";
import {MappingModel} from "../mappingModel";

/**
 * @hidden
 */
export class EntityMappingBuilder extends ClassMappingBuilder {

    protected populateCore(): void {

        super.populateCore();

        // add default values
        var mapping = <MappingModel.EntityMapping>this.mapping;
        if (mapping.hasFlags(MappingModel.MappingFlags.InheritanceRoot)) {

            if(mapping.versioned == null) {
                mapping.versioned = this.context.config.versioned;
            }

            if (mapping.versionField == null) {
                mapping.versionField = this.context.config.versionField;
            }

            if (mapping.changeTracking == null) {
                mapping.changeTracking = this.context.config.changeTracking;
            }

            if (mapping.collectionName == null) {
                mapping.collectionName = this.context.config.collectionNamingStrategy(mapping.name);
            }

            if (this.context.config.collectionPrefix) {
                mapping.collectionName = this.context.config.collectionPrefix + mapping.collectionName;
            }

            if (mapping.identity == null) {
                mapping.identity = this.context.config.identityGenerator;
            }

            // if versioning is enabled then add an index for the _id that includes the version
            if (mapping.versioned) {
                mapping.addIndex({ keys: [["_id", 1], [mapping.versionField, 1]] });
            }
        }
    }
}

