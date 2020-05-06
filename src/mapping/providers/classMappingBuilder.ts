import {ObjectMappingBuilder} from "./objectMappingBuilder";
import {MappingModel} from "../mappingModel";

/**
 * @hidden
 */
export class ClassMappingBuilder extends ObjectMappingBuilder {

    protected constructCore(): void {

        var mapping = <MappingModel.ClassMapping>this.mapping;

        mapping.name = this.type.name;
        mapping.classConstructor = <any>this.type.ctr;

        super.constructCore();

        // add default values
        if (mapping.flags & MappingModel.MappingFlags.InheritanceRoot) {
            if (!mapping.discriminatorField) {
                mapping.discriminatorField = this.context.config.discriminatorField;
            }
        }

        // if we are a document type and the the discriminatorValue is not set, default to the class name
        if (!mapping.discriminatorValue  && (mapping.hasBaseClass || mapping.hasSubClasses)) {
            mapping.setDiscriminatorValue(this.context.config.discriminatorNamingStrategy(mapping.name));
        }
    }
}

