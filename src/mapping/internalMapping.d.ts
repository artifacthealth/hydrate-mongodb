import {MappingError} from "./mappingError";
import {MappingModel} from "./mappingModel";
import {InternalSessionFactory} from "../sessionFactory";
import {Changes} from "./changes";
import {Reference} from "../reference";
import {InternalSession} from "../session";
import {ResultCallback} from "../core/callback";
import {ResolveContext} from "./resolveContext";
import {ReadContext} from "./readContext";
import {Observer} from "../observer";
import {WriteContext} from "./writeContext";

/**
 * @hidden
 */
export interface InternalMapping extends MappingModel.Mapping {

    id: number;
    flags: MappingModel.MappingFlags;
    hasFlags(flag: MappingModel.MappingFlags): boolean;
    read(context: ReadContext, value: any): any;
    write(context: WriteContext, value: any): any;
    areEqual(documentValue1: any, documentValue2: any): boolean;
    resolve(path: string): ResolveContext;
    resolve(context: ResolveContext): void;
    watch(value: any, observer: Observer, visited: any[]): void;
    walk(session: InternalSession, value: any, flags: MappingModel.PropertyFlags, entities: any[], embedded: any[], references: Reference[]): void;
    fetch(session: InternalSession, parentEntity: any, value: any, path: string[], depth: number, callback: ResultCallback<any>): void;
    fetchInverse(session: InternalSession, parentEntity: any, propertyName: string, path: string[], depth: number, callback: ResultCallback<any>): void;
}
