import ResultCallback = require("../core/resultCallback");
import IteratorCallback = require("../core/iteratorCallback");
import QueryKind = require("./queryKind");

interface QueryDefinition {

    kind: QueryKind;
    readOnly: boolean;

    key: string;
    criteria: any;
    updateDocument: any;

    wantsUpdated: boolean;
    fetchPaths: string[];
    sortBy: [string, number][];
    limitCount: number;
    skipCount: number;
    iterator: IteratorCallback<any>;

    execute(callback: ResultCallback<any>): void;
}

export = QueryDefinition;
