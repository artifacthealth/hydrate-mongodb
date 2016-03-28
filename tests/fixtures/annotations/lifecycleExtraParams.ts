import { Entity, PostLoad } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @PostLoad()
    private _onLoadA(arg: number, callback: Callback): void {
        process.nextTick(callback);
    }
}
