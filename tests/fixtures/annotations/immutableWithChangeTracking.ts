import {Entity, Field, Immutable, ChangeTracking} from "../../../src/mapping/providers/decorators";
import {ChangeTrackingType} from "../../../src/mapping/mappingModel";

@Entity()
@Immutable()
@ChangeTracking(ChangeTrackingType.DeferredImplicit)
export class Animal {

    @Field()
    a: string;

    @Field()
    b: string;
}
