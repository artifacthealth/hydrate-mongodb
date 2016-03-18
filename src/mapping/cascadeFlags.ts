import {MappingModel} from "./mappingModel";

/**
 * Flags that indicate how operations should cascade to a property.
 */
export const enum CascadeFlags {

    /**
     * No flags.
     */
    None = 0,

    /**
     * Save operations should be cascaded to this property.
     */
    Save = MappingModel.PropertyFlags.CascadeSave,

    /**
     * Remove operations should be cascaded to this property.
     */
    Remove = MappingModel.PropertyFlags.CascadeRemove,

    /**
     * Detach operations should be cascaded to this property.
     */
    Detach = MappingModel.PropertyFlags.CascadeDetach,

    /**
     * Refresh operations should be cascaded to this property.
     */
    Refresh = MappingModel.PropertyFlags.CascadeRefresh,

    /**
     * Merge operations should be cascaded to this property.
     */
    Merge = MappingModel.PropertyFlags.CascadeMerge,

    /**
     * All operations should be cascaded to this property.
     */
    All = MappingModel.PropertyFlags.CascadeAll,
}
