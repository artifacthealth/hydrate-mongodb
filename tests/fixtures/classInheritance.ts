import { Entity, Embeddable, Field, DiscriminatorField, DiscriminatorValue } from "../../src/mapping/providers/decorators";

@Entity()
@DiscriminatorField("__test")
export class Animal {

    @Field()
    legs: number;

    @Field()
    eyes: Eye[];

    @Field()
    mate: Animal;

    @Field()
    name: Name;
}

@Embeddable()
export class Eye {

    @Field()
    color: string;
}

@DiscriminatorValue("dog")
export class Dog extends Animal {

    @Field()
    breed: string;
}

@DiscriminatorValue("cat")
export class Cat extends Animal {

    @Field()
    color: string;
}

export class Name {

    first: string;
    last: string;
    test: {
        name: string;
    }

    test2: { a: string }[];
}