interface PropertyConverter {

    convertToDocumentField(property: any): any;
    convertToObjectProperty(field: any): any;
}

export = PropertyConverter;