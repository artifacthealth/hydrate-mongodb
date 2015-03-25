/** @entity */
export class SaveTest {

    /** @cascade "save" */
    cascadeArray: SaveTest[];

    /** @cascade "save" */
    cascadeField: SaveTest;

    // Do not cascade to these members

    /** @cascade "remove" */
    controlArray: SaveTest[];

    /** @cascade "remove" */
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

/** @entity */
export class DetachTest {

    /** @cascade "save, detach" */
    cascadeArray: DetachTest[];

    /** @cascade "save, detach" */
    cascadeField: DetachTest;

    // Do not cascade to these members

    /** @cascade "save" */
    controlArray: DetachTest[];

    /** @cascade "save" */
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

/** @entity */
export class RemoveTest {

    /** @cascade "save, remove" */
    cascadeArray: RemoveTest[];

    /** @cascade "save, remove" */
    cascadeField: RemoveTest;

    // Do not cascade to these members

    /** @cascade "save" */
    controlArray: RemoveTest[];

    /** @cascade "save" */
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

/** @entity */
export class RemoveReferenceTest {

    /** @cascade "save, remove" */
    cascadeField: RemoveTest;

    /** @cascade "save" */
    controlField: RemoveTest;
}
