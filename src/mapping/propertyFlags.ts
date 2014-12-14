enum PropertyFlags {
    None = 0,
    Ignored = 0x00000001,
    ReferenceOne = 0x00000002,
    ReferenceMany = 0x00000004,
    Reference = ReferenceOne | ReferenceMany,
    EmbedOne = 0x00000008,
    EmbedMany = 0x00000010,
    Embed = EmbedOne | EmbedMany,
    AssociationMany = ReferenceMany | EmbedMany,
    AssociationOne = ReferenceOne | EmbedOne,
    Association = AssociationMany | AssociationOne,
    Any = 0x00000020,
    String = 0x00000040,
    Number = 0x00000080,
    Boolean = 0x00000100,
    Enum = 0x00000200,
    Tuple = 0x00000400,
    Date = 0x00000800,
    RegExp = 0x00001000,
    CascadePersist = 0x00001000,
    CascadeRemove = 0x00002000,
    CascadeDetach = 0x00004000,
    CascadeAll = CascadePersist | CascadeRemove | CascadeDetach,
    InverseSide = 0x00008000,
    Nullable = 0x00010000,
    OrphanRemoval = 0x00020000
}

export = PropertyFlags;

