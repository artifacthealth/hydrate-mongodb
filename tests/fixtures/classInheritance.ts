/**
 * @collection
 * @discriminatorField "__test"
 */
export class Animal {

    legs: number;
    eyes: { color: string }[];
    mate: Animal;
    name: Name;
}

/** @discriminatorValue "dog" */
export class Dog extends Animal {

    breed: string;
}

/** @discriminatorValue "cat" */
export class Cat extends Animal {

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