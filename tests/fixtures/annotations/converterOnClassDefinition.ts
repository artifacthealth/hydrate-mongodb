import { Entity, Converter, Field } from "../../../src/mapping/providers/decorators";

@Converter("PointConverter")
export class Point {

    constructor(public x: number, public y: number) {

    }
}

@Entity()
export class B {

    @Field()
    a: Point;
}

