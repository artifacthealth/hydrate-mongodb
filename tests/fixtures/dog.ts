import { Entity, Field, ChangeTracking } from "../../src/mapping/providers/decorators";
import {ChangeTrackingType} from "../../src/mapping/changeTrackingType";

@Entity()
@ChangeTracking(ChangeTrackingType.DeferredExplicit)
export default class Dog {

    @Field()
    name: string;

    //@Field()
    anyType: any;

    constructor(name: string) {
        this.name = name;
    }
}
