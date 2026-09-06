function hx(h) {
    return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
}
function ramp(shadow, mid, light, spec) {
    return { shadow: hx(shadow), mid: hx(mid), light: hx(light), spec: hx(spec) };
}
/** Warm near-black outline used across the whole pack. */
export const OUTLINE = [0x16, 0x1c, 0x2e];
export const STEEL = ramp("#4a5560", "#8c9695", "#b8c1c3", "#eef2f4");
export const BLUED = ramp("#3b3f52", "#5e6f86", "#8c9695", "#c2ccce");
export const GOLD = ramp("#7a5a30", "#c8a876", "#efe1ab", "#fff4cf");
export const WOOD = ramp("#443528", "#7a5f48", "#a1856a", "#c0a586");
/** Wood tone range for planked shields — pale pine → medium oak → walnut →
 *  near-ebony, so a planked blazon can roll anywhere from light to dark timber.
 *  All four are in {@link allTones} so the variation survives palette-snapping. */
export const WOOD_PALE = ramp("#6b5334", "#a07f52", "#cbab74", "#ecd6a4");
export const WOOD_WALNUT = ramp("#3a2718", "#5e4028", "#8a6440", "#ac845a");
export const WOOD_EBONY = ramp("#241812", "#402a1c", "#63452e", "#856046");
export const WOODS = [WOOD_PALE, WOOD, WOOD, WOOD_WALNUT, WOOD_EBONY];
export const pickWood = (r) => WOODS[Math.floor(r.float() * WOODS.length) % WOODS.length];
export const DARK = ramp("#20202e", "#3a384a", "#5a5560", "#736e7a"); // leather / dark metal
export const BONE = ramp("#8a8168", "#c9c0a0", "#e6ddbf", "#f5eed6");
/** Bone tone range — fresh ivory → aged yellow-bone → ashen grey → weathered
 *  dark bone — so a bone blazon can roll a few states of age. All in
 *  {@link allTones} so the variation survives palette-snapping. */
export const BONE_IVORY = ramp("#8f8a7c", "#d8d2c0", "#f0ebdc", "#fbf8f0");
export const BONE_ASH = ramp("#59544a", "#8d8574", "#bdb39c", "#e2d8c0");
export const BONE_DARK = ramp("#443c2e", "#6e6450", "#948870", "#b8ab90");
export const BONES = [BONE_IVORY, BONE, BONE, BONE_ASH, BONE_DARK];
export const pickBone = (r) => BONES[Math.floor(r.float() * BONES.length) % BONES.length];
export const BRONZE = ramp("#5e3f28", "#9a6a3e", "#c89058", "#e8c088"); // warm copper blade
export const COPPER = ramp("#5a2e1c", "#a0512e", "#d07a44", "#f0a86a"); // reddish copper
export const BRASS = ramp("#5e4a1c", "#a8842f", "#d8b24e", "#f2dd8a"); // yellow brass
export const DARKIRON = ramp("#242833", "#414756", "#6a7080", "#9aa4b4"); // near-black steel
/** Beaten-metal range for hammered shields (bronze/copper/brass/steel/iron). */
export const HAMMERED_METALS = [BRONZE, BRONZE, COPPER, BRASS, STEEL, DARKIRON];
export const pickHammeredMetal = (r) => HAMMERED_METALS[Math.floor(r.float() * HAMMERED_METALS.length) % HAMMERED_METALS.length];
export const RUST = ramp("#38200f", "#6e3c1e", "#94592c", "#b87a40"); // corrosion / patina spots
export const VERDIGRIS = ramp("#123f36", "#2f7a64", "#5cb494", "#a8e6cc"); // weathered copper-green patina
/** Polished marble — `shadow` is the vein colour, `mid`→`spec` the stone body.
 *  White, rose and sage variants so a marble shield can roll a few stone types.
 *  All in {@link allTones} so the veins survive palette-snapping. */
