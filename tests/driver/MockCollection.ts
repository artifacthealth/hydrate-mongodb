/// <reference path="../../typings/mongodb.d.ts" />

import * as mongodb from "mongodb";

import {MockCursor} from "./mockCursor";
import {MockBulk} from "./mockBulk";

export class MockCollection implements mongodb.Collection {

    collectionName: string;
    hint: any;

    constructor(public contents?: any[], name?: string) {

        this.collectionName = name;
    }


    insert(query: any, optionsOrCallback: any, callback?: (err: Error, result?: any) => void): void {

    }

    rename(newName: String, callback: (err: Error, result?: any) => void): void {

    }

    save(doc: any, optionsOrCallback: any, callback?: (err: Error, result?: any) => void): void {

    }

    drop(callback: (err: Error, result?: any) => void): void {

    }

    findAndRemove(query: Object, sort: any[], optionsOrCallback: any, callback?: (err: Error, result?: any) => void): void {

    }

    createIndex(fieldOrSpec: any, optionsOrCallback: any, callback?: (err: Error, indexName: string) => void): void {

    }

    ensureIndex(fieldOrSpec: any, optionsOrCallback: any, callback?: (err: Error, indexName: string) => void): void {

    }

    indexInformation(options: any, callback: Function): void {
    }

    dropIndex(name: string, callback: Function): void {
    }

    dropAllIndexes(callback: Function): void {
    }

    reIndex(callback: Function): void {
    }

    mapReduce(map: Function, reduce: Function, options: mongodb.MapReduceOptions, callback: Function): void {

    }

    group(keys: Object, condition: Object, initial: Object, reduce: Function, finalize: Function, command: boolean, options: {readPreference: string}, callback: Function): void {
    }

    options(callback: Function): void {
    }

    isCapped(callback: Function): void {
    }

    indexExists(indexes: string, callback: Function): void {
    }

    geoNear(x: number, y: number, optionsOrCallback: any, callback?: Function): void {
    }

    geoHaystackSearch(x: number, y: number, optionsOrCallback: any, callback?: Function): void {
    }

    indexes(callback: Function): void {
    }

    aggregate(pipeline: any[], optionsOrCallback: any, callback?: (err: Error, result: any) => void): void {

    }

    stats(optionsOrCallback: any, callback?: (err: Error, results: mongodb.CollStats) => void): void {

    }

    find(selector: Object, callback?: (err: Error, result: mongodb.Cursor) => void): mongodb.Cursor {

        if (this.onFind) {
            return this.onFind(selector);
        }

        return this.createCursor();
    }

    createCursor(): mongodb.Cursor {
        return new MockCursor(this.contents);
    }

    onFind: (selector: Object) => mongodb.Cursor;

    findOne(selector: Object, callback?: (err: Error, result: any) => void): any {

        if (this.onFindOne) {
            process.nextTick(() => this.onFindOne(selector, callback));
            return;
        }

        process.nextTick(() => {
            callback(null, this.contents[0]);
        });
    }

    onFindOne: (selector: Object, callback?: (err: Error, result: any) => void) => any;


    findAndModify(query: Object, sort: any[], doc: Object, optionsOrCallbac: any, callback?: (err: Error, result: any) => void): void {

    }

    remove(selector: Object, options: { safe?: any; single?: boolean; }, callback?: (err: Error, result: any) => void): void {

    }

    update(selector: Object, document: any, optionsOrCallback: any, callback?: (err: Error, result: any) => void): void {
        if (this.onUpdate) {
            process.nextTick(() => this.onUpdate(selector, document, optionsOrCallback, callback));
            return;
        }
    }

    onUpdate: (selector: Object, document: any, options: { safe?: boolean; upsert?: any; multi?: boolean; serializeFunctions?: boolean; }, callback: (err: Error, result: any) => void) => void;

    count(queryOrCallback: any, optionsOrCallback?: any, callback?: (err: Error, result: any) => void): void {

    }

    distinct(key: string, query: Object, optionsOrCallback: any, callback?: (err: Error, result: any) => void): void {
        if (this.onDistinct) {
            process.nextTick(() => this.onDistinct(key, query, optionsOrCallback, callback));
            return;
        }
    }

    onDistinct: (key: string, query: Object, options: { readPreference: string; }, callback: (err: Error, result: any) => void) => void;

    initializeUnorderedBulkOp(): mongodb.UnorderedBulkOperation {

        return new MockBulk();
    }
}