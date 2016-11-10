import {Entity, Field, Embeddable, Fetch} from "../../src/mapping/providers/decorators";
import {FetchType} from "../../src/mapping/mappingModel";

@Entity()
export class C {

}

@Embeddable()
export class B {

    @Fetch(FetchType.Eager)
    c: C;
}

@Entity()
export class A {

    @Field()
    b: B;
}
