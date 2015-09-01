import ResultCallback = require("../core/resultCallback");
import IteratorCallback = require("../core/iteratorCallback");
import QueryKind = require("./queryKind");
import QueryDocument = require("./queryDocument");
import OrderDocument = require("./orderDocument");

interface QueryDefinition {

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

export = QueryDefinition;
