import { Entity, Field, Index, History, ElementType, InverseOf } from "../../src/mapping/providers/decorators";

@Entity()
@History()
@Index({ keys: [["name", 1]]})
export class Cat {

    id: string;

    @Field()
    name: string;

    @Field()
    parent: Cat;

    @Field()
    modified: Date;

    @ElementType("CatVersion")
    @InverseOf("entity")
    history: CatVersion[];

    constructor(name: string) {
        this.name = name;
    }
}

export interface CatVersion {

    entity: Cat;
    version: number;
}
