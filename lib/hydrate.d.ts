/// <reference path="../typings/mongodb.d.ts" />
/// <reference path="../typings/node.d.ts" />

declare module "hydrate" {
    import mongodb = require("mongodb");
    import events = require("events");

    export interface NamingStrategy {
        (name: string): string;
    }
    module NamingStrategy {
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
        collectionNamingStrategy: typeof NamingStrategy.CamelCase;
        /**
         * Naming strategy to use for field names.
         */
        fieldNamingStrategy: typeof NamingStrategy.CamelCase;
        /**
         * Naming strategy to use for the discriminator value of a class.
         */
        discriminatorNamingStrategy: typeof NamingStrategy.None;
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

    export class ObjectIdGenerator implements IdentityGenerator {
        constructor();
        generate(): any;
        validate(value: any): boolean;
        fromString(text: string): any;
        areEqual(first: any, second: any): boolean;
    }

    export class AnnotationMappingProvider implements MappingProvider {
        constructor();
        addFile(path: string): void;
        getMapping(config: Configuration, callback: ResultCallback<MappingRegistry>): void;
    }

    interface ResultCallback<T> {
        (err: Error, result?: T): void;
    }

    enum ChangeTracking {
        DeferredImplicit = 0,
        DeferredExplicit = 1,
        Observe = 2,
    }

    interface MappingProvider {
        getMapping(config: Configuration, callback: ResultCallback<MappingRegistry>): void;
    }

    interface IdentityGenerator {
        generate(): any;
        fromString(text: string): any;
        validate(value: any): boolean;
        areEqual(first: any, second: any): boolean;
        // TODO: serialize and deserialize methods on IdentityGenerator? e.g. Perhaps UUID is a class when assigned to an
        // entity but is serialized to a string when stored in the database.
    }

    interface SessionFactory {
        createSession(): Session;
    }

    class MappingRegistry {
        addMapping(mapping: ClassMapping): void;
        getEntityMappings(): EntityMapping[];
        getMappings(): ClassMapping[];
        getMappingForObject(obj: any): ClassMapping;
        getMappingForConstructor(ctr: Constructor<any>): ClassMapping;
        /**
         * Merges the specified registry into this registry.
         * @param registry The registry to merge.
         */
        merge(registry: MappingRegistry): void;
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

    class EntityMapping extends ClassMapping {
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
        constructor(baseClass?: EntityMapping);
        setDocumentVersion(obj: any, version: number): void;
        getDocumentVersion(obj: any): number;
        addIndex(index: Index): void;
        refresh(context: ReadContext, entity: any, document: any): any;
        read(context: ReadContext, value: any): any;
        write(value: any, path: string, errors: MappingError[], visited: any[]): any;
        watchEntity(entity: any, observer: Observer): void;
        watch(value: any, observer: Observer, visited: any[]): void;
        areDocumentsEqual(document1: any, document2: any): boolean;
        areEqual(documentValue1: any, documentValue2: any): boolean;
        walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void;
        fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void;
        fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void;
        _resolveCore(context: ResolveContext): void;
    }

    interface Constructor<T> {
        name?: string;
        new(...args: any[]): T;
    }

    class ClassMapping extends ObjectMapping {
        inheritanceRoot: ClassMapping;
        name: string;
        discriminatorField: string;
        discriminatorValue: string;
        classConstructor: Function;
        /**
         * Constructs a ClassMapping.
         * @param baseClass The baseclass mapping for this class. If no baseclass is specified then it is assumed that this
         * mapping represents the inheritance root.
         */
        constructor(baseClass?: ClassMapping);
        setDiscriminatorValue(value: string): void;
        setDocumentDiscriminator(obj: any): void;
        getDocumentDiscriminator(obj: any): string;
        hasSubClasses: boolean;
        hasBaseClass: boolean;
        read(context: ReadContext, value: any): any;
        /**
         * Gets the mapping for the specified document. Note that this method can only be called on an inheritance root.
         * @param document The document.
         * @param path The current path. Used for error reporting.
         * @param errors An array of reported errors.
         */
        getMapping(context: ReadContext, document: any): ClassMapping;
        protected readClass(context: ReadContext, value: any): any;
        write(value: any, path: string, errors: MappingError[], visited: any[]): any;
        protected writeClass(value: any, path: string, errors: MappingError[], visited: any[]): any;
        areEqual(documentValue1: any, documentValue2: any): boolean;
        walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void;
        fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void;
    }

