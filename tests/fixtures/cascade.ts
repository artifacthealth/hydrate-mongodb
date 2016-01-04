import { Entity, ReferenceOne, ReferenceMany, Field } from "../../src/mapping/providers/decorators";
import {CascadeFlags} from "../../src/mapping/cascadeFlags";

@Entity()
export class SaveTest {

    @ReferenceMany({ target: SaveTest, cascade: CascadeFlags.Save })
    cascadeArray: SaveTest[];

    @ReferenceOne({ cascade: CascadeFlags.Save })
    cascadeField: SaveTest;

    // Do not cascade to these members

    @ReferenceMany({ target: SaveTest, cascade: CascadeFlags.Remove })
    controlArray: SaveTest[];

    @ReferenceOne({ cascade: CascadeFlags.Remove })
    controlField: SaveTest;

    static create(): SaveTest {

        var entity = new SaveTest();
        entity.cascadeArray = [ new SaveTest(), new SaveTest() ];
        entity.cascadeField = new SaveTest();
        entity.controlArray = [ new SaveTest(), new SaveTest() ];
        entity.controlField = new SaveTest();
        return entity;
    }
}

@Entity()
export class DetachTest {

    @ReferenceMany({ target: DetachTest, cascade: CascadeFlags.Save | CascadeFlags.Detach })
    cascadeArray: DetachTest[];

    @ReferenceOne({ cascade: CascadeFlags.Save | CascadeFlags.Detach })
    cascadeField: DetachTest;

    // Do not cascade to these members

    @ReferenceMany({ target: DetachTest, cascade: CascadeFlags.Save })
    controlArray: DetachTest[];

    @ReferenceOne({ cascade: CascadeFlags.Save })
    controlField: DetachTest;

    static create(): DetachTest {

        var entity = new DetachTest();
        entity.cascadeArray = [ new DetachTest(), new DetachTest() ];
        entity.cascadeField = new DetachTest();
        entity.controlArray = [ new DetachTest(), new DetachTest() ];
        entity.controlField = new DetachTest();
        return entity;
    }
}

@Entity()
export class RemoveTest {

    @ReferenceMany({ target: RemoveTest, cascade: CascadeFlags.Save | CascadeFlags.Remove })
    cascadeArray: RemoveTest[];

    @ReferenceOne({ cascade:  CascadeFlags.Save | CascadeFlags.Remove })
    cascadeField: RemoveTest;

    // Do not cascade to these members

    @ReferenceMany({ target: RemoveTest, cascade: CascadeFlags.Save })
    controlArray: RemoveTest[];

    @ReferenceOne({ cascade: CascadeFlags.Save })
    controlField: RemoveTest;

    static create(): RemoveTest {

        var entity = new RemoveTest();
        entity.cascadeArray = [ new RemoveTest(), new RemoveTest() ];
        entity.cascadeField = new RemoveTest();
        entity.controlArray = [ new RemoveTest(), new RemoveTest() ];
        entity.controlField = new RemoveTest();
        return entity;
    }
}

@Entity()
export class RemoveReferenceTest {

    @ReferenceOne({ cascade: CascadeFlags.Save | CascadeFlags.Remove })
    cascadeField: RemoveTest;

    @ReferenceOne({ cascade: CascadeFlags.Save })
    controlField: RemoveTest;
}
