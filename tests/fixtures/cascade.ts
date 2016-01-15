import { Entity, Type, ElementType, Cascade, Field } from "../../src/mapping/providers/decorators";
import {CascadeFlags} from "../../src/mapping/cascadeFlags";

@Entity()
export class SaveTest {

    @ElementType(SaveTest)
    @Cascade(CascadeFlags.Save)
    cascadeArray: SaveTest[];

    @Cascade(CascadeFlags.Save)
    cascadeField: SaveTest;

    // Do not cascade to these members

    @ElementType(SaveTest)
    @Cascade(CascadeFlags.Remove)
    controlArray: SaveTest[];

    @Cascade(CascadeFlags.Remove)
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

    @ElementType(DetachTest)
    @Cascade(CascadeFlags.Save | CascadeFlags.Detach)
    cascadeArray: DetachTest[];

    @Cascade(CascadeFlags.Save | CascadeFlags.Detach)
    cascadeField: DetachTest;

    // Do not cascade to these members

    @ElementType(DetachTest)
    @Cascade(CascadeFlags.Save)
    controlArray: DetachTest[];

    @Cascade(CascadeFlags.Save)
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

    @ElementType(RemoveTest)
    @Cascade(CascadeFlags.Save | CascadeFlags.Remove)
    cascadeArray: RemoveTest[];

    @Cascade(CascadeFlags.Save | CascadeFlags.Remove)
    cascadeField: RemoveTest;

    // Do not cascade to these members

    @ElementType(RemoveTest)
    @Cascade(CascadeFlags.Save)
    controlArray: RemoveTest[];

    @Cascade(CascadeFlags.Save)
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

    @Cascade(CascadeFlags.Save | CascadeFlags.Remove)
    cascadeField: RemoveTest;

    @Cascade(CascadeFlags.Save)
    controlField: RemoveTest;
}
