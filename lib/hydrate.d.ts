/// <reference path="../typings/mongodb.d.ts" />
/// <reference path="../typings/node.d.ts" />

declare module "hydrate" {
    import mongodb = require("mongodb");
    import events = require("events");

    export module NamingStrategies {
        /**
         * The name is passed through as-is.
         * @param name The name.
         */
        function None(name: string): string;
        /**
         * The name separators are denoted by having the next letter capitalized.
         * @param name The name.
         */
        function CamelCase(name: string): string;
        /**
         * The same as CamelCase except with the first letter also capitalized.
         * @param name The name.
         */
        function PascalCase(name: string): string;
        /**
         * The name is a lowercase underscore separated string.
         * @param name The name.
         */
        function SnakeCase(name: string): string;
    }

    export class ObjectIdGenerator implements IdentityGenerator {
        constructor();
        generate(): any;
        validate(value: any): boolean;
        fromString(text: string): any;
        areEqual(first: any, second: any): boolean;
    }

    export class Configuration {
        /**
         * Default identity generator to use.
         */
        identityGenerator: IdentityGenerator;
        /**
         * True if entities are versioned by default; otherwise, false.
         */
        versioned: boolean;
        /**
         * Default field name to use for optimistic locking.
         */
        versionField: string;
        /**
         * Default field name to use for the class discriminator.
         */
        discriminatorField: string;
        /**
         * Default change tracking strategy to use.
         */
        changeTracking: ChangeTracking;
        /**
         * Naming strategy to use for collection names.
         */
        collectionNamingStrategy: NamingStrategy;
        /**
         * Naming strategy to use for field names.
         */
        fieldNamingStrategy: NamingStrategy;
        /**
         * Naming strategy to use for the discriminator value of a class.
         */
        discriminatorNamingStrategy: NamingStrategy;
        /**
         * Adds a mapping provider to the configuration.
         * @param mapping The mapping provider to use.
         */
        addMapping(mapping: MappingProvider): void;
        /**
         * Creates a session factory.
         * @param connection The MongoDB connection to use.
         * @param callback Called once the session factory is created.
         */
        createSessionFactory(connection: mongodb.Db, callback: ResultCallback<SessionFactory>): void;
    }

    export class AnnotationMappingProvider implements MappingProvider {
        constructor();
        addFile(path: string): void;
        getMapping(config: Configuration, callback: ResultCallback<Mapping.ClassMapping[]>): void;
    }

    interface IdentityGenerator {
        generate(): any;
        fromString(text: string): any;
        validate(value: any): boolean;
        areEqual(first: any, second: any): boolean;
        // TODO: serialize and deserialize methods on IdentityGenerator? e.g. Perhaps UUID is a class when assigned to an
        // entity but is serialized to a string when stored in the database.
    }

    interface ResultCallback<T> {
        (err: Error, result?: T): void;
    }

    interface MappingProvider {
        getMapping(config: Configuration, callback: ResultCallback<Mapping.ClassMapping[]>): void;
    }

    interface SessionFactory {
        createSession(): Session;
    }

    enum ChangeTracking {
        DeferredImplicit = 0,
        DeferredExplicit = 1,
        Observe = 2,
    }

    interface NamingStrategy {
        (name: string): string;
    }

    interface Mapping {
        id: number;
        flags: MappingFlags;
    }
    module Mapping {
        interface EnumMembers {
            [name: string]: number;
        }
        interface Property {
            /**
             * The name of the property.
             */
            name: string;
            /**
             * The property flags.
             */
            flags: PropertyFlags;
            /**
             * The name of the database document field.
             */
            field: string;
            /**
             * The name of the property in the target TypeMapping that is used to retrieve the value of this property.
             */
            inverseOf: string;
            /**
             * The mapping of the property.
             */
            mapping: Mapping;
            setFlags(flags: PropertyFlags): void;
        }
        interface ObjectMapping extends Mapping {
            addProperty(property: Property): void;
            getProperty(name: string): Property;
        }
        interface ClassMapping extends ObjectMapping {
            name: string;
            discriminatorField: string;
            discriminatorValue: string;
            classConstructor: Function;
            hasSubClasses: boolean;
            hasBaseClass: boolean;
            setDiscriminatorValue(value: string): void;
        }
        interface EntityMapping extends ClassMapping {
            collectionName: string;
            databaseName: string;
            indexes: Index[];
            collectionOptions: CollectionOptions;
            identity: IdentityGenerator;
            changeTracking: ChangeTracking;
            versioned: boolean;
            versionField: string;
            lockable: boolean;
            lockField: string;
            addIndex(index: Index): void;
        }
        function createProperty(name: string, mapping: Mapping): Property;
        function createArrayMapping(elementMapping: Mapping): Mapping;
        function createBooleanMapping(): Mapping;
        function createClassMapping(baseClass?: ClassMapping): ClassMapping;
        function createDateMapping(): Mapping;
        function createEntityMapping(baseClass?: EntityMapping): EntityMapping;
        function createEnumMapping(members: EnumMembers): Mapping;
        function createNumberMapping(): Mapping;
        function createObjectMapping(): ObjectMapping;
        function createRegExpMapping(): Mapping;
        function createStringMapping(): Mapping;
        function createTupleMapping(elementMappings: Mapping[]): Mapping;
    }

