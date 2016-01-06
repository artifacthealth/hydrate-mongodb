import {ClassMappedType} from "./classMappedType";
import {Mapping} from "../mapping";
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

export class EntityMappedType extends ClassMappedType {

    protected populateCore(): void {

        var mapping = <Mapping.EntityMapping>this.mapping;

        // get type level annotations
        var annotations = this.type.getAnnotations();
        for(var i = 0, l = annotations.length; i < l; i++) {
            var annotation = annotations[i];

            try {
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
            catch(e) {
                this.context.addAnnotationError(this.type, annotation, e.message);
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

    private _setCollection(mapping: Mapping.EntityMapping, value: CollectionAnnotation): void {

        this._assertRootEntityMapping(mapping);

        if(value.name) {
            mapping.collectionName = value.name;
        }

        mapping.collectionOptions = value.options;
        // TODO: validate options

        if(value.db) {
            mapping.databaseName = value.db;
        }
    }

    private _setVersioned(mapping: Mapping.EntityMapping, annotation: VersionedAnnotation): void {

        this._assertRootEntityMapping(mapping);

        mapping.versioned = annotation.enabled;
    }

    private _setVersionField(mapping: Mapping.EntityMapping, annotation: VersionFieldAnnotation): void {

        this._assertRootEntityMapping(mapping);

        mapping.versionField = annotation.name;
        mapping.versioned = true;
    }

    private _setChangeTracking(mapping: Mapping.EntityMapping, annotation: ChangeTrackingAnnotation): void {

        this._assertRootEntityMapping(mapping);

        mapping.changeTracking = annotation.type;
    }

    private _assertRootEntityMapping(mapping: Mapping): void {

        this._assertEntityMapping(mapping);
        this._assertRootClassMapping(mapping);
    }
}

