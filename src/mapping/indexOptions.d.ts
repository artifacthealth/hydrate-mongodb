export interface IndexOptions {
    w?: any;
    wtimeout?: number;
    fsync?: boolean;
    journal?: boolean;
    unique?: boolean;
    sparse?: boolean;
    dropDups?: boolean;
    min?: number;
    max?: number;
    v?: number;
    expireAfterSeconds?: number;
    name?: string;
    collation?: CollationOptions;
}
