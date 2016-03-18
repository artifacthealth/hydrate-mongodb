import {MappingError} from "./mappingError";
import {VirtualMapping} from "./virtualMapping";
import {InternalSession} from "../sessionImpl";
import {ReadContext} from "./readContext";
import {IdentityGenerator} from "../config/configuration";
import {WriteContext} from "./writeContext";

// TODO: Not sure I like how this is implemented. A few thoughts:
//  1. If we want to allow queries against these types of fields then we need to implement write so the query document
//      can be serialized. However, we don't want the values to be written to the database so then we need to distinguish
//      between are write to a query document and a write to a persistent document. We don't do that right now.
//  2. Perhaps instead of a mapper we use a converter and the IdAnnotation causes a converter to be added to the property
//      and the read-only flag set.
//  3. When the object is saved to the session, the _id value is set but we need to set the value for the property
//     annotated with @Id() as well.
/**
 * @hidden
 */
export class IdentityMapping extends VirtualMapping {

    read(context: ReadContext, value: any): any {

        if(value == null) return null;

        // We don't bother validating the identity, other than that there is one, because the identity is validated by
        // the EntityMapping.
        if(value == null) {
            context.addError("Missing identity.");
            return;
        }

        return value.toString();
    }

    write(context: WriteContext, value: any): any {

        if(value == null) return null;

        // do nothing
    }
}
