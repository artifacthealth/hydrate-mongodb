import {InternalSession} from "../../src/session";
import {QueryDefinition} from "../../src/query/queryDefinition";
import {IteratorCallback} from "../../src/core/callback";
import {QueryDocument} from "../../src/query/queryBuilder";
import {QueryKind} from "../../src/query/queryKind";
import {ResultCallback} from "../../src/core/callback";

export class QueryDefinitionStub implements QueryDefinition {

    key: string;
    id: any;
    criteria: QueryDocument;
    fields: QueryDefinition;
    updateDocument: QueryDocument;
    isLazy: boolean;
    wantsUpdated: boolean;
    fetchPaths: string[];
    sortValue: [string, number][];
    limitCount: number;
    skipCount: number;
    iterator: IteratorCallback<Object>;
    batchSizeValue: number;

    get readOnly(): boolean {
        switch (this.kind) {

            case QueryKind.FindAll:
            case QueryKind.FindEach:
            case QueryKind.FindEachSeries:
            case QueryKind.FindOne:
            case QueryKind.FindOneById:
            case QueryKind.Distinct:
            case QueryKind.Count:
                return true;
            default:
                return false;
        }
    }

    constructor(public kind: QueryKind) {

    }

    executeInternal(callback: ResultCallback<any>): void {
        throw new Error("Not implemented");
    }

    toObject(): Object {
        return undefined;
    }
}