    interface Callback {
        (err?: Error): void;
    }

    interface FindOneQuery<T> {
        fetch(path: string, callback?: ResultCallback<T>): FindOneQuery<T>;
        fetch(paths: string[], callback?: ResultCallback<T>): FindOneQuery<T>;
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

    interface MappingError {
        message: string;
        value?: any;
        path: string;
    }
    module MappingError {
        function createErrorMessage(errors: MappingError[]): string;
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

    class Reference {
        mapping: EntityMapping;
        id: any;
        /**
         * True if the Reference has been fetched; otherwise, false.
         */
        constructor(mapping: EntityMapping, id: any);
        fetch(session: InternalSession, callback: ResultCallback<any>): void;
        /**
         * Returns true if other is another reference with the same id or the resolved entity for the reference.
         * @param other The reference or entity to compare.
         */
        equals(other: any): boolean;
        /**
         * Returns true if values are equivalent. Either value can be a Reference or an Entity. However, if neither
         * value is a Reference then the function returns false.
         * @param value1 The first reference or entity to compare.
         * @param value2 The second reference or entity to compare.
         */
        static areEqual(value1: any, value2: any): boolean;
        static isReference(obj: any): boolean;
    }

    interface InternalSession extends Session {
        factory: InternalSessionFactory;
        getObject(id: any): any;
        registerManaged(persister: Persister, entity: Object, document: any): void;
        notifyRemoved(entity: Object): void;
        getPersister(mapping: EntityMapping): Persister;
        getReferenceInternal(mapping: EntityMapping, id: any): any;
        fetchInternal(entity: Object, paths: string[], callback: ResultCallback<any>): void;
        executeQuery(query: QueryDefinition, callback: ResultCallback<any>): void;
    }

    class ResolveContext {
        path: string;
        resolvedPath: string;
        resolvedMapping: Mapping;
        error: Error;
        constructor(path: string);
        currentProperty: string;
        isEop: boolean;
        isFirst: boolean;
        setError(message: string): void;
        resolveProperty(mapping: Mapping, resolvedProperty: string): boolean;
    }

    class ReadContext {
        session: InternalSession;
        /**
         * The current path.
         */
        path: string;
        /**
         * A list of errors that occurred during deserialization.
         */
        errors: MappingError[];
        /**
         * True if there are errors in the context; otherwise, false.
         */
        hasErrors: boolean;
        /**
         * Observer used to watch deserialized objects, if specified.
         */
        observer: Observer;
        constructor(session: InternalSession);
        /**
         * Adds an error to the context.
         * @param message The error message.
         * @param path Optional. The current path if different than what's in the context.
         */
        addError(message: string, path?: string): void;
        /**
         * Gets a string summarizing all errors in the context.
         */
        getErrorMessage(): string;
    }

    class Observer {
        /**
         * Creates an Observer object.
         * @param callback Called the first time any of the watched objects change.
         */
        constructor(callback: () => void);
        watch(obj: any): void;
        destroy(): void;
    }

    class ObjectMapping extends MappingBase {
        properties: Property[];
        constructor();
        addProperty(property: Property): void;
        getProperty(name: string): Property;
        getPropertyForField(field: string): Property;
        getProperties(flags?: PropertyFlags): Property[];
        read(context: ReadContext, value: any): any;
        protected readObject(context: ReadContext, obj: any, value: any, checkRemoved: boolean): any;
        write(value: any, path: string, errors: MappingError[], visited: any[]): any;
        protected writeObject(document: any, value: any, path: string, errors: MappingError[], visited: any[]): any;
        watch(value: any, observer: Observer, visited: any[]): void;
        areEqual(documentValue1: any, documentValue2: any): boolean;
        walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void;
        fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void;
        _resolveCore(context: ResolveContext): void;
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

