/// <reference path="../../../typings/node.d.ts" />

import { Entity, Field } from "../../../src/mapping/providers/decorators";

@Entity()
export default class ClassWithBuffer {

    @Field()
    data: Buffer;
}
