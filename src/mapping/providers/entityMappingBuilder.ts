import {ClassMappingBuilder} from "./classMappingBuilder";
import {MappingModel} from "../mappingModel";
import {
    EntityAnnotation,
    CollectionAnnotation,
    IndexAnnotation,
    VersionFieldAnnotation,
    VersionedAnnotation,
    ChangeTrackingAnnotation
} from "./annotations";
import {MappingFlags} from "../mappingFlags";
import {Index} from "../index";

export class EntityMappingBuilder extends ClassMappingBuilder {

    protected populateCore(): void {

        var mapping = <MappingModel.EntityMapping>this.mapping;

        // get type level annotations
        var annotations = this.type.getAnnotations();
        for(var i = 0, l = annotations.length; i < l; i++) {
            var annotation = this.context.currentAnnotation = annotations[i];

            switch (annotation.constructor.name) {
                case "CollectionAnnotation":
                    this._setCollection(mapping, <CollectionAnnotation>annotation);
                    break;
                case "IndexAnnotation":
                    this._addIndex(mapping, <IndexAnnotation>annotation);
                    break;
                case "VersionFieldAnnotation":
                    this._setVersionField(mapping, <VersionFieldAnnotation>annotation);
                    break;
                case "VersionedAnnotation":
                    this._setVersioned(mapping, <VersionedAnnotation>annotation);
                    break;
                case "ChangeTrackingAnnotation":
                    this._setChangeTracking(mapping, <ChangeTrackingAnnotation>annotation);
                    break;
            }
        }

        super.populateCore();

        // add default values
        if (mapping.flags & MappingFlags.InheritanceRoot) {

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

    private _setCollection(mapping: MappingModel.EntityMapping, value: CollectionAnnotation): void {

        if(this._assertRootEntityMapping(mapping)) {

            if (value.name) {
                mapping.collectionName = value.name;
            }

            mapping.collectionOptions = value.options;
            // TODO: validate options

            if (value.db) {
                mapping.databaseName = value.db;
            }
        }
    }

    private _setVersioned(mapping: MappingModel.EntityMapping, annotation: VersionedAnnotation): void {

        if(this._assertRootEntityMapping(mapping)) {

            mapping.versioned = annotation.enabled;
        }
    }

    private _setVersionField(mapping: MappingModel.EntityMapping, annotation: VersionFieldAnnotation): void {

        if(this._assertRootEntityMapping(mapping)) {

            mapping.versionField = annotation.name;
            mapping.versioned = true;
        }
    }

    private _setChangeTracking(mapping: MappingModel.EntityMapping, annotation: ChangeTrackingAnnotation): void {

        if(this._assertRootEntityMapping(mapping)) {

            mapping.changeTracking = annotation.type;
        }
    }

    private _assertRootEntityMapping(mapping: MappingModel.Mapping): boolean {

        if(!this._assertEntityMapping(mapping)) return false;

        return this._assertRootClassMapping(mapping);
    }
}

