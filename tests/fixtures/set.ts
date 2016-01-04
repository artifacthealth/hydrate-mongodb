import { Entity, Field, ReferenceMany, EmbedMany, ChangeTracking, Embeddable } from "../../src/mapping/providers/decorators";
import {ChangeTrackingType} from "../../src/mapping/changeTrackingType";

@Entity()
export class A {

    @Field()
    field1: string;

    @EmbedMany(B)
    field2: Set<B>;
}

@Embeddable()
export class B {

    name: string;
}

