import {Entity, Field} from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Field()
    id: string;
}
