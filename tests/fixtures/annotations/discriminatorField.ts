import { Entity, Converter, Field, DiscriminatorField, DiscriminatorValue } from "../../../src/mapping/providers/decorators";

@Entity()
@DiscriminatorField("type")
export class Animal {

    @Field()
    a: string;

    @Field()
    b: string;
}

@Entity()
@DiscriminatorValue("C")
export class Cat extends Animal {

}

@Entity()
@DiscriminatorValue("D")
export class Dog extends Animal {

}