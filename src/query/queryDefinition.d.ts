import ResultCallback = require("../core/resultCallback");
import IteratorCallback = require("../core/iteratorCallback");
import QueryKind = require("./queryKind");

interface QueryDefinition {

    kind: QueryKind;
    readOnly: boolean;

    key: string;
    criteria: Object;
    updateDocument: Object;

    wantsUpdated: boolean;
    fetchPaths: string[];
    sortBy: [string, number][];
    limitCount: number;
    skipCount: number;
    iterator: IteratorCallback<Object>;
    batchSizeValue: number;
    // TODO: add read preference. Use string or enumeration or static class with core values?

    execute(callback: ResultCallback<any>): void;
}

export = QueryDefinition;
