enum PropertyFlags {
    None = 0,
    Ignored = 0x00000001,
    CascadePersist = 0x00000002,
    CascadeRemove = 0x00000004,
    CascadeDetach = 0x00000008,
    CascadeAll = CascadePersist | CascadeRemove | CascadeDetach,
    InverseSide = 0x00000010,
    Nullable = 0x00000020,
    OrphanRemoval = 0x00000040
}

export = PropertyFlags;

