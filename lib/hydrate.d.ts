/// <reference path="../typings/mongodb.d.ts" />
/// <reference path="../typings/node.d.ts" />
import events = require("events");

declare module "hydrate" {

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

    interface SessionFactory {

        createSession(): Session;
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
        query<T>(ctr: Constructor<T>): Query<T>;
        wait(callback?: Callback): void;
        close(callback?: Callback): void;
        contains(obj: Object): boolean;
        getId(obj: Object): any;
        getReference<T>(ctr: Constructor<T>, id: any): T;
    }

    interface MappingProvider {

        getMapping(config: Configuration, callback: ResultCallback<MappingRegistry>): void;
    }

    interface Callback {

        (err?: Error): void;
    }

    interface ResultCallback<T> {

        (err: Error, result?: T): void;
    }

    interface IteratorCallback<T> {

        (item: T, callback: Callback): any;
    }

    interface Constructor<T> {

        name?: string;
        new(...args: any[]): T;
    }

    interface NamingStrategy {

        (name: string): string;
    }

    export module NamingStrategy {

        /**
         * The name is passed through as-is.
         * @param name The name.
         */
        export function None(name: string): string;

        /**
         * The name separators are denoted by having the next letter capitalized.
         * @param name The name.
         */
        export function CamelCase(name: string): string;

        /**
         * The same as CamelCase except with the first letter also capitalized.
         * @param name The name.
         */
        export function PascalCase(name: string): string;

        /**
         * The name is a lowercase underscore separated string.
         * @param name The name.
         */
        export function SnakeCase(name: string): string;
    }

    interface IdentityGenerator {

        generate(): any;
        fromString(text: string): any;
        validate(value: any): boolean;
        areEqual(first: any, second: any): boolean;
    }

    const enum ChangeTracking {

        DeferredImplicit,
        DeferredExplicit,
        Observe
    }

    export class ObjectIdGenerator implements IdentityGenerator {

        generate(): any;
        validate(value: any): boolean;
        fromString(text: string): any;
        areEqual(first: any, second: any): boolean;
    }

    export class AnnotationMappingProvider implements MappingProvider {

        addFile(path: string): void;
        getMapping(config: Configuration, callback: ResultCallback<MappingRegistry>): void;
    }

    interface Query<T> {

        findAll(callback?: ResultCallback<T[]>): FindQuery<T>;
        findAll(criteria: QueryDocument, callback?: ResultCallback<T[]>): FindQuery<T>;
        findOne(callback?: ResultCallback<T>): FindOneQuery<T>;
        findOne(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneQuery<T>;
        findOneById(id: any, callback?: ResultCallback<Object>): FindOneQuery<T>;
        findOneAndRemove(callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
        findOneAndRemove(criteria: QueryDocument, callback?: ResultCallback<T>): FindOneAndRemoveQuery<T>;
        findOneAndUpdate(updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> ;
        findOneAndUpdate(criteria: QueryDocument, updateDocument: QueryDocument, callback?: ResultCallback<T>): FindOneAndUpdateQuery<T> ;
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

    interface QueryDocument {

        [name: string]: any;
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

    interface FindOneQuery<T> {

        fetch(path: string, callback?: ResultCallback<T>): FindOneQuery<T>;
        fetch(paths: string[], callback?: ResultCallback<T>): FindOneQuery<T>;
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

    interface MappingRegistry {

    }
}