    interface Session extends events.EventEmitter {
        save(obj: Object, callback?: Callback): void;
        remove(obj: Object, callback?: Callback): void;
        detach(obj: Object, callback?: Callback): void;
        refresh(obj: Object, callback: Callback): void;
        flush(callback?: Callback): void;
        clear(callback?: Callback): void;
        find<T>(ctr: Constructor<T>, id: any, callback?: ResultCallback<T>): FindOneQuery<T>;
        fetch<T>(obj: T, callback?: ResultCallback<T>): void;
        fetch<T>(obj: T, path: string, callback?: ResultCallback<T>): void;
        fetch<T>(obj: T, paths: string[], callback?: ResultCallback<T>): void;
        query<T>(ctr: Constructor<T>): QueryBuilder<T>;
        wait(callback?: Callback): void;
        close(callback?: Callback): void;
        contains(obj: Object): boolean;
        getId(obj: Object): any;
        getReference<T>(ctr: Constructor<T>, id: any): T;
    }

    const enum MappingFlags {
        Array = 1,
        Boolean = 2,
        Class = 4,
        Date = 8,
        Enum = 16,
        Number = 32,
        Object = 64,
        RegExp = 128,
        String = 256,
        Tuple = 512,
        Entity = 1024,
        Embeddable = 2048,
        InheritanceRoot = 4096,
        ArrayLike = 513,
    }

    const enum PropertyFlags {
        None = 0,
        Ignored = 1,
        CascadeSave = 2,
        CascadeRemove = 4,
        CascadeDetach = 8,
        CascadeRefresh = 16,
        CascadeMerge = 32,
        CascadeAll = 62,
        InverseSide = 64,
        Nullable = 128,
        OrphanRemoval = 256,
        All = 511,
        WalkEntities = 512,
        Dereference = 1024,
    }

    interface Index {
        keys: [string, number][];
        options?: IndexOptions;
    }

    interface CollectionOptions {
        /**
         * The write concern.
         */
        w?: string;
        /**
         * The write concern timeout.
         */
        wtimeout?: number;
        /**
         * Specify a journal write concern.
         */
        j?: boolean;
        /**
         * Create a capped collection.
         */
        capped?: boolean;
        /**
         * The size of the capped collection in bytes.
         */
        size?: number;
        /**
         * The maximum number of document in the capped collection.
         */
        max?: number;
        /**
         * The preferred read preference
         */
        readPreference?: string;
        /**
         * Strict mode
         */
        strict?: boolean;
    }

    interface Callback {
        (err?: Error): void;
    }

    interface Constructor<T> {
        name?: string;
        new(...args: any[]): T;
    }

    interface QueryBuilder<T> {
        findAll(callback?: ResultCallback<T[]>): FindQuery<T>;
        findAll(criteria: QueryDocument, callback?: ResultCallback<T[]>): FindQuery<T>;
        findOne(callback?: ResultCallback<T>): FindOneQuery<T>;
        findOne(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneQuery<T>;
        findOneById(id: any, callback?: ResultCallback<Object>): FindOneQuery<T>;
        findOneAndRemove(callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
        findOneAndRemove(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
        findOneAndUpdate(updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
        findOneAndUpdate(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
        removeAll(callback?: ResultCallback<number>): void;
        removeAll(criteria: QueryDocument, callback?: ResultCallback<number>): void;
        removeOne(callback?: ResultCallback<number>): void;
        removeOne(criteria: QueryDocument, callback?: ResultCallback<number>): void;
        updateAll(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
        updateAll(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
        updateOne(updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
        updateOne(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<number>): void;
        distinct(key: string, callback: ResultCallback<any[]>): void;
        distinct(key: string, criteria: QueryDocument, callback: ResultCallback<any[]>): void;
        count(callback?: ResultCallback<number>): CountQuery;
        count(criteria: QueryDocument, callback?: ResultCallback<number>): CountQuery;
    }

    interface FindOneQuery<T> {
        fetch(path: string, callback?: ResultCallback<T>): FindOneQuery<T>;
        fetch(paths: string[], callback?: ResultCallback<T>): FindOneQuery<T>;
    }

    interface IndexOptions {
        w?: any;
        wtimeout?: number;
        fsync?: boolean;
        journal?: boolean;
        unique?: boolean;
        sparse?: boolean;
        background?: boolean;
        dropDups?: boolean;
        min?: number;
        max?: number;
        v?: number;
        expireAfterSeconds?: number;
        name?: string;
    }

    interface FindOneAndRemoveQuery<T> {
        sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
        sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
        fetch(path: string, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
        fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
    }

    interface FindOneAndUpdateQuery<T> {
        sort(field: string, direction: number, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
        sort(fields: [string, number][], callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
        fetch(path: string, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
        fetch(paths: string[], callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
        returnUpdated(callback?: ResultCallback<T>): FindOneAndUpdateQuery<T>;
    }

    interface FindQuery<T> {
        sort(field: string, direction: number, callback?: ResultCallback<T[]>): FindQuery<T>;
        sort(fields: [string, number][], callback?: ResultCallback<T[]>): FindQuery<T>;
        fetch(path: string, callback?: ResultCallback<T[]>): FindQuery<T>;
        fetch(paths: string[], callback?: ResultCallback<T[]>): FindQuery<T>;
        limit(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
        skip(value: number, callback?: ResultCallback<T[]>): FindQuery<T>;
        batchSize(value: number): FindQuery<T>;
        each(iterator: IteratorCallback<T>, callback: Callback): void;
        eachSeries(iterator: IteratorCallback<T>, callback: Callback): void;
    }

    interface CountQuery {
        limit(value: number, callback?: ResultCallback<number>): CountQuery;
        skip(value: number, callback?: ResultCallback<number>): CountQuery;
    }

    interface QueryDocument {
        [name: string]: any;
    }

    interface IteratorCallback<T> {
        (item: T, callback: Callback): any;
    }
}
