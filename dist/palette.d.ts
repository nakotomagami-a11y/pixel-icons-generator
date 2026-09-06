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
/** Wood tone range for planked shields — pale pine → medium oak → walnut →
 *  near-ebony, so a planked blazon can roll anywhere from light to dark timber.
 *  All four are in {@link allTones} so the variation survives palette-snapping. */
export declare const WOOD_PALE: Ramp;
export declare const WOOD_WALNUT: Ramp;
export declare const WOOD_EBONY: Ramp;
export declare const WOODS: Ramp[];
export declare const pickWood: (r: Rng) => Ramp;
export declare const DARK: Ramp;
export declare const BONE: Ramp;
/** Bone tone range — fresh ivory → aged yellow-bone → ashen grey → weathered
 *  dark bone — so a bone blazon can roll a few states of age. All in
 *  {@link allTones} so the variation survives palette-snapping. */
export declare const BONE_IVORY: Ramp;
export declare const BONE_ASH: Ramp;
export declare const BONE_DARK: Ramp;
export declare const BONES: Ramp[];
export declare const pickBone: (r: Rng) => Ramp;
export declare const BRONZE: Ramp;
export declare const COPPER: Ramp;
export declare const BRASS: Ramp;
export declare const DARKIRON: Ramp;
/** Beaten-metal range for hammered shields (bronze/copper/brass/steel/iron). */
export declare const HAMMERED_METALS: Ramp[];
export declare const pickHammeredMetal: (r: Rng) => Ramp;
export declare const RUST: Ramp;
export declare const VERDIGRIS: Ramp;
/** Polished marble — `shadow` is the vein colour, `mid`→`spec` the stone body.
 *  White, rose and sage variants so a marble shield can roll a few stone types.
 *  All in {@link allTones} so the veins survive palette-snapping. */
export declare const MARBLE_WHITE: Ramp;
export declare const MARBLE_ROSE: Ramp;
export declare const MARBLE_SAGE: Ramp;
export declare const MARBLES: Ramp[];
export declare const pickMarble: (r: Rng) => Ramp;
/** Cloth banners / ribbon streamers hung on polearms. */
export declare const RIBBONS: Ramp[];
/** Saturated magic-crystal blade materials (occasional enchanted weapons). */
export declare const CRYSTALS: Ramp[];
export declare const pickCrystal: (r: Rng) => Ramp;
/** Heat-tempered blade: the hilt-to-tip gradient `drawBladeHelper` already
 *  does (mid → light along `normalizedDist`) is enough to read as a
 *  fire-quenched blade on its own — dark red at the base fading to a hot
 *  yellow-white at the tip — no shape change needed, just this ramp. */
export declare const FIRE_TEMPERED: Ramp;
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
