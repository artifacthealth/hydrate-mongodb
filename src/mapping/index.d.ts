import {IndexOptions} from "./indexOptions";

export interface Index {

    keys: [string, number | string][];
    options?: IndexOptions;
}
