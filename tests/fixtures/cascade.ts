/** @collection */
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
