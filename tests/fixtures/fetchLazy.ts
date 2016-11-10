import {Entity, Field, Embeddable, Fetch} from "../../src/mapping/providers/decorators";
import {FetchType} from "../../src/mapping/mappingModel";

@Embeddable()
export class C {

    // lazy fetch on field in embeddable is ignored
    @Fetch(FetchType.Lazy)
    b: string;
}

@Entity()
export class A {

    @Field("_b")
    @Fetch(FetchType.Lazy)
    b: string;

    @Field()
    c: C;
}
