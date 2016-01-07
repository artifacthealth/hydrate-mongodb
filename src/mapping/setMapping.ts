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
import {isSet} from "../core/collectionUtil";
import {ArrayMappingBase} from "./arrayMappingBase";

export class SetMapping extends ArrayMappingBase {

    constructor(public elementMapping: InternalMapping) {
        super(MappingFlags.Set, elementMapping);
    }

    protected resolveCore(context: ResolveContext): void {

        var property = context.currentProperty;

        if(property == "$") {
            // this is the positional operator
            if(context.resolveProperty(this.elementMapping, property)) {
                return; // reached end of path
            }
        }

        this.elementMapping.resolve(context);
    }

    protected toArray(value: any): any {

        return [...value];
    }

    protected toCollection(value: any): any {

        return new Set(value);
    }

    protected isEmpty(value: any): boolean {

        return !isSet(value) || value.size == 0;
    }

    protected isUnexpectedType(value: any): boolean {

        return !isSet(value);
    }

    protected getExpectedTypeName(): string {

        return "Set";
    }
}
