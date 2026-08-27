/**
 * Pure color helpers (no RNG). RNG-dependent color ops live on {@link Rng}.
 */
import type { Color } from "./types";
interface Hsv {
    h: number;
    s: number;
    v: number;
}
export declare function hsvToRgb(color: Hsv): Color;
/** Configure cel-shading step count for subsequent {@link colorLerp} calls. */
export declare function setCelSteps(n: number): void;
/** Snap a 0..1 blend factor to the nearest cel band (no-op when disabled). */
export declare function quantize(t: number): number;
export declare function colorLerp(a: Color, b: Color, t: number): Color;
export declare function colorDarken(color: Color, t: number): Color;
export declare function colorLighten(color: Color, t: number): Color;
export declare function colorStr(color: Color): string;
export {};
