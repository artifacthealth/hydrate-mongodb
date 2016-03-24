import {ClassMappingBuilder} from "./classMappingBuilder";
import {Type, Property} from "reflect-helper";
import {MappingModel} from "../mappingModel";
import {
    EntityAnnotation,
    CollectionAnnotation,
    IndexAnnotation,
    VersionFieldAnnotation,
    VersionedAnnotation,
    ChangeTrackingAnnotation
} from "./annotations";
import {Index} from "../index";
import {Annotation} from "./annotations";

/**
 * @hidden
 */
export class EntityMappingBuilder extends ClassMappingBuilder {

    protected populateCore(): void {

        super.populateCore();

        // add default values
        var mapping = <MappingModel.EntityMapping>this.mapping;
        if (mapping.flags & MappingModel.MappingFlags.InheritanceRoot) {

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

            if(mapping.identity == null) {
                mapping.identity = this.context.config.identityGenerator;
            }
        }
    }
}

