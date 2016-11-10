import {Entity, Field, Embeddable} from "../../src/mapping/providers/decorators";
import {FetchType} from "../../src/mapping/mappingModel";

@Entity()
export class C {

}

@Embeddable()
export class B {

    @Field({ fetch: FetchType.Eager })
    c: C;
}

@Entity()
export class A {

    @Field()
    b: B;
}
