export function isSet(obj: any): boolean {
    return Object.prototype.toString.call(obj) === '[object Set]';
}

export function isMap(obj: any): boolean {
    return Object.prototype.toString.call(obj) === '[object Map]';
}