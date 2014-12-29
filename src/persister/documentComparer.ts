import Changes = require("./changes");

// TODO: ignore fields added by persister such as __v, __l
module DocumentComparer {

    export function compare(originalDocument: any, document: any): Changes {

        var changes: Changes = {};
        compareObjects(originalDocument, document, changes);
        return changes;
    }

    function compareObjects(o1: any, o2: any, changes: any, path?: string): void {

        if (o1 === o2 || (o1 !== o1 && o2 !== o2)) return;

        if (o1 !== null && o2 !== null) {
            if (typeof o1 === "object" && typeof o2 === "object") {
                // TODO: confirm that instanceof is reliable in NodeJS. Apparently it is not reliable in multi-frame browser environments but that is not an issue in Node
                if (o1 instanceof Date) {
                    if (o2 instanceof Date) {
                        if(o1.getTime() == o2.getTime()) return;
                    }
                } else if (o1 instanceof RegExp) {
                    if (o2 instanceof RegExp) {
                        if(o1.toString() == o2.toString()) return;
                    }
                } else {
                    var base = path ? path + "." : "";
                    if (Array.isArray(o1)) {
                        if (Array.isArray(o2)) {
                            if (o1.length == o2.length) {
                                for (var i = 0, l = o1.length; i < l; i++) {
                                    // check if array element has changed
                                    compareObjects(o1[i], o2[i], changes, base + i);
                                }
                                return;
                            }
                        }
                    } else if (!Array.isArray(o2)) {
                        // look for removed fields
                        for(var key in o1) {
                            if(o1.hasOwnProperty(key) && o1[key] !== undefined && !o2.hasOwnProperty(key)) {
                                // removed field
                                (changes["$unset"] || (changes["$unset"] = {}))[base + key] = 1;
                            }
                        }

                        // look for new or changed fields
                        for(var key in o2) {
                            if(o2.hasOwnProperty(key) && o2[key] !== undefined) {
                                if (!o1.hasOwnProperty(key)) {
                                    // new field
                                    (changes["$set"] || (changes["$set"] = {}))[base + key] = o2[key];
                                }
                                else {
                                    // check if field has changed
                                    compareObjects(o1[key], o2[key], changes, base + key);
                                }
                            }
                        }
                        return;
                    }
                }
            }
        }

        // changed field
        (changes["$set"] || (changes["$set"] = {}))[path] = o2;
    }

    // Based on AngularJS equals function.
    function equals(o1: any, o2: any): any {

        if (o1 === o2) return true;
        if (o1 === null || o2 === null) return false;
        if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN

        if (typeof o1 === "object" && typeof o2 === "object") {
            if (Array.isArray(o1)) {
                if (!Array.isArray(o2)) return false;

                if (o1.length == o2.length) {
                    for(var i = 0, l = o1.length; i < l; i++) {
                        if (!equals(o1[i], o2[i])) return false;
                    }
                    return true;
                }
            } else if (o1 instanceof Date) {
                if (!(o2 instanceof Date)) return false;
                return o1.getTime() == o2.getTime();
            } else if ((o1 instanceof RegExp) && (o2 instanceof RegExp)) {
                return o1.toString() == o2.toString();
            } else {
                if (Array.isArray(o2)) return false;

                for(var key in o1) {
                    if(o1.hasOwnProperty(key) && o1[key] !== undefined) {
                        if (!equals(o1[key], o2[key])) return false;
                    }
                }

                for(key in o2) {
                    if(o2.hasOwnProperty(key) && !o1.hasOwnProperty(key) && o2[key] !== undefined) {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    }
}

export = DocumentComparer;