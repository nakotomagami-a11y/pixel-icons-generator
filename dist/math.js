/**
 * 2D vector + bounds primitives and small math helpers.
 *
 * Ported from the original Icon Machine `Vector`/`Bounds` classes. `Vector`
 * instances also carry ad-hoc fields (widthL, normal, dist, …) attached by the
 * generators; those live in {@link CorePoint}.
 */
export class Vector {
    constructor(x, y) {
        if (y === undefined) {
            if (x === undefined) {
                this.x = 0;
                this.y = 0;
            }
            else {
                const v = x;
                this.x = v.x;
                this.y = v.y;
            }
        }
        else {
            this.x = x;
            this.y = y;
        }
    }
    normalize() {
        const length = this.length();
        this.x /= length;
        this.y /= length;
        return this;
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }
    distanceTo(x, y) {
        return Math.sqrt(this.distanceToSq(x, y));
    }
    distanceToSq(x, y) {
        let dx;
        let dy;
        if (y === undefined) {
            const v = x;
            dx = this.x - v.x;
            dy = this.y - v.y;
        }
        else {
            dx = this.x - x;
            dy = this.y - y;
        }
        return dx * dx + dy * dy;
    }
    addVector(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    lerpTo(v, t) {
        this.x = (v.x - this.x) * t + this.x;
        this.y = (v.y - this.y) * t + this.y;
        return this;
    }
    multiplyScalar(v) {
        this.x *= v;
        this.y *= v;
        return this;
    }
    dotProduct(x, y) {
        return this.x * x + this.y * y;
    }
    set(x, y) {
        if (y === undefined) {
            const v = x;
            this.x = v.x;
            this.y = v.y;
        }
        else {
            this.x = x;
            this.y = y;
        }
        return this;
    }
}
/**
 * Control point along a generated stroke. Extends {@link Vector} position with
 * the per-point fields the drawing loops read back. Fields are assigned by the
 * generators immediately after construction.
 */
export class CorePoint extends Vector {
    constructor() {
        super(...arguments);
        this.widthL = 0;
        this.widthR = 0;
        this.widthT = 0;
        this.widthB = 0;
        this.dist = 0;
        this.normalizedDist = 0;
    }
}
export class Bounds {
    constructor(x, y, w, h) {
        if (y === undefined) {
            if (x === undefined) {
                this.x = 0;
                this.y = 0;
                this.w = 0;
                this.h = 0;
            }
            else {
                const b = x;
                this.x = b.x;
                this.y = b.y;
                this.w = b.w;
                this.h = b.h;
            }
        }
        else {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
        }
    }
    contains(v) {
        return v.x >= this.x && v.y >= this.y && v.x < this.x + this.w && v.y < this.y + this.h;
    }
}
export function clamp(val, min, max) {
    return Math.min(max, Math.max(val, min));
}
export function floatLerp(a, b, t) {
    return (b - a) * t + a;
}
/** Convert a diagonal distance to an orthogonal bottom-left-anchored position. */
export function diagToPosition(diag, bounds) {
    const ortho = Math.floor(diag / Math.sqrt(2));
    return new Vector(ortho, bounds.h - 1 - ortho);
}
