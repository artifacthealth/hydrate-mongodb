import { Entity, Transient } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @Transient()
    a: string;
}