export const MARBLE_WHITE = ramp("#3a3d47", "#a6abb6", "#dfe2e8", "#f6f8fc");
export const MARBLE_ROSE = ramp("#5e343e", "#c79aa0", "#ecccce", "#fce8ea");
export const MARBLE_SAGE = ramp("#37463a", "#a3b4a4", "#d6e2d4", "#f2f8f0");
export const MARBLES = [MARBLE_WHITE, MARBLE_WHITE, MARBLE_ROSE, MARBLE_SAGE];
export const pickMarble = (r) => MARBLES[Math.floor(r.float() * MARBLES.length) % MARBLES.length];
/** Cloth banners / ribbon streamers hung on polearms. */
export const RIBBONS = [
    ramp("#5a1620", "#a02434", "#d0404e", "#f07078"), // crimson
    ramp("#16305a", "#2a54a0", "#4a7ad0", "#7aa8f0"), // blue
    ramp("#2e2c3e", "#434055", "#5e5455", "#767080"), // dark leather
    ramp("#3a2c14", "#6e5024", "#9a7838", "#c0a050"), // tan
];
/** Saturated magic-crystal blade materials (occasional enchanted weapons). */
export const CRYSTALS = [
    ramp("#1a4a38", "#2f9060", "#6fd0a0", "#d6ffe8"), // emerald
    ramp("#123258", "#2f6bb0", "#6fb0e8", "#d2e8ff"), // sapphire
    ramp("#5a1626", "#c0304a", "#f06a80", "#ffd4dc"), // ruby
    ramp("#33184f", "#7a3fb0", "#b880e8", "#ecd6ff"), // amethyst
];
export const pickCrystal = (r) => CRYSTALS[Math.floor(r.float() * CRYSTALS.length) % CRYSTALS.length];
/** Heat-tempered blade: the hilt-to-tip gradient `drawBladeHelper` already
 *  does (mid → light along `normalizedDist`) is enough to read as a
 *  fire-quenched blade on its own — dark red at the base fading to a hot
 *  yellow-white at the tip — no shape change needed, just this ramp. */
export const FIRE_TEMPERED = ramp("#3a0f08", "#c23a1a", "#ffcf6b", "#fff2c2");
/** Painted heraldic shield fields — vivid lacquer/cloth-over-wood colours, kept
 *  distinct from the metal/wood/bone/gem families so a painted shield reads as
 *  a deliberate blazon (tiny-swords blue, crimson, forest, etc.) rather than
 *  just another metal ramp. */
export const SHIELD_PAINTS = [
    ramp("#123a5c", "#2a5f92", "#5fa0d0", "#c8e6ff"), // royal blue
    ramp("#5a1620", "#a02434", "#d0404e", "#f0a0a8"), // crimson
    ramp("#123a2a", "#1f6b46", "#4a9c6a", "#b8e8c8"), // forest green
    ramp("#33184f", "#5c2f8a", "#8a5fc0", "#dcc4f5"), // royal purple
    ramp("#123a44", "#1f6b78", "#4aa0ac", "#bfeef2"), // teal
    ramp("#3a2c14", "#6e5024", "#9a7838", "#e8d09a"), // umber / tan cloth
];
const BLADE_METALS = [STEEL, BLUED, STEEL, BRONZE, DARKIRON]; // steel weighted, + bronze / dark iron
const GUARD_ACCENTS = [GOLD, STEEL, DARK, GOLD];
const HAFT_MATERIALS = [WOOD, DARK, WOOD, BLUED];
const POLE_HEADS = [STEEL, BLUED];
const pick = (r, arr) => arr[Math.floor(r.float() * arr.length) % arr.length];
export const pickBladeMetal = (r) => pick(r, BLADE_METALS);
export const pickGuardAccent = (r) => pick(r, GUARD_ACCENTS);
export const pickHaft = (r) => pick(r, HAFT_MATERIALS);
export const pickPoleHead = (r) => pick(r, POLE_HEADS);
export const pickShieldPaint = (r) => pick(r, SHIELD_PAINTS);
/** Saturated gem ramps — the pack has no gem staffs, so keep a small controlled
 *  set rather than free hue, so staffs still read as part of the family. */
/** Every material tone flattened — the fixed set a finished icon is snapped to
 *  (Phase 4). Keeps the whole icon inside the pack's ~4-tones-per-material
 *  budget and turns continuous shader gradients into hard cel bands. */
export const GEMS = [
    ramp("#5a1030", "#c02850", "#f06a86", "#ffd0d8"), // ruby
    ramp("#12325a", "#2f6bb0", "#5fa0e0", "#cfe6ff"), // sapphire
    ramp("#123a2a", "#2f9060", "#5fc890", "#d0ffe4"), // emerald
    ramp("#3a1a5a", "#7a3fb0", "#b07fe0", "#e8d0ff"), // amethyst
    ramp("#5a3a10", "#c88a20", "#f0c250", "#fff0c0"), // topaz
];
export const pickGem = (r) => pick(r, GEMS);
/** Every material tone flattened — the fixed set a finished icon is snapped to
 *  (Phase 4). Keeps the whole icon inside the pack's ~4-tones-per-material
 *  budget and turns continuous shader gradients into hard cel bands. */
export function allTones() {
    const out = [];
    for (const rp of [STEEL, BLUED, GOLD, WOOD, WOOD_PALE, WOOD_WALNUT, WOOD_EBONY, DARK, BONE, BONE_IVORY, BONE_ASH, BONE_DARK, BRONZE, COPPER, BRASS, DARKIRON, RUST, VERDIGRIS, FIRE_TEMPERED, MARBLE_WHITE, MARBLE_ROSE, MARBLE_SAGE, ...RIBBONS, ...CRYSTALS, ...GEMS, ...SHIELD_PAINTS])
        out.push(rp.shadow, rp.mid, rp.light, rp.spec);
    return out;
}
