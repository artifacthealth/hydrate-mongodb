import {Entity, Field, Immutable, Embeddable} from "../../../src/mapping/providers/decorators";

@Embeddable()
@Immutable()
export class Name {

    @Field()
    first: string;

    @Field()
    last: string;

    constructor(first: string, last: string) {

        this.first = first;
        this.last = last;
    }
}

@Entity()
@Immutable()
export class Person {

    @Field()
    name: Name;

    constructor(name: Name) {

        this.name = name;
    }
}
