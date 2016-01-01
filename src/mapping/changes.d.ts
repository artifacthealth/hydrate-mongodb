import {Lookup} from "../core/lookup";

export interface Changes {

    $set?: Lookup<any>;
    $unset?: Lookup<any>;
}
