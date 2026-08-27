export function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function () {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
export function sfc32(a, b, c, d) {
    return function () {
        a >>>= 0;
        b >>>= 0;
        c >>>= 0;
        d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        d = (d + 1) | 0;
        t = (t + d) | 0;
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
}
/** Generate a random 16-char alphanumeric seed string. */
export function createRandomSeed(randomFunc = Math.random) {
    let s = "";
    for (let i = 0; i < 16; i++) {
        let c = Math.floor(randomFunc() * 62);
        if (c < 10)
            c = 48 + c;
        else if (c < 36)
            c = 65 - 10 + c;
        else
            c = 97 - 36 + c;
        s += String.fromCharCode(c);
    }
    return s;
}
export class Rng {
    constructor() {
        this.seedGen = null;
        this.rand = Math.random;
    }
    seed(seed) {
        this.seedGen = xmur3(seed);
        this.checkpoint();
    }
    /** Re-derive the stream from the seed generator. */
    checkpoint() {
        if (this.seedGen) {
            this.rand = sfc32(this.seedGen(), this.seedGen(), this.seedGen(), this.seedGen());
        }
    }
    float() {
        return this.rand();
    }
    /** Weighted down (square). */
    floatLow() {
        const v = this.rand();
        return v * v;
    }
    /** Weighted up. */
    floatHigh() {
        return 1 - this.floatLow();
    }
    /** Weighted to the extremes. */
    floatExtreme() {
        const r = this.rand() * 2 - 1;
        return r * r;
    }
    sign() {
        return this.rand() > 0.5 ? 1 : -1;
    }
    rangeFloat(min, max) {
        return this.rand() * (max - min) + min;
    }
    rangeFloatLow(min, max) {
        return this.floatLow() * (max - min) + min;
    }
    rangeFloatHigh(min, max) {
        return this.floatHigh() * (max - min) + min;
    }
    // Faithful to the original: the (max-min)/2 magnitude was passed to
    // floatHigh() (which ignores its argument), so the deviation is an unscaled
    // [0,1) floatHigh regardless of min/max. Preserved for identical output.
    rangeFloatExtreme(min, max) {
        return this.sign() * this.floatHigh() + (max + min) / 2;
    }
    range(min, max) {
        return Math.floor(this.rangeFloat(min, max));
    }
    rangeLow(min, max) {
        return Math.floor(this.rangeFloatLow(min, max));
    }
    rangeHigh(min, max) {
        return Math.floor(this.rangeFloatHigh(min, max));
    }
    color() {
        return { r: this.range(0, 256), g: this.range(0, 256), b: this.range(0, 256) };
    }
    /** Randomize each channel within maxamt/2 of the given color. */
    randomize(color, maxamt) {
        const half = Math.floor(maxamt / 2);
        const c = {
            r: Math.max(0, Math.min(255, color.r + this.range(-half, half))),
            g: Math.max(0, Math.min(255, color.g + this.range(-half, half))),
            b: Math.max(0, Math.min(255, color.b + this.range(-half, half))),
        };
        if (color.a !== undefined)
            c.a = color.a;
        return c;
    }
    /** Randomize each channel to at least range/2 away from the given color. */
    invertRandomize(color, range) {
        const c = {
            r: (color.r + Math.floor(range / 2) + this.range(0, 255 - range)) % 256,
            g: (color.g + Math.floor(range / 2) + this.range(0, 255 - range)) % 256,
            b: (color.b + Math.floor(range / 2) + this.range(0, 255 - range)) % 256,
        };
        if (color.a !== undefined)
            c.a = color.a;
        return c;
    }
}
