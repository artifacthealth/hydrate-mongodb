import {PropertyConverter} from "../propertyConverter";
import {CollectionOptions} from "../collectionOptions";
import {IndexOptions} from "../indexOptions";
import {ChangeTrackingType} from "../changeTrackingType";
import {EnumType} from "../enumType";
import {CascadeFlags} from "../cascadeFlags";
import {Constructor} from "../../core/constructor";

export class EntityAnnotation {

}

export class EmbeddableAnnotation {

}

export class ConverterAnnotation {

    converter: PropertyConverter;
    converterName: string;

    /**
     * Constructs a ConverterAnnotation object.
     * @param converter The name or instance of the PropertyConverter to apply to the property.
     */
    constructor(converter: string | PropertyConverter) {

        if(typeof converter === "string") {
            this.converterName = converter;
        }
        else {
            this.converter = converter;
        }
    }
}

export class CollectionAnnotation {

    /**
     * The name of the collection to use.
     */
    name: string;

    /**
     * The name of the database to use.
     */
    db: string;

    /**
     * Collection options to pass to driver.
     */
    options: CollectionOptions;

    constructor(name: string);
    constructor(args?: { name?: string; db?: string, options?: CollectionOptions; });
    constructor(nameOrArgs?: string | { name?: string; db?: string, options?: CollectionOptions; }) {

        if(typeof nameOrArgs === "string") {
            this.name = nameOrArgs;
        }

        if(typeof nameOrArgs === "object") {
            this.name = nameOrArgs.name;
            this.db = nameOrArgs.db;
            this.options = nameOrArgs.options;
        }
    }
}

export class IndexAnnotation {

    /**
     * The index keys as an array of tuples [name, 1|-1] if the annotation is specified on a class.
     */
    keys: [string, number][];

    /**
     * The order of the index if annotation is specified on a property.
     */
    order: number;

    /**
     * Index options to pass to the driver.
     */
    options: IndexOptions;

    constructor(args: { keys: [string, number][]; options?: IndexOptions; });
    constructor(args?: { order?: number; options?: IndexOptions; });
    constructor(args?: { keys?: [string, number][]; order?: number, options?: IndexOptions }) {

        if(args) {
            this.keys = args.keys;
            this.order = args.order;
            this.options = args.options;
        }
    }
}

export class VersionFieldAnnotation {

    /**
     * Constructs a VersionFieldAnnotation object.
     * @param name The name of the document field to use for versioning.
     */
    constructor(public name: string) {

    }
}

export class VersionedAnnotation {

    /**
     * Constructs a VersionedAnnotation object.
     * @param enabled Indicates if versioning is enabled. Default is true.
     */
    constructor(public enabled: boolean = true) {

    }
}

export class ChangeTrackingAnnotation {

    constructor(public type: ChangeTrackingType) {

    }
}

export class DiscriminatorFieldAnnotation {

    constructor(public name: string) {

    }
}

export class DiscriminatorValueAnnotation {

    constructor(public value: string) {

    }
}

export class TransientAnnotation {

}

export class ReferenceAnnotation {

    inverseOf: string;
    cascade: CascadeFlags;

    constructor(args?: { inverseOf?: string, cascade?: CascadeFlags }) {

        if(args) {
            this.inverseOf = args.inverseOf;
            this.cascade = args.cascade;
        }
    }
}

export class ReferenceManyAnnotation {

    target: Constructor<any>;
    inverseOf: string;
    cascade: CascadeFlags;

    constructor(target: Constructor<any>);
    constructor(args: { target: Constructor<any>, inverseOf?: string, cascade?: CascadeFlags });
    constructor(args: any) {

        if(args) {
            if (typeof args === "function") {
                this.target = args;
            }
            else {
                this.target = args.target;
                this.inverseOf = args.inverseOf;
                this.cascade = args.cascade;
            }
        }
    }
}

export class EmbedManyAnnotation {

    constructor(public target: Constructor<any>) {

    }
}

export class FieldAnnotation {

    name: string;
    nullable: boolean;

    constructor(args?: { name?: string, nullable?: boolean }) {

        if(args) {
            this.name = args.name;
            this.nullable = args.nullable;
        }
    }
}

/**
 * Indicates the element type of a collection, such as an Array.
 */
    /*
export class CollectionAnnotation {

    constructor(public elementType: Object) {

        if(!elementType) {
            throw new Error("Missing required argument 'elementType'.");
        }
    }
}
*/
export class EnumeratedAnnotation {

    constructor(public members: Object) {

    }
}