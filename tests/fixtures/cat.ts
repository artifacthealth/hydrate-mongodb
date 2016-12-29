import { Entity, Field, Index } from "../../src/mapping/providers/decorators";

@Entity()
export class Cat {

    id: string;

    @Index()
    name: string;

    @Field()
    parent: Cat;

    @Field()
    modified: Date;

    constructor(name: string) {
        this.name = name;
    }
}
