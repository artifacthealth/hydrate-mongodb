import * as Async from "../core/async";
import {InternalMapping} from "./internalMapping";
import {MappingBase} from "./mappingBase";
import {MappingError} from "./mappingError";
import {MappingFlags} from "./mappingFlags";
import {Changes} from "./changes";
import {Reference} from "../reference";
import {PropertyFlags} from "./propertyFlags";
import {InternalSession} from "../internalSession";
import {ResultCallback} from "../core/resultCallback";
import {EntityMapping} from "./entityMapping";
import {ResolveContext} from "./resolveContext";
import {TupleMapping} from "./tupleMapping";
import {ReadContext} from "./readContext";
import {Observer} from "../observer";
import {ArrayMappingBase} from "./arrayMappingBase";

export class ArrayMapping extends ArrayMappingBase {

    constructor(public elementMapping: InternalMapping) {
        super(MappingFlags.Array, elementMapping);
    }

    protected resolveCore(context: ResolveContext): void {

        var property = context.currentProperty,
            index: number;

        if(property == "$" || ((index = parseInt(property)) === index)) {
            // this is the positional operator or an index
            if(context.resolveProperty(this.elementMapping, property)) {
                return; // reached end of path
            }
        }

        this.elementMapping.resolve(context);
    }

    private _nestedDepth: number;

    /**
     * Gets the maximum depth of nested array and tuple mappings
     */
    get nestedDepth(): number {
        if(this._nestedDepth === undefined) {
            this._nestedDepth = this._findNestedDepth(0, this);
        }
        return this._nestedDepth;
    }

    private _findNestedDepth(depth: number, mapping: InternalMapping): number {

        if(mapping.flags & MappingFlags.Array) {
            return this._findNestedDepth(depth + 1, (<ArrayMapping>mapping).elementMapping);
        }
        else if (mapping.flags & MappingFlags.Tuple) {
            var elementMappings = (<TupleMapping>mapping).elementMappings;
            for(var i = 0, l = elementMappings.length; i < l; i++) {
                depth = Math.max(depth, this._findNestedDepth(depth + 1, elementMappings[i]));
            }
        }

        return depth;
    }

    protected toArray(value: any): any {

        return value;
    }

    protected toCollection(value: any): any {

        return value;
    }

    protected isEmpty(value: any): boolean {

        return !Array.isArray(value) || value.length == 0;
    }

    protected isUnexpectedType(value: any): boolean {

        return !Array.isArray(value);
    }

    protected getExpectedTypeName(): string {

        return "Array";
    }
}
