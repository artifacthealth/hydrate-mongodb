export class Point {

    constructor(public x: number, public y: number) {

    }
}

/** @entity */
export class B {

    /** @converter "PointConverter" */
    a: Point;
}

