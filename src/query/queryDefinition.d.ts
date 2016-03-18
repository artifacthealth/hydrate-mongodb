import {ResultCallback} from "../core/callback";
import {IteratorCallback} from "../core/callback";
import {QueryKind} from "./queryKind";
import {QueryDocument} from "./queryBuilderImpl";
import {OrderDocument} from "./orderDocument";

/**
 * @hidden
 */
export interface QueryDefinition {

    kind: QueryKind;
    readOnly: boolean;

    key: string;
    id: any;
    criteria: QueryDocument;
    updateDocument: QueryDocument;

    wantsUpdated: boolean;
    fetchPaths: string[];
    sortValue: [string, number][];
    orderDocument?: OrderDocument[];
    limitCount: number;
    skipCount: number;
    iterator: IteratorCallback<Object>;
    batchSizeValue: number;
    // TODO: add read preference. Use string or enumeration or static class with core values?

    execute(callback: ResultCallback<any>): void;
}
