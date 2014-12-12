enum TypeMappingFlags {

    None = 0,
    DocumentType = 0x00000001,
    EmbeddedType = 0x00000002,
    RootType = 0x00000010,
    SuperType = 0x00000020,
    HasSubtypes = 0x00000040/*,
    Number = 0x00000080,
    Boolean = 0x00000100,
    Enum = 0x00000200,
    Tuple = 0x00000400,
    Date = 0x00000800,
    RegExp = 0x00001000,
    CascadeSave = 0x00001000,
    CascadeRemove = 0x00002000,
    CascadeDetach = 0x00004000,
    CascadeAll = CascadeSave | CascadeRemove | CascadeDetach,
    InverseSide = 0x00008000,
    Nullable = 0x00010000,
    OrphanRemoval = 0x00020000*/
}

export = TypeMappingFlags;