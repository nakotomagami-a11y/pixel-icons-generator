/**
 * Tiny-Swords material palette. Sampled from apps/web/public/units/*.png — the
 * pack uses a tight set of 3–4-tone ramps per material (cool grey-blue steel,
 * warm gold, wood, dark leather) over a shared near-black outline, instead of
 * the free-hue HSV the generator used. Picking material colours from these
 * ramps is what collapses our ~30–45-colour icons down to the pack's ~12.
 */
import type { Color } from "./types";
import type { Rng } from "./rng";
export interface Ramp {
    shadow: Color;
    mid: Color;
    light: Color;
    spec: Color;
}
/** Warm near-black outline used across the whole pack. */
export declare const OUTLINE: [number, number, number];
export declare const STEEL: Ramp;
export declare const BLUED: Ramp;
export declare const GOLD: Ramp;
export declare const WOOD: Ramp;
export declare const DARK: Ramp;
export declare const BONE: Ramp;
export declare const BRONZE: Ramp;
export declare const DARKIRON: Ramp;
export declare const RUST: Ramp;
/** Cloth banners / ribbon streamers hung on polearms. */
export declare const RIBBONS: Ramp[];
/** Saturated magic-crystal blade materials (occasional enchanted weapons). */
export declare const CRYSTALS: Ramp[];
export declare const pickCrystal: (r: Rng) => Ramp;
/** Painted heraldic shield fields — vivid lacquer/cloth-over-wood colours, kept
 *  distinct from the metal/wood/bone/gem families so a painted shield reads as
 *  a deliberate blazon (tiny-swords blue, crimson, forest, etc.) rather than
 *  just another metal ramp. */
export declare const SHIELD_PAINTS: Ramp[];
export declare const pickBladeMetal: (r: Rng) => Ramp;
export declare const pickGuardAccent: (r: Rng) => Ramp;
export declare const pickHaft: (r: Rng) => Ramp;
export declare const pickPoleHead: (r: Rng) => Ramp;
export declare const pickShieldPaint: (r: Rng) => Ramp;
/** Saturated gem ramps — the pack has no gem staffs, so keep a small controlled
 *  set rather than free hue, so staffs still read as part of the family. */
/** Every material tone flattened — the fixed set a finished icon is snapped to
 *  (Phase 4). Keeps the whole icon inside the pack's ~4-tones-per-material
 *  budget and turns continuous shader gradients into hard cel bands. */
export declare const GEMS: Ramp[];
export declare const pickGem: (r: Rng) => Ramp;
/** Every material tone flattened — the fixed set a finished icon is snapped to
 *  (Phase 4). Keeps the whole icon inside the pack's ~4-tones-per-material
 *  budget and turns continuous shader gradients into hard cel bands. */
export declare function allTones(): Color[];
