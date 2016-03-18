import { Entity, Field, ChangeTracking } from "../../src/mapping/providers/decorators";
import {ChangeTrackingType} from "../../src/mapping/mappingModel";

@Entity()
@ChangeTracking(ChangeTrackingType.DeferredExplicit)
export class Dog {

    @Field()
    name: string;

    //@Field()
    anyType: any;

    constructor(name: string) {
        this.name = name;
    }
}
