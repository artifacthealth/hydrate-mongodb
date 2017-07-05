import { Entity, Versioned, Index } from "../../../src/mapping/providers/decorators";

@Entity()
@Versioned(false)
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
@Versioned(true)
export class C {

}

@Entity()
export class D extends C {

    @Index()
    a: string;

    @Index({ order: -1 })
    g: number;

    @Index({ options: { dropDups: true } })
    c: number;
}
