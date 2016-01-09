import { Entity, Field  } from "../../src/mapping/providers/decorators";

import {Cat} from "./cat";

@Entity()
export class Kitten extends Cat {

    @Field()
    ageInWeeks: number;
}
