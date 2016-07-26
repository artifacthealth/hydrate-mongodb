import { Entity, Embeddable, Field, ChangeTracking, Converter, Enumerated, Type, ElementType, Versioned, Cascade, InverseOf } from "../../src/mapping/providers/decorators";
import {ChangeTrackingType} from "../../src/mapping/mappingModel";
import {CascadeFlags} from "../../src/mapping/mappingModel";
import {EnumType} from "../../src/mapping/enumType";
import {PropertyConverter} from "../../src/mapping/mappingModel";

export class PhoneTypeConverter implements PropertyConverter {

    convertToDocumentField(property: any): any {

        switch(property) {
            case PhoneType.Work:
                return "W";
            case PhoneType.Home:
                return "H";
        }
    }

    convertToObjectProperty(field: any): any {

        switch(field) {
            case "W":
                return PhoneType.Work;
            case "H":
                return PhoneType.Home;
        }
    }
    
    areEqual(field1: any, field2: any): boolean {

        return field1 === field2;
    }
}

@Embeddable()
export class Address {

    @Field()
    street1: string;

    @Field()
    street2: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    zip: string;
}


export enum Gender {
    Female,
    Male,
    Other,
    Unknown,
    Ambiguous,
    NotApplicable
}

export enum PhoneType {

    Work,
    Home
}

@Embeddable()
export class Phone {

    @Field()
    number: string;

    @Enumerated(PhoneType)
    type: PhoneType;

    constructor(number: string, type: PhoneType) {

        this.number = number;
        this.type = type;
    }
}

@Embeddable()
export class WorkPhone extends Phone {

    @Field({ name: "extension" })
    private _extension: string;

    get extension(): string {
        return this._extension;
    }

    constructor(number: string, extension: string) {
        super(number, PhoneType.Work);

        this._extension = extension;
    }
}

@Entity()
@ChangeTracking(ChangeTrackingType.DeferredImplicit)
export class Party {

    @Field({ name: "name" })
    protected _name: string;

    get name(): string {
        return this._name;
    }

    constructor (name: string) {
        this._name = name;
    }
}

@Embeddable()
export class PersonName {

    @Field()
    first: string;

    @Field()
    last: string;

    @Field()
    middle: string;

    @Field()
    prefix: string;

    @Field()
    suffix: string;

    @Field()
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

@Entity()
export class Person extends Party {

    @Field()
    createdAt: Date;

    @Field()
    personName: PersonName;

    @ElementType(String)
    additionalNames: PersonName[];

    @Field()
    birthDate: Date;

    @Field()
    age: number;

    @ElementType(String)
    aliases: string[];

    //test: Set;

    @Field({ nullable: true })
    @Enumerated(Gender)
    gender: Gender;

    @Field()
    race: string;

    @Field()
    address: Address;

    @ElementType(Phone)
    phones: Phone[];

    @Field()
    email: string;

    @Converter(new PhoneTypeConverter())
    preferredPhone: PhoneType;

    @Field()
    workPhone: WorkPhone;

    @ElementType(Person)
    @Cascade(CascadeFlags.Save | CascadeFlags.Remove)
    parents: Person[];

    @ElementType(Person)
    @InverseOf("parents")
    @Cascade(CascadeFlags.Save | CascadeFlags.Remove)
    children: Person[];

    // TODO: how to handle
    attributes: { [ name: string ]: string };

    constructor(name: PersonName) {
        super(name.toString());

        this.personName = name;
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

@Entity()
export class Organization extends Party {

    constructor(name: string) {
        super(name);
    }

    set name(value: string) {
        this._name = value;
    }
}


@Entity()
@Versioned(false)
export class User {

    @Field()
    password: string;

    @Field()
    person: Person;

    @Field()
    username: string

    constructor(username: string) {

        this.username = username;
    }
}