    interface CountQuery {
        limit(value: number, callback?: ResultCallback<number>): CountQuery;
        skip(value: number, callback?: ResultCallback<number>): CountQuery;
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

    interface QueryDocument {
        [name: string]: any;
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

    interface InternalSessionFactory extends SessionFactory {
        getMappingForObject(obj: any): EntityMapping;
        getMappingForConstructor(ctr: Constructor<any>): EntityMapping;
        createPersister(session: InternalSession, mapping: EntityMapping): Persister;
    }

    interface Persister {
        changeTracking: ChangeTracking;
        identity: IdentityGenerator;
        dirtyCheck(batch: Batch, entity: Object, originalDocument: Object): Result<Object>;
        addInsert(batch: Batch, entity: Object): Result<Object>;
        addRemove(batch: Batch, entity: Object): void;
        fetch(entity: Object, path: string, callback: Callback): void;
        refresh(entity: Object, callback: ResultCallback<Object>): void;
        watch(value: any, observer: Observer): void;
        executeQuery(query: QueryDefinition, callback: ResultCallback<Object>): void;
        findOneById(id: any, callback: ResultCallback<any>): void;
        findInverseOf(entity: Object, path: string, callback: ResultCallback<Object[]>): void;
        findOneInverseOf(entity: Object, path: string, callback: ResultCallback<Object>): void;
    }

    interface QueryDefinition {
        kind: QueryKind;
        readOnly: boolean;
        key: string;
        id: any;
        criteria: QueryDocument;
        updateDocument: QueryDocument;
        wantsUpdated: boolean;
        fetchPaths: string[];
        sortValue: [string, number][];
        limitCount: number;
        skipCount: number;
        iterator: IteratorCallback<Object>;
        batchSizeValue: number;
        // TODO: add read preference. Use string or enumeration or static class with core values?
        execute(callback: ResultCallback<any>): void;
    }

    interface Mapping {
        id: number;
        flags: MappingFlags;
        read(context: ReadContext, value: any): any;
        write(value: any, path: string, errors: MappingError[], visited: any[]): any;
        areEqual(documentValue1: any, documentValue2: any): boolean;
        resolve(path: string): ResolveContext;
        resolve(context: ResolveContext): void;
        watch(value: any, observer: Observer, visited: any[]): void;
        walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void;
        fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void;
        fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void;
    }

    interface Object {
        /**
         * The Object.observe() method is used for asynchronously observing the changes to an object. It provides a stream
         * of changes in the order in which they occur.
         * @param obj The object to be observed.
         * @param callback The function called each time changes are made.
         */
        observe(obj: any, callback: (changes: ObjectChangeInfo[]) => void): void;
        unobserve(obj: any, callback: (changes: ObjectChangeInfo[]) => void): void;
    }
    interface ObjectChangeInfo {
        /**
         * The name of the property which was changed.
         */
        name: string;
        /**
         *  The changed object after the change was made.
         */
        object: Object;
        /**
         * A string indicating the type of change taking place. One of "add", "update", or "delete".
         */
        type: string;
        /**
         * Only for "update" and "delete" types. The value before the change.
         */
        oldValue?: any;
    }
    interface Array<T> {
        /**
         * The Array.observe() method is used for asynchronously observing changes to Arrays, similar to Object.observe()
         * for objects. It provides a stream of changes in order of occurrence.
         * @param arr The array to be observed.
         * @param callback The function called each time changes are made.
         */
        observe(arr: any[], callback: (changes: ArrayChangeInfo<T>[]) => void): void;
        unobserve(arr: any[], callback: (changes: ArrayChangeInfo<T>[]) => void): void;
    }
    /**
     * Represents a change to an array
     */
    interface ArrayChangeInfo<T> {
        /**
         * The name of the property which was changed.
         */
        name?: string;
        /**
         * The changed array after the change was made.
         */
        object: T[];
        /**
         * A string indicating the type of change taking place. One of "add", "update", "delete", or "splice".
         */
        type: string;
        /**
         * Only for "update" and "delete" types. The value before the change.
         */
        oldValue?: any;
        /**
         * Only for the "splice" type. The index at which the change occurred.
         */
        index?: number;
        /**
         * Only for the "splice" type. An array of the removed elements.
         */
        removed?: T[];
        /**
         * Only for the "splice" type. The number of elements added.
         */
        addedCount?: number;
    }

