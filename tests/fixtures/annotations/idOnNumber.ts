import { Entity, Field, Id } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Id()
    id: number;
}

