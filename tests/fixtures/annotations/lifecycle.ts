import { Entity, PostLoad } from "../../../src/mapping/providers/decorators";

var order = 0;

@Entity()
export class A {

    loadACalled = 0;
    loadAOrder: number;

    @PostLoad()
    private _onLoadA(): void {
        this.loadACalled++;
        this.loadAOrder = order++;
    }
}

@Entity()
export class B extends A {

    loadBCalled = 0;
    loadBOrder: number;

    @PostLoad()
    private _onLoadB(callback: Callback): void {
        this.loadBCalled++;
        this.loadBOrder = order++;

        process.nextTick(callback);
    }
}