declare module "tsreflect" {

    function require(moduleName: string): Symbol;
    function reference(fileName: string): void;

    function load(path: string, callback: (err: DiagnosticError, symbols: Symbol[]) => void): void;
    function load(paths: string[], callback: (err: DiagnosticError, symbols: Symbol[]) => void): void;

    function resolve(entityName: string): Symbol;

    enum SymbolFlags {

        Variable,
        Property,
        EnumMember,
        Function,
        Class,
        Interface,
        Enum,
        ValueModule,
        NamespaceModule,
        TypeLiteral,
        Method,
        Constructor,
        GetAccessor,
        SetAccessor,
        CallSignature,
        ConstructSignature,
        IndexSignature,
        TypeParameter,
        Import,
        Value,
        Type,
        Namespace,
        Module,
        Accessor,
        Signature,
        ModuleMember
    }

    interface Symbol {

        getId(): number;
        getName(): string;
        getFullName(): string;
        getDescription(): string;
        getAnnotations(name?: string): Annotation[];
        hasAnnotation(name: string): boolean;

        getFlags(): SymbolFlags;

        getType(): Type;
        getDeclaredType(): Type;
        getExports(flags?: SymbolFlags): Symbol[];

        resolve (entityName: string): Symbol;

        getValue(obj: any): any;
        setValue(obj: any, value: any): void;

        isVariable(): boolean;
        isFunction(): boolean;
        isClass(): boolean;
        isInterface(): boolean;
        isEnum(): boolean;
        isModule(): boolean;
        isImport(): boolean;
        isTypeParameter(): boolean;
        isProperty(): boolean;
        isMethod(): boolean;
        isAccessor(): boolean;
        isGetAccessor(): boolean;
        isSetAccessor(): boolean;
        isEnumMember(): boolean;
    }

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

    export enum TypeFlags {
        Any,
        String,
        Number,
        Boolean,
        Void,
        Undefined,
        Null,
        Enum,
        StringLiteral,
        TypeParameter,
        Class,
        Interface,
        Reference,
        Tuple,
        Anonymous,
        FromSignature,
        Intrinsic,
        StringLike,
        NumberLike,
        ObjectType
    }

    interface Type {

        getId(): number;
        getName(): string;
        getFullName(): string;
        getDescription(): string;
        getAnnotations(inherit: boolean): Annotation[];
        getAnnotations(name?: string, inherit?: boolean): Annotation[];
        hasAnnotation(name: string, inherit?: boolean): boolean;

        getFlags(): TypeFlags;

        getProperties(): Symbol[];
        getProperty(name: string): Symbol;
        getCallSignatures(): Signature[];
        getConstructSignatures(): Signature[];
        getStringIndexType(): Type;
        getNumberIndexType(): Type;

        isIdenticalTo(target: Type, diagnostics?: Diagnostic[]): boolean;
        isSubtypeOf(target: Type, diagnostics?: Diagnostic[]): boolean;
        isAssignableTo(target: Type, diagnostics?: Diagnostic[]): boolean;
        isSubclassOf(target: Type): boolean;

        getBaseClass(): Type;
        getBaseTypes(): Type[];
        hasBaseType(target: Type): boolean;

        isClass(): boolean;
        isInterface(): boolean;
        isTuple(): boolean;
        isArray(): boolean;
        isIndex(): boolean;
        isAnonymous(): boolean;
        isReference(): boolean;
        isEnum(): boolean;
        isStringLiteral(): boolean;
        isTypeParameter(): boolean;
        isAny(): boolean;
        isString(): boolean;
        isNumber(): boolean;
        isBoolean(): boolean;
        isVoid(): boolean;
        isIntrinsic(): boolean;
        isObjectType(): boolean;

        getEnumValue(value: string, ignoreCase?: boolean): number;
        getEnumName(value: number): string;
        getEnumNames(): string[];
        getElementType(): Type;
        getElementTypes(): Type[];

        createObject(args?: any[]): any;
        getConstructor(): Function;
    }

    interface Signature {

        getDescription(): string;
        getAnnotations(name?: string): Annotation[];
        hasAnnotation(name: string): boolean;

        getParameters(): Symbol[];
        getParameter(name: string): Symbol;
        getReturnType(): Type;
    }

    interface Diagnostic {

        filename?: string;
        messageText: string;
        code: number;
    }

    interface DiagnosticError extends Error {

        diagnostics: Diagnostic[];
    }
}