export enum MyEnum {

    value1,
    value2,
    value3
}

/** @entity */
export class B {

    /** @converter "MyEnumConverter" */
    a: MyEnum;
}

