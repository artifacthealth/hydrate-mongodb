/**
 * @entity
 * @changeTracking "observe"
 */
class Cat {

    name: string;
    parent: Cat;

    constructor(name: string) {
        this.name = name;
    }
}

export = Cat;