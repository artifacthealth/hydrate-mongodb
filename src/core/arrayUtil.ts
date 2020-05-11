export function shallowClone<T>(arr: ReadonlyArray<T>): T[] {

    if (arr == null || !Array.isArray(arr)) {
        return null;
    }

    if (arr.length == 0) {
        return [];
    }

    return [].concat(arr);
}
