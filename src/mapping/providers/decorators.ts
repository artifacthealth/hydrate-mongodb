import {makeDecorator} from "reflect-helper";
import {Constructor, ParameterlessConstructor} from "../../index";

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
    CascadeAnnotation,
    InverseOfAnnotation,
    TypeAnnotation,
    ElementTypeAnnotation,
    MapKeyAnnotation,
    FieldAnnotation,
    EnumeratedAnnotation,
    IdAnnotation,
    FieldDescription,
    CollectionDescription,
    ClassIndexDescription,
    PropertyIndexDescription,
    TransientAnnotation,
    ImmutableAnnotation
} from "./annotations";

import {PropertyConverter} from "../mappingModel";
import {ChangeTrackingType} from "../mappingModel";
import {CascadeFlags} from "../mappingModel";

/**
 * Specifies that a class is a persistent entity and will be serialized to a document within a MongoDB collection.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class Task {
 *     ...
 *  }
 * ```
 */
export declare function Entity(): ClassDecorator;


/**
 * Specifies that a class can be embedded as a subdocument within an entity, array, or another embeddable.
 *
 * ### Example
 *
 * ```typescript
 *  @Embeddable()
 *  export class Address {
 *     ...
 *  }
 * ```
 */
export declare function Embeddable(): ClassDecorator;


/**
 * Specifies the property converter to use.
 *
 * See [[PropertyConverter]] for more information on creating property converts. The Converter decorator can be used at
 * the class or property level. The decorator accepts an instance of a PropertyConverter, the parameterless constructor
 * for a PropertyConverter, or a string for a named PropertyConverter.
 *
 * ### Example
 *
 * The example below defines the property converter on the Point class. In this case the convert is used for all
 * instances of the Point class.
 * ```typescript
 *  @Converter(PointConverter)
 *  export class Point {
 *
 *     x: number;
 *     y: number;
 *  }
 * ```
 *
 * The example below defines the property converter as an instance of the converter. Passing an instance of the
 * converter to the decorator allows for options to be passed to the converter.
 * ```typescript
 *  @Converter(new EnumerationConverter(IdentifierType))
 *  export class IdentifierType extends Enumeration {
 *      ...
 *  }
 * ```
 *
 * The example below specifies the property converter on the properties of the target class.
 * ```typescript
 *  @Embeddable(Rectangle)
 *  export class Rectangle {
 *
 *     @Converter(PointConverter)
 *     topLeft: Point;
 *
 *     @Converter(PointConverter)
 *     bottomRight: Point;
 *  }
 * ```
 */
export declare function Converter(converter: string | PropertyConverter | ParameterlessConstructor<PropertyConverter>): ClassDecorator & PropertyDecorator;


/**
 * Specifies the name of the collection used to hold the entity.
 *
 * If a name for the collection is not specified using the Collection decorator, an entity is mapped to a collection in
 * MongoDB based on the name of the class and the [[collectionNamingStrategy]] in the [[Configuration]]. The default
 * naming strategy is [[CamelCase]].
 *
 * ### Example
 *
 * ```typescript
 *  @Collection("people")
 *  @Entity()
 *  export class Person {
 *     ...
 *  }
 * ```
 */
export declare function Collection(name: string): ClassDecorator;

/**
 * Describes the collection used to hold the entity.
 *
 * If a name for the collection is not specified using the Collection decorator, an entity is mapped to a collection in
 * MongoDB based on the name of the class and the [[collectionNamingStrategy]] in the [[Configuration]]. The default
 * naming strategy is [[CamelCase]].
 *
 * ### Example
 *
 * ```typescript
 *  @Collection({ name: "logs", db: "dbname", options: { capped: true })
 *  @Entity()
 *  export class Log {
 *     ...
 *  }
 * ```
 */
export declare function Collection(description?: CollectionDescription): ClassDecorator;

/**
 * Specifies that a field should hold the string value of the document identifier.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class Person {
 *      @Id()
 *      id: string;
 *      ...
 *  }
 * ```
 */
export declare function Id(): PropertyDecorator;

/**
 * Specifies that a class is immutable. Can be used on Entity or Embeddable types. When specified on an Entity, the Entity is excluded from
 * dirty checking. When specified on an Embeddable, the original document for the Embeddable is cached and used for serialization.
 *
 * ### Example
 *
 * ```typescript
 *  @Embeddable()
 *  @Immutable()
 *  export class Name {
 *
 *      get first(): string {
 *          return this._first;
 *      }
 *      
 *      get last(): string {
 *          return this._last;
 *      }
 *      
 *      @Field()
 *      private _last: string;
 *
 *      @Field()
 *      private _first: string;
 *      
 *      constructor(last: string, first: string) {
 *          this._last = last;
 *          this._first = first;
 *      }
 *  }
 * ```
 */
