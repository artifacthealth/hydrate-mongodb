import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {InternalSessionFactory} from "../internalSessionFactory";
import {Changes} from "./changes";
import {Reference} from "../reference";
import {PropertyFlags} from "./propertyFlags";
import {InternalSession} from "../internalSession";
import {ResultCallback} from "../core/resultCallback";
import {ResolveContext} from "./resolveContext";
import {ReadContext} from "./readContext";
import {Observer} from "../observer";

export interface InternalMapping {

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
