declare module "tsreflect" {

    /**
     * Load type information for an external module in the global context. Analogous to Node's require function.
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
     * Load type information for an internal module or global declarations in the global context. Analogous to
     * TypeScript's reference tags.
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
     * Asynchronously load type information for the given filename pattern(s) in the global context.
     *
     * This method assumes that the .d.json files are in the same directory as the .js file that they contain type
     * information for. The load method supports [glob](https://github.com/isaacs/node-glob) patterns for filename
     * matching. Relative paths are considered to be relative to the current working directory.
     *
     * Once all declaration files have been loaded, the callback is called with the symbols for any external
     * modules and any top level global declarations in the processed files.
     *
     * @param path The path(s) to load. Glob patterns are supported.
     * @param callback Called when the load operation completes.
     */
    function load(path: string | string[], callback: (err: DiagnosticError, symbols: Symbol[]) => void): void;

    /**
     * Finds the symbol for the given entity name in the global context. If a global symbol with the given name cannot
     * be found, an exception is thrown.
     * @param entityName The global entity name to resolve.
     */
    function resolve(entityName: string): Symbol;

    /**
     * Creates a reflection context.
     */
    function createContext(): ReflectContext;


    /**
     * Reflection context.
     */
    interface ReflectContext {

        /**
         * Load type information for an external module in the current context. Analogous to Node's require function.
         *
         * This method assumes that the .d.json file is in the same directory as the .js file that it contains type
         * information for. Just like Node's require function, if a relative path is specified, it is considered to be
         * relative to the source file that called require. Also like Node's require function, files are loaded
         * synchronously. If you would like to load type information asynchronously, see the load function.
         *
         * @param moduleName The name of the module to load.
         */
        require(moduleName: string): Symbol;

        /**
         * Load type information for an internal module or global declarations in the current context. Analogous to
         * TypeScript's reference tags.
         *
         * This method assumes that the .d.json file is in the same directory as the .js file that it contains type
         * information for. Just like TypeScript's /// <reference path="... tags, the path is considered to be relative to
         * the source file that called reference. Files are loaded synchronously. If you would like to load type information
         * asynchronously, see the load function.
         *
         * @param fileName The name of the file to load.
         */
        reference(fileName: string): void;

        /**
         * Asynchronously load type information for the given filename pattern(s) in the current context.
         *
         * This method assumes that the .d.json files are in the same directory as the .js file that they contain type
         * information for. The load method supports [glob](https://github.com/isaacs/node-glob) patterns for filename
         * matching. Relative paths are considered to be relative to the current working directory.
         *
         * Once all declaration files have been loaded, the callback is called with the symbols for any external
         * modules and any top level global declarations in the processed files.
         *
         * @param path The path(s) to load. Glob patterns are supported.
         * @param callback Called when the load operation completes.
         */
        load(path: string | string[], callback: (err: DiagnosticError, symbols: Symbol[]) => void): void;

        /**
         * Finds the symbol for the given entity name in the current context. If a global symbol with the given name cannot
         * be found, an exception is thrown.
         * @param entityName The global entity name to resolve.
         */
        resolve(entityName: string): Symbol;
    }

    /**
     * Represents a named identifier.
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
         * Returns true if the symbols has an annotation with the specified name; Otherwise, returns false.
         * @param name The name of the annotation to find.
         */
        hasAnnotation(name: string): boolean;

        /**
         * Gets the type of the symbol.
         */
        getType(): Type;

        /**
         * Gets the type declared by the symbol. For a class getType() returns the static side of the class
         * and getDeclaredType() returns the instance side of the class.
         */
        getDeclaredType(): Type;

        /**
         * Gets all symbols exported by this symbol. This is used to get the members of a module or the static
         * members of a class.
         */
        getExports(): Symbol[];

        /**
         * Finds the symbol for the given entity name relative to the current symbol. If a symbol with the given name
         * cannot be found, an exception is thrown.
         * @param entityName The entity name to resolve.
         */
        resolve (entityName: string): Symbol;

