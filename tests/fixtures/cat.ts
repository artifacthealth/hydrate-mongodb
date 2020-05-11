import { Entity, Field, Index, ElementType } from "../../src/mapping/providers/decorators";

@Entity()
@Index({ keys: [["name", 1]]})
export class Cat {

    id: string;

    @Field()
    name: string;

    @Field()
    parent: Cat;

    @Field()
    modified: Date;

    @ElementType(Number)
    payload: number[]

    constructor(name: string) {
        this.name = name;
    }
}
