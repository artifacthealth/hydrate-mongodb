import { Entity, Converter, Field } from "../../../src/mapping/providers/decorators";

export class Point {

    constructor(public x: number, public y: number) {

    }
}

@Entity()
export class B {

    @Converter("PointConverter")
    a: Point;
}

