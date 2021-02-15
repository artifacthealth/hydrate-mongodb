import {ResultCallback} from "../core/callback";
import {IteratorCallback} from "../core/callback";
import {QueryKind} from "./queryKind";
import {QueryDocument} from "./queryBuilder";
import {OrderDocument} from "./orderDocument";
import {CollationOptions} from "../mapping/collationOptions";

/**
 * @hidden
 */
export interface QueryDefinition {

    kind: QueryKind;
    readOnly: boolean;

    key: string;
    id: any;
    criteria: QueryDocument;
    fields: QueryDocument;
    updateDocument: QueryDocument;
    isLazy: boolean;
    wantsUpdated: boolean;
    fetchPaths: string[];
    sortValue: [string, number][];
    orderDocument?: OrderDocument[];
    limitCount: number;
    collationOptions?: CollationOptions;
    skipCount: number;
    iterator: IteratorCallback<Object>;
    batchSizeValue: number;
    // TODO: add read preference. Use string or enumeration or static class with core values?

    executeInternal(callback: ResultCallback<any>): void;

    /**
     * Creates an object for logging purposes.
     */
    toObject(): Object;
}