        /**
         * Gets the value of the symbol on the given object. The symbol must be a property, variable, or accessor.
         * @param obj The object to get the value for.
         */
        getValue(obj: any): any;

        /**
         * Sets the value of the symbol on the given object. The symbol must be a property, variable, or accessor.
         * @param obj The object to set the value on.
         * @param value The value to set.
         */
        setValue(obj: any, value: any): void;

        /**
         * Returns true if the symbol is a variable; Otherwise, returns false.
         */
        isVariable(): boolean;

        /**
         * Returns true if the symbol is a function; Otherwise, returns false.
         */
        isFunction(): boolean;

        /**
         * Returns true if the symbol is a class; Otherwise, returns false.
         */
        isClass(): boolean;

        /**
         * Returns true if the symbol is an interface; Otherwise, returns false.
         */
        isInterface(): boolean;

        /**
         * Returns true if the symbol is an enum; Otherwise, returns false.
         */
        isEnum(): boolean;

        /**
         * Returns true if the symbol is a module; Otherwise, returns false.
         */
        isModule(): boolean;

        /**
         * Returns true if the symbol is an import; Otherwise, returns false.
         */
        isImport(): boolean;

        /**
         * Returns true if the symbol is a type parameter; Otherwise, returns false.
         */
        isTypeParameter(): boolean;

        /**
         * Returns true if the symbol is a class or interface property; Otherwise, returns false.
         */
        isProperty(): boolean;

        /**
         * Returns true if the symbol is a class or interface method; Otherwise, returns false.
         */
        isMethod(): boolean;

        /**
         * Returns true if the symbol is an accessor; Otherwise, returns false.
         */
        isAccessor(): boolean;

        /**
         * Returns true if the symbol is a get accessor; Otherwise, returns false.
         */
        isGetAccessor(): boolean;

        /**
         * Returns true if the symbol is a set accessor; Otherwise, returns false.
         */
        isSetAccessor(): boolean;

        /**
         * Returns true if the symbol is an enum member; Otherwise, returns false.
         */
        isEnumMember(): boolean;

