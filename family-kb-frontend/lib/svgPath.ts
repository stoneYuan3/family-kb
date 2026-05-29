
type Point = [number, number];
type PathPart = string | number;

export function getSvgFromStroke(stroke:Point[]) {
    if(!stroke.length) return;
    const d = stroke.reduce<PathPart[]>(
        (acc, [x0, y0], i, arr) => {
            const [x1, y1] = arr[(i + 1) % arr.length];
            acc.push(x0, y0, (x0 + x1) /2, (y0 + y1) /2);
            return acc;
        },
        ['M', ...stroke[0], 'Q']
    );

    d.push('Z');
    return d.join(' ');
}