export declare function Immutable(): ClassDecorator;

/**
 * Specifies a database index should be generated on the collection that holds this entity.
 *
 * This is the required method of defining indexes when compound keys are needed.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  @Index({ keys: [['name', 1], ['age', 1]] })
 *  export class Person {
 *
 *      @Field()
 *      name: string;
 *
 *      @Field()
 *      age: number;
 *      ...
 *  }
 * ```
 */
export declare function Index(description: ClassIndexDescription): ClassDecorator;

/**
 * Specifies a database index should be generated for the specified field on the collection holds this entity.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class Person {
 *
 *      @Index()
 *      name: string;
 *      ...
 *  }
 * ```
 */
export declare function Index(description?: PropertyIndexDescription): PropertyDecorator;

/**
 * Specifies the name of the field used to hold the entity version for optimistic locking.
 *
 * If the version field is not specified, `__v` is used.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  @VersionField("version")
 *  export class Person {
 *      ...
 *  }
 * ```
 */
export declare function VersionField(name: string): ClassDecorator;

/**
 * Specifies if optimistic locking should be used or not.
 *
 * Optimistic locking is enabled by default. A value of `false` disables optimistic locking.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  @Versioned(false)
 *  export class Person {
 *      ...
 *  }
 * ```
 */
export declare function Versioned(enabled?: boolean): ClassDecorator;

/**
 * Specifies the type of change tracking to use for an entity.
 *
 * See [[ChangeTrackingType]] for more information on the types of change tracking that are available.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  @ChangeTracking(ChangeTrackingType.DeferredImplicit)
 *  export class Person {
 *      ...
 *  }
 * ```
 */
export declare function ChangeTracking(type: ChangeTrackingType): ClassDecorator;

/**
 * Specifies the name of the field used for the class inheritance discriminator.
 *
 * If the discriminator field is not specified, a value of `__t` is used.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  @DiscriminatorField("type")
 *  export class Person {
 *      ...
 *  }
 * ```
 */
export declare function DiscriminatorField(name: string): ClassDecorator;

/**
 * Specifies the value to use for the discriminator for a class.
 *
 * If the discriminator value is not specified, the discriminator value for a class is determined using the
 * [[discriminatorNamingStrategy]] on the [[Configuration]]. By default, the name of the class is used.
 *
 * ### Example
 *
 *
 * ```typescript
 *  @Entity()
 *  class Party {
 *     ...
 *  }

 *  @Entity()
 *  @DiscriminatorValue("P")
 *  class Person extends Party {
 *     ...
 *  }
 *
 *  @Entity()
 *  @DiscriminatorValue("O")
 *  class Organization extends Party {
 *     ...
 *  }
 * ```
 */
export declare function DiscriminatorValue(value: string): ClassDecorator;

/**
 * Specifies the name of the field that should be used to serialize a property on an entity or embeddable class.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class Person {
 *
 *      @Field("n")
 *      name: string;
 *      ...
 *  }
 * ```
 */
export declare function Field(name?: string): PropertyDecorator;

/**
 * Describes the field that should be used to serialize a property on an entity or embeddable class.
 *
 * By default `null` values are treated the same as `undefined` values and removed from the serialized document.
 * Setting a value of `nullable: true` in the field description indicates that `null` values should be saved to the
 * database.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class Person {
 *
 *      @Field({ nullable: true })
 *      name: string;
 *      ...
 *  }
 * ```
 */
export declare function Field(description: FieldDescription): PropertyDecorator;

/**
 * Specifies that an enum value should be serialized as a string.
 *
 * By default enums are serialized as numbers. To serialize an enum as a string, add the Enumerated decorator to a
 * property, passing in the enum. Note that this cannot be used with `const` enums.
 *
 * ### Example
 *
 * ```typescript
 *  export enum TaskStatus {
 *
 *      Pending,
 *      Completed,
 *      Archived
 *  }
 *
 *  @Entity()
 *  export class Task {
 *
 *      @Enumerated(TaskStatus)
 *      status: TaskStatus;
 *      ...
 *  }
 * ```
 */
export declare function Enumerated(members: Object): PropertyDecorator;

