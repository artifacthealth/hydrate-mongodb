import { Entity, PostLoad } from "../../../src/mapping/providers/decorators";

@Entity()
export class A {

    @PostLoad()
    private _onLoadA(callback: Callback): void {
        callback();
    }
}
