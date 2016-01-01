import {PropertyFlags} from "./propertyFlags";

export const enum CascadeFlags {
    None = 0,
    Save = PropertyFlags.CascadeSave,
    Remove = PropertyFlags.CascadeRemove,
    Detach = PropertyFlags.CascadeDetach,
    Refresh = PropertyFlags.CascadeRefresh,
    Merge = PropertyFlags.CascadeMerge,
    All = PropertyFlags.CascadeAll,
}
