interface ConfigurationOptions {

    /**
     * Connection URI. See driver documentation for details.
     */
    uri?: string;

    /**
     * Connection options. See driver documentation for details.
     */
    connectionOptions?: any;

    /**
     * Array of file paths to declaration files.
     */
    declarationFiles?: string[];
}

export = ConfigurationOptions;