    class MappingBase {
        flags: MappingFlags;
        id: number;
        constructor(flags: MappingFlags);
        read(context: ReadContext, value: any): any;
        write(value: any, path: string, errors: MappingError[], visited: any[]): any;
        watch(value: any, observer: Observer, visited: any[]): void;
        walk(session: InternalSession, value: any, flags: PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void;
        areEqual(documentValue1: any, documentValue2: any): boolean;
        fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void;
        fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void;
        resolve(pathOrContext: any): any;
        protected _resolveCore(context: ResolveContext): void;
    }

    class Property {
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
        constructor(name: string);
        setFlags(flags: PropertyFlags): void;
        getPropertyValue(obj: any): any;
        setPropertyValue(obj: any, value: any): void;
        getFieldValue(document: any): any;
        setFieldValue(document: any, value: any): void;
    }

    interface IteratorCallback<T> {
        (item: T, callback: Callback): any;
    }

    interface Table<T> {
        [index: number]: T;
    }

    class Batch implements Command {
        /**
         * Gets a command from the batch.
         * @param id The id of the command.
         * @returns The command or undefined if the id cannot be found.
         */
        getCommand(id: number): Command;
        /**
         * Adds a command to the batch.
         * @param id Number that uniquely identifies the command.
         * @param command The command to add.
         */
        addCommand(id: number, command: Command): void;
        /**
         * Executes the batch.
         * @param callback Callback called when execution completes.
         */
        execute(callback: Callback): void;
    }

    /**
     * Class representing an error-first synchronous result analogous to Node's callback pattern.
     */
    class Result<T> {
        error: Error;
        value: T;
        constructor(error: Error, value?: T);
        handleCallback(callback: ResultCallback<T>): void;
    }

    const enum QueryKind {
        FindAll = 1,
        FindEach = 2,
        FindEachSeries = 4,
        FindOne = 8,
        FindOneById = 16,
        FindOneAndRemove = 32,
        FindOneAndUpdate = 64,
        RemoveAll = 128,
        RemoveOne = 256,
        UpdateAll = 512,
        UpdateOne = 1024,
        Distinct = 2048,
        Count = 4096,
        ReadOnly = 6171,
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

    interface Changes {
        $set?: Map<any>;
        $unset?: Map<any>;
    }

    interface Command {
        execute(callback: Callback): void;
    }

    interface Map<T> {
        [index: string]: T;
    }
    module Map {
        function hasProperty<T>(map: Map<T>, key: string): boolean;
        function getProperty<T>(map: Map<T>, key: string): T;
        function isEmpty<T>(map: Map<T>): boolean;
        function clone<T>(object: T): T;
        function forEachValue<T, U>(map: Map<T>, callback: (value: T) => U): U;
        function forEachKey<T, U>(map: Map<T>, callback: (key: string) => U): U;
        function lookUp<T>(map: Map<T>, key: string): T;
        function mapToArray<T>(map: Map<T>): T[];
        /**
         * Creates a map from the elements of an array.
         *
         * @param array the array of input elements.
         * @param makeKey a function that produces a key for a given element.
         *
         * This function makes no effort to avoid collisions; if any two elements produce
         * the same key with the given 'makeKey' function, then the element with the higher
         * index in the array will be the one associated with the produced key.
         */
        function arrayToMap<T>(array: T[], makeKey: (value: T) => string): Map<T>;
        function setHashCode(obj: any, hashCode: string): string;
        /**
         * Gets a unique identifier for objects that can be used as the key for a map.
         * @param obj The object for which the hash code should be returned.
         */
        function getHashCode(obj: any): string;
    }
}
