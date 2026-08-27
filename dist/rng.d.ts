/**
 * Seeded RNG. `xmur3` hashes the string seed into a 32-bit state generator;
 * `sfc32` is the actual PRNG stream. `checkpoint()` re-derives a fresh stream
 * from the seed generator so each drawing sub-step gets an independent stream —
 * this is what keeps output stable when one component's random-draw count
 * changes (faithful to the original Icon Machine behaviour).
 *
 * RNG algorithms from https://stackoverflow.com/a/47593316
 */
import type { Color } from "./types";
export declare function xmur3(str: string): () => number;
export declare function sfc32(a: number, b: number, c: number, d: number): () => number;
/** Generate a random 16-char alphanumeric seed string. */
export declare function createRandomSeed(randomFunc?: () => number): string;
export declare class Rng {
    private seedGen;
    private rand;
    seed(seed: string): void;
    /** Re-derive the stream from the seed generator. */
    checkpoint(): void;
    float(): number;
    /** Weighted down (square). */
    floatLow(): number;
    /** Weighted up. */
    floatHigh(): number;
    /** Weighted to the extremes. */
    floatExtreme(): number;
    sign(): number;
    rangeFloat(min: number, max: number): number;
    rangeFloatLow(min: number, max: number): number;
    rangeFloatHigh(min: number, max: number): number;
    rangeFloatExtreme(min: number, max: number): number;
    range(min: number, max: number): number;
    rangeLow(min: number, max: number): number;
    rangeHigh(min: number, max: number): number;
    color(): Color;
    /** Randomize each channel within maxamt/2 of the given color. */
    randomize(color: Color, maxamt: number): Color;
    /** Randomize each channel to at least range/2 away from the given color. */
    invertRandomize(color: Color, range: number): Color;
}
