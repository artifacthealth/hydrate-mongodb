import { Entity, Field, Index } from "../../../src/mapping/providers/decorators";

@Entity()
@Index({ keys: [ [ 'a', 1 ] ]})
@Index({ keys: [ ['a', 1], ['b', -1] ] })
export class A {

    a: string;
    b: string;
}

@Entity()
@Index({ keys: [ [ 'c', 'text' ] ]})
export class B extends A {

    c: string;
}

@Entity()
export class D {

    @Index()
    a: string;

    @Index({ order: -1 })
    g: number;

    @Index({ options: { dropDups: true } })
    c: number;
}