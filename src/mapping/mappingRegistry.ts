import {ClassMapping} from "./classMapping";
import {EntityMapping} from "./entityMapping";
import {Constructor} from "../core/constructor";
import {MappingFlags} from "./mappingFlags";
import {MappingProvider} from "./providers/mappingProvider";
import {ResultCallback} from "../core/resultCallback";

export class MappingRegistry {

    private _mappings: WeakMap<Function, Promise<ClassMapping>> = new WeakMap();
    private _providers: MappingProvider[];

    constructor(providers?: MappingProvider[]) {

        this._providers = providers;
    }

    addMapping(mapping: ClassMapping): void {

        if(!mapping.classConstructor) {
            throw new Error("Class mapping is missing classConstructor.");
        }

        if(this._mappings.has(mapping.classConstructor)) {
            throw new Error("Mapping '" + mapping.name + "' has already been registered.");
        }

        this._mappings.set(mapping.classConstructor, new Promise((resolve) => resolve(mapping)));
    }

    getMappingForObject(obj: any, callback: ResultCallback<ClassMapping>): void {

        this.getMappingForConstructor(obj.constructor, callback);
    }

    getMappingForConstructor(ctr: Constructor<any>, callback: ResultCallback<ClassMapping>): void {

        var promise = this._mappings.get(<any>ctr);
        if(!promise) {
            var resolved = false;
            promise = new Promise((resolve, reject) => {
                var self = this;

                next(0);

                function next(index: number) {
                    if(index >= self._providers.length) {
                        resolve(null);
                    }

                    self._providers[index].getMapping(ctr, (err, mapping) => {
                        if(err) return reject(err);

                        if(mapping) {
                            resolve(mapping);
                        }
                        else {
                            next(index++);
                        }
                    });
                }
            });
            this._mappings.set(<any>ctr, promise);
        }

        promise.then((mapping) => callback(null, mapping), (err) => callback(err));
    }
}
