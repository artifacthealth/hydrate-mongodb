enum MappingFlags {

    Array               = 0x00000001,
    Boolean             = 0x00000002,
    Class               = 0x00000004,
    Date                = 0x00000008,
    Enum                = 0x00000010,
    Number              = 0x00000020,
    Object              = 0x00000040,
    RegExp              = 0x00000080,
    String              = 0x00000100,
    Tuple               = 0x00000200,
    Entity              = 0x00000400,
    Embeddable          = 0x00000800,
    InheritanceRoot     = 0x00001000
}

export = MappingFlags;