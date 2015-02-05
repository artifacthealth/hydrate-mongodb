declare module "tsreflect" {

    /**
     * Load type information for an external module. Analogous to Node's require function.
     *
     * This method assumes that the .d.json file is in the same directory as the .js file that it contains type
     * information for. Just like Node's require function, if a relative path is specified, it is considered to be
     * relative to the source file that called require. Also like Node's require function, files are loaded
     * synchronously. If you would like to load type information asynchronously, see the load function.
     *
     * @param moduleName The name of the module to load.
     */
    function require(moduleName: string): Symbol;

    /**
     * Load type information for an internal module or global declarations. Analogous to TypeScript's reference tags.
     *
     * This method assumes that the .d.json file is in the same directory as the .js file that it contains type
     * information for. Just like TypeScript's /// <reference path="... tags, the path is considered to be relative to
     * the source file that called reference. Files are loaded synchronously. If you would like to load type information
     * asynchronously, see the load function.
     *
     * @param fileName The name of the file to load.
     */
    function reference(fileName: string): void;

    /**
     * Asynchronously load type information for the given filename pattern(s).
     *
     * This method assumes that the .d.json files are in the same directory as the .js file that they contain type
     * information for. The load method supports [glob](https://github.com/isaacs/node-glob) patterns for filename
     * matching. Relative paths are considered to be relative to the current working directory.
     *
     * Once all declaration files have been loaded, the callback is called with the symbols for any external
     * modules. If no external modules were loaded an empty array is passed to the callback. The list of symbols
     * does not include any global symbols that were loaded.
     *
     * @param path A string containing the path to load or an array containing the paths to load. Glob patterns are
     * supported.
     * @param callback Called when the load operation completes.
     */
    function load(path: string, callback: (err: DiagnosticError, symbols: Symbol[]) => void): void;
    function load(paths: string[], callback: (err: DiagnosticError, symbols: Symbol[]) => void): void;

    /**
     * Finds the symbol for the given entity name in the global scope. If a global symbol with the given name cannot
     * be found, undefined is returned.
     * @param entityName
     */
    function resolve(entityName: string): Symbol;

    /**
     * A named symbol.
     */
    interface Symbol {

        /**
         * Gets the name of the symbol.
         */
        getName(): string;

        /**
         * Gets the qualified name of the symbol.
         */
        getFullName(): string;

        /**
         * Gets the description of the symbol.
         */
        getDescription(): string;

        /**
         * Finds annotations with the specified name. If no name is specified, then all annotations
         * are returned.
         * @param name The name of the annotation to find.
         */
        getAnnotations(name?: string): Annotation[];

        /**
         * Returns true if the symbols has an annotation with the specified name; Otherwise, return false.
         * @param name The name of the annotation to find.
         */
        hasAnnotation(name: string): boolean;

        /**
         * Gets the type of the symbol.
         */
        getType(): Type;

        /**
         * Gets the declared type of the symbol.
         */
        getDeclaredType(): Type;

        /**
         * Gets all symbols exported by this symbol. This is used to get the members of a module or the static
         * members of a class.
         */
        getExports(): Symbol[];

        /**
         * Finds the symbol for the given entity name relative to the current symbol. If a symbol with the given name
         * cannot be found, undefined is returned.
         * @param entityName
         */
        resolve (entityName: string): Symbol;

        /**
         * Gets the value of the property, variable, or accessor represented by the symbol on the given object.
         * @param obj The object to get the value for.
         */
        getValue(obj: any): any;

        /**
         * Sets the value of the property, variable, or accessor represented by the symbol on the given object.
         * @param obj The object to set the value on.
         * @param value The value to set.
         */
        setValue(obj: any, value: any): void;

        /**
         * Returns true if the symbol is a variable; Otherwise, return false.
         */
        isVariable(): boolean;

        /**
         * Returns true if the symbol is a function; Otherwise, return false.
         */
        isFunction(): boolean;

        /**
         * Returns true if the symbol is a class; Otherwise, return false.
         */
        isClass(): boolean;

        /**
         * Returns true if the symbol is an interface; Otherwise, return false.
         */
        isInterface(): boolean;

        /**
         * Returns true if the symbol is an enum; Otherwise, return false.
         */
        isEnum(): boolean;

        /**
         * Returns true if the symbol is a module; Otherwise, return false.
         */
        isModule(): boolean;

        /**
         * Returns true if the symbol is an import; Otherwise, return false.
         */
        isImport(): boolean;

        /**
         * Returns true if the symbol is a type parameter; Otherwise, return false.
         */
        isTypeParameter(): boolean;

        /**
         * Returns true if the symbol is a class or interface property; Otherwise, return false.
         */
        isProperty(): boolean;

        /**
         * Returns true if the symbol is a class or interface method; Otherwise, return false.
         */
        isMethod(): boolean;

        /**
         * Returns true if the symbol is an accessor; Otherwise, return false.
         */
        isAccessor(): boolean;

        /**
         * Returns true if the symbol is a get accessor; Otherwise, return false.
         */
        isGetAccessor(): boolean;

        /**
         * Returns true if the symbol is a set accessor; Otherwise, return false.
         */
        isSetAccessor(): boolean;

        /**
         * Returns true if the symbol is an enum member; Otherwise, return false.
         */
        isEnumMember(): boolean;

        /**
         * Returns true if the symbol is a type alias; Otherwise, return false.
         */
        isTypeAlias(): boolean;
    }

    /**
     * A custom annotation.
     */
    interface Annotation {

        /**
         * The name of the annotation.
         */
        name: string;

        /**
         * The value of the annotation.
         */
        value: any;

        /**
         * Returns the name of the file that the annotation was declared in.
         */
        getDeclarationFileName(): string;
    }

    /**
     * A Type.
     */
    interface Type {

        /**
         * Gets the name of the type, if any.
         */
        getName(): string;

        /**
         * Gets the qualified name of the type, if any.
         */
        getFullName(): string;

        /**
         * Gets the description of the type.
         */
        getDescription(): string;

        /**
         * Gets all annotations declared for the type.
         * @param inherit True if annotations should be inherited from base types.
         */
        getAnnotations(inherit: boolean): Annotation[];

        /**
         * Finds annotations with the specified name. If no name is specified, then all annotations
         * are returns.
         * @param name The name of the annotation to find.
         * @param inherit True if annotations should be inherited from base types.
         */
        getAnnotations(name?: string, inherit?: boolean): Annotation[];

        /**
         * Returns true if the type has an annotation with the specified name; Otherwise, return false.
         * @param name The name of the annotation to find.
         * @param inherit True if base types should be checked for the annotation as well.
         */
        hasAnnotation(name: string, inherit?: boolean): boolean;

        getProperties(): Symbol[];
        getProperty(name: string): Symbol;
        getCallSignatures(): Signature[];
        getConstructSignatures(): Signature[];
        getStringIndexType(): Type;
        getNumberIndexType(): Type;

        isIdenticalTo(target: Type, diagnostics?: Diagnostic[]): boolean;
        isSubtypeOf(target: Type, diagnostics?: Diagnostic[]): boolean;
        isAssignableTo(target: Type, diagnostics?: Diagnostic[]): boolean;

        /**
         * Returns true if the target type if a subclass of the current type; Otherwise, return false.
         * @param target The target type.
         */
        isSubclassOf(target: Type): boolean;

        /**
         * Gets the base class of a class type.
         */
        getBaseClass(): Type;

        /**
         * Gets the base types of a class or interface type.
         */
        getBaseTypes(): Type[];

        /**
         * Returns true if the target type is a base type of the current type; Otherwise, return false.
         * @param target The target type.
         */
        hasBaseType(target: Type): boolean;

        /**
         * Returns true if the type is a class; Otherwise, return false.
         */
        isClass(): boolean;

        /**
         * Returns true if the type is an interface; Otherwise, return false.
         */
        isInterface(): boolean;

        /**
         * Returns true if the type is a tuple; Otherwise, return false.
         */
        isTuple(): boolean;

        /**
         * Returns true if the type is a union type; Otherwise, return false.
         */
        isUnion(): boolean;

        /**
         * Returns true if the type is an array; Otherwise, return false.
         */
        isArray(): boolean;

        /**
         * Returns true if the type is an index type; Otherwise, return false.
         */
        isIndex(): boolean;

        /**
         * Returns true if the type is anonymous; Otherwise, return false.
         */
        isAnonymous(): boolean;

        /**
         * Returns true if the type is a generic reference; Otherwise, return false.
         */
        isReference(): boolean;

        /**
         * Returns true if the type is an enum; Otherwise, return false.
         */
        isEnum(): boolean;

        /**
         * Returns true if the type is a string literal; Otherwise, return false.
         */
        isStringLiteral(): boolean;

        /**
         * Returns true if the type is a type parameter; Otherwise, return false.
         */
        isTypeParameter(): boolean;

        /**
         * Returns true if the type is the intrinsic any type; Otherwise, return false.
         */
        isAny(): boolean;

        /**
         * Returns true if the type is the intrinsic string type; Otherwise, return false.
         */
        isString(): boolean;

        /**
         * Returns true if the type is the intrinsic number type; Otherwise, return false.
         */
        isNumber(): boolean;

        /**
         * Returns true if the type is the intrinsic boolean type; Otherwise, return false.
         */
        isBoolean(): boolean;

        /**
         * Returns true if the type is the intrinsic void type; Otherwise, return false.
         */
        isVoid(): boolean;

        /**
         * Returns true if the type is an intrinsic type; Otherwise, return false.
         */
        isIntrinsic(): boolean;

        /**
         * Returns true if the type is an object type; Otherwise, return false.
         */
        isObjectType(): boolean;

        /**
         * Gets the numeric enum value for the given member name.
         * @param value The enum member name to get the value for.
         * @param ignoreCase True if case should be ignored when finding the member name.
         */
        getEnumValue(value: string, ignoreCase?: boolean): number;

        /**
         * Gets the enum member name for the given numeric enum value.
         * @param value The numeric value to get the name for.
         */
        getEnumName(value: number): string;

        /**
         * Gets a list of enum member names.
         */
        getEnumNames(): string[];

        /**
         * Gets the element type for an array type.
         */
        getElementType(): Type;

        /**
         * Gets the element types a tuple type.
         */
        getElementTypes(): Type[];

        /**
         * Creates an instance of a class. If arguments are provided then the constructor is called; Otherwise,
         * the object is created without calling the constructor. To call a parameter-less constructor, pass an empty
         * array to args.
         * @param args The constructor arguments.
         */
        createInstance(args?: any[]): any;

        /**
         * Gets the JavaScript constructor for a class type.
         */
        getConstructor(): Function;
    }

    /**
     * A call signature.
     */
    interface Signature {

        /**
         * Gets a description of the signature.
         */
        getDescription(): string;


        /**
         * Finds annotations with the specified name. If no name is specified, then all annotations
         * are returned.
         * @param name The name of the annotation to find.
         */
        getAnnotations(name?: string): Annotation[];

        /**
         * Returns true if the symbols has an annotation with the specified name; Otherwise, return false.
         * @param name The name of the annotation to find.
         */
        hasAnnotation(name: string): boolean;

        /**
         * Gets a list of all parameters for the call signature.
         */
        getParameters(): Symbol[];

        /**
         * Gets a parameter for the signature with the specified name. If no parameter matches the name then undefined
         * is returned.
         * @param name The parameter name to find.
         */
        getParameter(name: string): Symbol;

        /**
         * Gets the return type of the signature.
         */
        getReturnType(): Type;
    }

    /**
     * Diagnostic information.
     */
    interface Diagnostic {

        filename?: string;
        messageText: string;
        code: number;
    }

    /**
     * Extension of standard Error that includes diagnostic information.
     */
    interface DiagnosticError extends Error {

        /**
         * Array of Diagnostics that provides details on the error that occurred.
         */
        diagnostics: Diagnostic[];
    }
}