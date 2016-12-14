import { Entity, Field, ChangeTracking } from "../../src/mapping/providers/decorators";
import {ChangeTrackingType} from "../../src/mapping/mappingModel";

@Entity()
export class Cat {

    id: string;

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
