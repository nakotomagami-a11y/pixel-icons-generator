/**
 * 2D vector + bounds primitives and small math helpers.
 *
 * Ported from the original Icon Machine `Vector`/`Bounds` classes. `Vector`
 * instances also carry ad-hoc fields (widthL, normal, dist, …) attached by the
 * generators; those live in {@link CorePoint}.
 */
export declare class Vector {
    x: number;
    y: number;
    constructor(x?: number | Vector, y?: number);
    normalize(): this;
    length(): number;
    lengthSq(): number;
    distanceTo(x: number, y: number): number;
    distanceToSq(x: number | Vector, y?: number): number;
    addVector(v: Vector): this;
    lerpTo(v: Vector, t: number): this;
    multiplyScalar(v: number): this;
    dotProduct(x: number, y: number): number;
    set(x: number | Vector, y?: number): this;
}
/**
 * Control point along a generated stroke. Extends {@link Vector} position with
 * the per-point fields the drawing loops read back. Fields are assigned by the
 * generators immediately after construction.
 */
export declare class CorePoint extends Vector {
    widthL: number;
    widthR: number;
    widthT: number;
    widthB: number;
    normal: Vector;
    forward: Vector;
    dist: number;
    normalizedDist: number;
}
export declare class Bounds {
    x: number;
    y: number;
    w: number;
    h: number;
    constructor(x?: number | Bounds, y?: number, w?: number, h?: number);
    contains(v: Vector): boolean;
}
export declare function clamp(val: number, min: number, max: number): number;
export declare function floatLerp(a: number, b: number, t: number): number;
/** Convert a diagonal distance to an orthogonal bottom-left-anchored position. */
export declare function diagToPosition(diag: number, bounds: Bounds): Vector;
