import {ObjectMappedType} from "./objectMappedType";
import {Mapping} from "../mapping";
import {
    EntityAnnotation,
    EmbeddableAnnotation,
    DiscriminatorFieldAnnotation,
    DiscriminatorValueAnnotation,
} from "./annotations";
import {MappingFlags} from "../mappingFlags";

export class ClassMappedType extends ObjectMappedType {

    protected populateCore(): void {

        // before we populate the mapping, check to make sure that there is only one root in the hierarchy
        if(this._subclassMarkedAsRootType()) {
            let annotation = this.type.getAnnotations(EntityAnnotation)[0] || this.type.getAnnotations(EmbeddableAnnotation)[0];
            this.context.addAnnotationError(this.type, annotation, "Only one class per inheritance hierarchy can have the @Entity or @Embeddable annotation.");
            return;
        }

        var mapping = <Mapping.ClassMapping>this.mapping;

        mapping.name = this.type.name;
        mapping.classConstructor = <any>this.type.ctr;

        // get type level annotations
        var annotations = this.type.getAnnotations();
        for(var i = 0, l = annotations.length; i < l; i++) {
            var annotation = annotations[i];

            try {
                switch (annotation.constructor.name) {
                    case "DiscriminatorFieldAnnotation":
                        this._setDiscriminatorField(mapping, <DiscriminatorFieldAnnotation>annotation);
                        break;
                    case "DiscriminatorValueAnnotation":
                        this._setDiscriminatorValue(mapping, <DiscriminatorValueAnnotation>annotation);
                        break;
                }
            }
            catch(e) {
                this.context.addAnnotationError(this.type, annotation, e.message);
            }
        }

        // add default values
        if (mapping.flags & MappingFlags.InheritanceRoot) {
            if (!mapping.discriminatorField) {
                mapping.discriminatorField = this.context.config.discriminatorField;
            }
        }

        // if we are a document type and the the discriminatorValue is not set, default to the class name
        if (!mapping.discriminatorValue  && (mapping.hasBaseClass || mapping.hasSubClasses)) {
            mapping.setDiscriminatorValue(this.context.config.discriminatorNamingStrategy(mapping.name));
        }

        super.populateCore()
    }

    private _subclassMarkedAsRootType(): boolean {

        if(!this.isRoot) {
            return false;
        }

        var type = this.type.baseType;
        while(type) {
            var mappedType = <ClassMappedType>this.context.getMappedType(type);
            if(mappedType && mappedType.isRoot) {
                return true;
            }
            type = type.baseType;
        }

        return false;
    }

    private get isRoot(): boolean {

        return this.type.hasAnnotation(EntityAnnotation) || this.type.hasAnnotation(EmbeddableAnnotation);
    }

    private _setDiscriminatorField(mapping: Mapping.ClassMapping, annotation: DiscriminatorFieldAnnotation): void {

        this._assertRootClassMapping(mapping);

        mapping.discriminatorField = annotation.name;
    }

    private _setDiscriminatorValue(mapping: Mapping.ClassMapping, annotation: DiscriminatorValueAnnotation): void {

        this._assertClassMapping(mapping);

        mapping.setDiscriminatorValue(annotation.value);
    }

    private _assertClassMapping(mapping: Mapping): void {

        if(!(mapping.flags & MappingFlags.Class)) {
            throw new Error("Annotation can only be defined on class mappings.");
        }
    }

    protected _assertRootClassMapping(mapping: Mapping): void {

        this._assertClassMapping(mapping);

        var classMapping = <Mapping.ClassMapping>mapping;
        if(!(classMapping.flags & MappingFlags.InheritanceRoot)) {
            throw new Error("Annotation can only be defined on classes that are the root of a mapped inheritance hierarchy.");
        }
    }
}

