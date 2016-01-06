import {getClassAnnotations, hasClassAnnotation, getPropertyNames, getBaseType} from "./reflectUtil";
import {Constructor} from "./constructor";
import {Symbol} from "./symbol";
import {ReflectContext} from "./reflectContext";

export class Type {

    ctr: Constructor<any>;
    name: string;

    private _context: ReflectContext;

    constructor(context: ReflectContext, ctr: Constructor<any>) {

        this.ctr = ctr;
        this.name = ctr.name;
        this._context = context;
    }

    getAnnotations(inherit?: boolean): any[];
    getAnnotations<T>(annotationCtr: Constructor<T>, inherit?: boolean) : T[];
    getAnnotations(inheritOrAnnotationCtr?: any, inherit?: boolean): any[] {

        return getClassAnnotations(this.ctr, inheritOrAnnotationCtr, inherit);
    }

    hasAnnotation<T>(annotationCtr: Constructor<T>, inherit?: boolean) : boolean {

        return hasClassAnnotation(this.ctr, annotationCtr, inherit);
    }

    private _properties: Symbol[];

    get properties(): Symbol[] {

        if(!this._properties) {
            this._properties = getPropertyNames(this.ctr).map(name => {
                return new Symbol(this._context, this, name);
            });
        }

        return this._properties;
    }

    private _baseType: Type;

    get baseType(): Type {

        if(this._baseType === undefined) {
            this._baseType = this._context.getType(getBaseType(this.ctr));
        }
        return this._baseType;
    }

    get isNumber(): boolean {
        return this.ctr.name == "Number";
    }

    get isArray(): boolean {
        return this.ctr.name == "Array";
    }

    get isCollection(): boolean {
        return this.isArray;
    }
}

