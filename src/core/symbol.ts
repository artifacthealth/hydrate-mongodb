import {getPropertyAnnotations, hasPropertyAnnotation, getPropertyType} from "./reflectUtil";
import {Type} from "./type";
import {ReflectContext} from "./reflectContext";
import {Constructor} from "./constructor";

export class Symbol {

    parent: Type;
    name: string;
    private _context: ReflectContext;

    constructor(context: ReflectContext, parent: Type, name: string) {

        this._context = context;
        this.parent = parent;
        this.name = name;
    }

    private _type: Type;
    get type(): Type {

        if(!this._type) {
            this._type = this._context.getType(<Constructor<any>>getPropertyType(this.parent.ctr.prototype, this.name));
        }
        return this._type;
    }

    getAnnotations(): any[];
    getAnnotations<T>(annotationCtr: Constructor<T>) : T[];
    getAnnotations(annotationCtr?: any): any[] {

        return getPropertyAnnotations(this.parent.ctr, this.name, annotationCtr);
    }

    hasAnnotation(annotationCtr: Constructor<any>) : boolean {

        return hasPropertyAnnotation(this.parent.ctr, this.name, annotationCtr);
    }
}
