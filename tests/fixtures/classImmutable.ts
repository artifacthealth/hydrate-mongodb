import {Entity, Field, Immutable} from "../../src/mapping/providers/decorators";

@Entity()
@Immutable()
export class Person {

    @Field()
    name: string;

    constructor(name: string) {

        this.name = name;
    }
}
