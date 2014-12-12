/**
 * @collection
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
 * @discriminatorValue "C"
 */
export class Dog extends Animal {

}