import { Entity, Converter, Field, DiscriminatorField, DiscriminatorValue } from "../../../src/mapping/providers/decorators";

@Entity()
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
@DiscriminatorValue("C")
export class Dog extends Animal {

}