        /**
         * Returns true if the symbol is a type alias; Otherwise, returns false.
         */
        isTypeAlias(): boolean;
    }

    /**
     * Represents a custom annotation.
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
     * Represents a type.
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
         * Returns true if the type has an annotation with the specified name; Otherwise, returns false.
         * @param name The name of the annotation to find.
         * @param inherit True if base types should be checked for the annotation as well.
         */
        hasAnnotation(name: string, inherit?: boolean): boolean;

        /**
         * Gets a list of all properties of the type. Note that properties include fields, accessors, and
         * methods.
         */
        getProperties(): Symbol[];

        /**
         * Finds a property with the specified name. If no property is found, undefined is returned. Note that
         * properties include fields, accessors, and methods.
         * @param name The property name to find.
         */
        getProperty(name: string): Symbol;

        /**
         * Gets all call signatures of the type.
         */
        getCallSignatures(): Signature[];

        /**
         * Gets all construct signatures of the type.
         */
        getConstructSignatures(): Signature[];

        /**
         * Gets the string index type of the type. For example, for { [key: string]: boolean }, getStringIndexType()
         * will return the intrinsic boolean type.
         */
        getStringIndexType(): Type;

        /**
         * Gets the number index type of the type. For example, for { [key: number]: string }, getNumberIndexType()
         * will return the intrinsic string type.
         */
        getNumberIndexType(): Type;

        /**
         * Returns true if the target type is identical to the current type; Otherwise, returns false. If diagnostic
         * information regarding the differences between the types is desired, any empty array should be passed to
         * the diagnostics parameter.
         * @param target The target type.
         * @param diagnostics Array where diagnostic information regarding the differences between the types is placed.
         */
        isIdenticalTo(target: Type, diagnostics?: Diagnostic[]): boolean;

        /**
         * Returns true if the target type is a subtype of the current type; Otherwise, returns false. If diagnostic
         * information regarding the differences between the types is desired, any empty array should be passed to
         * the diagnostics parameter.
         * @param target The target type.
         * @param diagnostics Array where diagnostic information regarding the differences between the types is placed.
         */
        isSubtypeOf(target: Type, diagnostics?: Diagnostic[]): boolean;

        /**
         * Returns true if the target type is assignable to the current type; Otherwise, returns false. If diagnostic
         * information regarding the differences between the types is desired, any empty array should be passed to
         * the diagnostics parameter.
         * @param target The target type.
         * @param diagnostics Array where diagnostic information regarding the differences between the types is placed.
         */
        isAssignableTo(target: Type, diagnostics?: Diagnostic[]): boolean;

        /**
         * Returns true if the target type if a subclass of the current type; Otherwise, returns false.
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
         * Returns true if the target type is a base type of the current type; Otherwise, returns false.
         * @param target The target type.
         */
        hasBaseType(target: Type): boolean;

        /**
         * Returns true if the type is a class; Otherwise, returns false.
         */
        isClass(): boolean;

        /**
         * Returns true if the type is an interface; Otherwise, returns false.
         */
        isInterface(): boolean;

        /**
         * Returns true if the type is a tuple; Otherwise, returns false.
         */
        isTuple(): boolean;

        /**
         * Returns true if the type is a union type; Otherwise, returns false.
         */
        isUnion(): boolean;

        /**
         * Returns true if the type is an array; Otherwise, returns false.
         */
        isArray(): boolean;

        /**
         * Returns true if the type is an index type; Otherwise, returns false.
         */
        isIndex(): boolean;

        /**
         * Returns true if the type is anonymous; Otherwise, returns false.
         */
        isAnonymous(): boolean;

        /**
         * Returns true if the type is a generic reference; Otherwise, returns false.
         */
        isReference(): boolean;

        /**
         * Returns true if the type is an enum; Otherwise, returns false.
         */
        isEnum(): boolean;

        /**
         * Returns true if the type is a string literal; Otherwise, returns false.
         */
        isStringLiteral(): boolean;

        /**
         * Returns true if the type is a type parameter; Otherwise, returns false.
         */
        isTypeParameter(): boolean;

        /**
         * Returns true if the type is the intrinsic any type; Otherwise, returns false.
         */
        isAny(): boolean;

        /**
         * Returns true if the type is the intrinsic string type; Otherwise, returns false.
         */
        isString(): boolean;

        /**
         * Returns true if the type is the intrinsic number type; Otherwise, returns false.
         */
        isNumber(): boolean;

        /**
         * Returns true if the type is the intrinsic boolean type; Otherwise, returns false.
         */
        isBoolean(): boolean;

        /**
         * Returns true if the type is the intrinsic void type; Otherwise, returns false.
         */
        isVoid(): boolean;

        /**
         * Returns true if the type is an intrinsic type; Otherwise, returns false.
         */
        isIntrinsic(): boolean;

        /**
         * Returns true if the type is an object type; Otherwise, returns false.
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
         * Gets the element types a union or tuple type.
         */
        getElementTypes(): Type[];

        /**
         * Creates an instance of a class. If arguments are provided then the constructor is called; Otherwise,
         * the object is created without calling the constructor. To call a parameter-less constructor, pass an empty
         * array to args.
         *
         * Note that This method assumes that the .d.json file is in the same directory as the .js file that it contains
         * type information for. For external modules, Node's require method is used to load the JavaScript module.
         *
         * @param args The constructor arguments.
         */
        createInstance(args?: any[]): any;

        /**
         * Gets the JavaScript constructor for a class type.
         *
         * Note that This method assumes that the .d.json file is in the same directory as the .js file that it contains
         * type information for. For external modules, Node's require method is used to load the JavaScript module.
         */
        getConstructor(): Function;
    }

    /**
     * Represents a call signature.
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
         * Returns true if the symbols has an annotation with the specified name; Otherwise, returns false.
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

        /**
         * The name of the .d.json file that contained the error
         */
        filename?: string;

        /**
         * Message explaining the error.
         */
        messageText: string;

        /**
         * Error code.
         */
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