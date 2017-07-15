import { Entity, Field } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Field()
    default: string;

    @Field({ nullable: false })
    notNullable: string;

    @Field({ nullable: true })
    nullable: string;
}
