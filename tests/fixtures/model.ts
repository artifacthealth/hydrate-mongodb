/** @collection */
export class Party {

    /** @field "name" */
    protected _name: string;
    get name(): string {
        return this._name;
    }

    constructor (name: string) {
        this._name = name;
    }
}

export class Person extends Party {

    personName: PersonName;

    birthDate: Date;

    /** @field nullable: true */
    gender: Gender;
    race: string;

    address: Address;
    phones: Phone[];
    email: string;

    /** @cascade "persist" */
    parents: Person[];
    children: Person[];

    attributes: { [ name: string ]: string };

    constructor(name: PersonName) {
        this.personName = name;
        super(name.toString());
    }

    addParent(parent: Person): void {
        if(!this.parents) {
            this.parents = [];
        }
        if(!parent.children) {
            parent.children = [];
        }
        if(parent.children.indexOf(this) == -1) {
            parent.children.push(this);
        }
        this.parents.push(parent);
    }

    addAttribute(name: string, value: string): void {
        if(!this.attributes) {
            this.attributes = {};
        }
        this.attributes[name] = value;
    }
}

export class Organization extends Party {

    constructor(name: string) {
        super(name);
    }

    set name(value: string) {
        this._name = value;
    }
}

export class PersonName {

    first: string;
    last: string;
    middle: string;
    prefix: string;
    suffix: string;
    degree: string;

    constructor(last: string, first?: string, middle?: string) {
        this.last = last;
        this.first = first;
        this.middle = middle;
    }

    toString(): string {
        var ret = "";

        if(this.prefix) {
            ret += this.prefix + ". ";
        }

        ret += this.last;

        if(this.first) {
            ret += ", " + this.first;
        }

        if(this.middle) {
            ret += " " + this.middle;
            if(this.middle.length == 1) {
                ret += ".";
            }
        }

        if(this.suffix) {
            ret += ", " + this.suffix;
        }

        if(this.degree) {
            ret += ", " + this.degree;
        }

        return ret;
    }
}

export enum Gender {
    Female,
    Male,
    Other,
    Unknown,
    Ambiguous,
    NotApplicable
}

export class Address {

    street1: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
}

export enum PhoneType {

    Work,
    Home
}

export class Phone {

    constructor(public number: string, public type: PhoneType) {

    }
}