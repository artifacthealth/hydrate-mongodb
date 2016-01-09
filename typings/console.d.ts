interface Console {
    assert(test?: boolean, message?: string, ...optionalParams: any[]): void;
    clear(): void;
    count(countTitle?: string): void;
    debug(message?: string, ...optionalParams: any[]): void;
    dir(value?: any, ...optionalParams: any[]): void;
    dirxml(value: any): void;
    error(message?: any, ...optionalParams: any[]): void;
    group(groupTitle?: string): void;
    groupCollapsed(groupTitle?: string): void;
    groupEnd(): void;
    info(message?: any, ...optionalParams: any[]): void;
    log(message?: any, ...optionalParams: any[]): void;
    profile(reportName?: string): void;
    profileEnd(): void;
    time(timerName?: string): void;
    timeEnd(timerName?: string): void;
    trace(): void;
    warn(message?: any, ...optionalParams: any[]): void;
}

declare var Console: {
    prototype: Console;
    new(): Console;
}

declare var console: Console;