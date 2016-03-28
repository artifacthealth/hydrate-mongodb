import { Entity, Field, ChangeTracking } from "../../src/mapping/providers/decorators";
import {ChangeTrackingType} from "../../src/mapping/mappingModel";

@Entity()
@ChangeTracking(ChangeTrackingType.Observe)
export class Cat {

    @Field()
    name: string;

    @Field()
    parent: Cat;

    @Field()
    modified: Date;

    constructor(name: string) {
        this.name = name;
    }
}
