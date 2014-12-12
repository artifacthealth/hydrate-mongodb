/**
 * @collection
 * @discriminatorField "type"
 */
export class Animal {

    a: string;
    b: string;
}

/**
 * @discriminatorValue "C"
 */
export class Cat extends Animal {

}

/**
 * @discriminatorValue "D"
 */
export class Dog extends Animal {

}