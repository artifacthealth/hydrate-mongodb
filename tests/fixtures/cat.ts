import { Entity, Field, ChangeTracking } from "../../src/mapping/providers/decorators";
import {ChangeTrackingType} from "../../src/mapping/changeTrackingType";
import {Embeddable} from "../../src/mapping/providers/decorators";

@Entity()
@ChangeTracking(ChangeTrackingType.Observe)
export class Cat {

    @Field()
    name: string;

    @Field()
    parent: Cat;

    constructor(name: string) {
        this.name = name;
    }
}