/**
 * Specifies that a property is the inverse side of a entity reference.
 *
 * ### Example
 *
 * In the example below, the reference is stored on the `patient` property of the `Admission` entity.
 *
 * ```typescript
 * @Entity()
 * export class Patient {
 *
 *     @InverseOf("patient")
 *     @ElementType(Admission)
 *     admissions: Admission[];
 *     ...
 * }
 *
 * @Entity()
 * export class Admission {
 *
 *     @Field()
 *     patient: Patient;
 *     ...
 * }
 *
 * ...
 * session.fetch(patient.admissions, (err, admissions) => {
 *      ...
 * });
 * ```
 *
 * In the example below, the references are stored on the `admissions` property of the `Patient` entity.
 *
 * ```typescript
 * @Entity()
 * export class Patient {
 *
 *     @ElementType(Admission)
 *     admissions: Admission[];
 *     ...
 * }
 *
 * @Entity()
 * export class Admission {
 *
 *     @InverseOf("admissions")
 *     patient: Patient;
 *     ...
 * }
 *
 * ...
 * session.fetch(admission.patient, (err, patient) => {
 *      ...
 * });
 * ```
 */
export declare function InverseOf(propertyName: string): PropertyDecorator;

/**
 * Specifies which operations should cascade to a property on an entity or embeddable. The type of the property must be
 * an entity. See [[CascadeFlags]] for more information on the available cascade options.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class Task {
 *
 *      @Cascade(CascadeFlags.Save | CascadeFlags.Remove)
 *      owner: Person;
 *  }
 * ```
 */
export declare function Cascade(flags: CascadeFlags): PropertyDecorator;

/**
 * Specifies the type of a property.
 *
 * It is generally not necessary to explicitly indicate the type of a property.
 * However, when a property is an embeddable or a reference to an entity, sometimes the type of the property cannot be
 * determined because of circular references of `import` statements. In this case the Type decorator should be used
 * with the name of the type.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class Task {
 *
 *      @Type("Person")
 *      owner: Person;
 *  }
 * ```
 */
export declare function Type(target: Constructor<any> | string): PropertyDecorator;

/**
 * Specified the type of an array element.
 *
 * TypeScript does not provide the type of an array element, so the type of the array element must be indicate with the
 * ElementType decorator.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class Organization {
 *
 *      @ElementType(Address)
 *      addresses: Address[];
 *  }
 * ```
 */
export declare function ElementType(target: Constructor<any> | string): PropertyDecorator;

/**
 * @hidden
 */
export declare function MapKey(propertyName: string): PropertyDecorator;

/**
 * Specifies that a property should not be persisted.
 *
 * Properties are mapped to persistent document fields on an opt-in basis. *All properties that are decorated are
 * mapped.* However, if you wish to prevent a decorated property from being mapped, decorate that property with the
 * Transient decorator as demonstrated below.
 *
 * ### Example
 *
 * ```typescript
 *  @Entity()
 *  export class User {
 *
 *      @Transient()
 *      @SomeOtherDecorator()
 *      private _something: string;
 *  }
 * ```
 */
export declare function Transient(): PropertyDecorator;


exports.Entity = makeDecorator(EntityAnnotation);
exports.Embeddable = makeDecorator(EmbeddableAnnotation);
exports.Converter = makeDecorator(ConverterAnnotation);
exports.Collection = makeDecorator(CollectionAnnotation);
exports.Index = makeDecorator(IndexAnnotation);
exports.VersionField = makeDecorator(VersionFieldAnnotation);
exports.Versioned = makeDecorator(VersionedAnnotation);
exports.ChangeTracking = makeDecorator(ChangeTrackingAnnotation);
exports.DiscriminatorField = makeDecorator(DiscriminatorFieldAnnotation);
exports.DiscriminatorValue = makeDecorator(DiscriminatorValueAnnotation);
exports.Field = makeDecorator(FieldAnnotation);
exports.Enumerated = makeDecorator(EnumeratedAnnotation);
exports.Cascade = makeDecorator(CascadeAnnotation);
exports.InverseOf = makeDecorator(InverseOfAnnotation);
exports.Type = makeDecorator(TypeAnnotation);
exports.ElementType = makeDecorator(ElementTypeAnnotation);
exports.MapKey = makeDecorator(MapKeyAnnotation);
exports.Id = makeDecorator(IdAnnotation);
exports.Immutable = makeDecorator(ImmutableAnnotation);
exports.Transient = makeDecorator(TransientAnnotation);


