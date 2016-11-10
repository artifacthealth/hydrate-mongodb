import {Entity, Field, Embeddable} from "../../src/mapping/providers/decorators";
import {FetchType} from "../../src/mapping/mappingModel";

@Embeddable()
export class C {

    // lazy fetch on field in embeddable is ignored
    @Field({ fetch: FetchType.Lazy })
    b: string;
}

@Entity()
export class A {

    @Field({ name: "_b", fetch: FetchType.Lazy })
    b: string;

    @Field()
    c: C;
}
