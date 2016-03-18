/**
 * @hidden
 */
export const enum QueryKind {

    FindAll             = 0x00000001,
    FindEach            = 0x00000002,
    FindEachSeries      = 0x00000004,
    FindOne             = 0x00000008,
    FindOneById         = 0x00000010,
    FindOneAndRemove    = 0x00000020,
    FindOneAndUpdate    = 0x00000040,
    RemoveAll           = 0x00000080,
    RemoveOne           = 0x00000100,
    UpdateAll           = 0x00000200,
    UpdateOne           = 0x00000400,
    Distinct            = 0x00000800,
    Count               = 0x00001000,

    ReadOnly = FindAll | FindEach | FindOne | FindOneById | Distinct | Count
}
