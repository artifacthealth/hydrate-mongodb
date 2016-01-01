import {InternalSession} from "../../src/internalSession";
import {QueryDefinition} from "../../src/query/queryDefinition";
import {IteratorCallback} from "../../src/core/iteratorCallback";
import {QueryDocument} from "../../src/query/queryDocument";
import {QueryKind} from "../../src/query/queryKind";
import {ResultCallback} from "../../src/core/resultCallback";

export class QueryDefinitionStub implements QueryDefinition {

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

    get readOnly(): boolean {
        return (this.kind & QueryKind.ReadOnly) !== 0;
    }

    constructor(public kind: QueryKind) {

    }

    execute(callback: ResultCallback<any>): void {
        throw new Error("Not implemented");
    }
}
