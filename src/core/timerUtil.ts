/**
 * @hidden
 */
export function getDuration(start: [number, number]): number {

    var stop = process.hrtime(start);
    return (stop[0] * 1000) + stop[1] / 1000000;
}