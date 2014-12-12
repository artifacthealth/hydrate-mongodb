class ClassSimple {

    a: string;
    b: number;
    c: boolean;

    /** transient */
    d: Date;

    /** persistent */
    e: RegExp;
}

class ClassSimple2 extends ClassSimple {

}

export = ClassSimple;