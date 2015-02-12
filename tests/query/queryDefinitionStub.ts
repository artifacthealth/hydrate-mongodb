import InternalSession = require("../../src/internalSession");
import QueryDefinition = require("../../src/query/queryDefinition");
import IteratorCallback = require("../../src/core/iteratorCallback");
import QueryDocument = require("../../src/query/queryDocument");
import QueryKind = require("../../src/query/queryKind");
import ResultCallback = require("../../src/core/resultCallback");

class QueryDefinitionStub implements QueryDefinition {

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

export = QueryDefinitionStub;