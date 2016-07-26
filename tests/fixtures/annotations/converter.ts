import {Entity, Converter, Field} from "../../../src/mapping/providers/decorators";
import {PropertyConverter} from "../../../src/mapping/mappingModel";

export enum MyEnum {

    value1,
    value2,
    value3
}

class SomeConverter implements PropertyConverter {

    convertToDocumentField(property: any): any {

        switch(property) {
            case MyEnum.value1:
                return "A";
            case MyEnum.value2:
                return "B";
            case MyEnum.value3:
                return "C";
        }
    }

    convertToObjectProperty(field: any): any {

        switch(field) {
            case "A":
                return MyEnum.value1;
            case "B":
                return MyEnum.value2;
            case "C":
                return MyEnum.value3;
        }
    }

    areEqual(field1: any, field2: any): boolean {

        return field1 === field2;
    }
}

@Entity()
export class B {

    // named converter
    @Converter("MyEnumConverter")
    a: MyEnum;

    // converter instance
    @Converter(new SomeConverter())
    b: MyEnum;

    // converter constructor
    @Converter(SomeConverter)
    c: MyEnum;
}

