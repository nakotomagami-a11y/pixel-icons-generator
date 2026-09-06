/**
 * Core types for pixel-icons.
 */
/** RGB(A) color, channels 0–255, alpha 0–1. */
export interface Color {
    r: number;
    g: number;
    b: number;
    a?: number;
}
/**
 * A concrete icon category. Each maps to a distinct procedural generator.
 * All are weapons or shields.
 */
export type IconClass = "blades" | "spears" | "axes" | "staffs" | "tridents" | "shields";
/**
 * What to generate. In addition to the concrete classes, two meta-values
 * resolve to a concrete class deterministically from the seed. Both currently
 * pick from the full class set; `any` and `anyweapon` are kept as distinct
 * names for API stability.
 */
export type IconClassSelector = IconClass | "any" | "anyweapon";
/**
 * Explicit archetype overrides, one per visual layer of each weapon class.
 * Anything left `undefined` still comes from `seed` via the normal random
 * pick — only the fields you set here are pinned. Fine detail (exact colours,
 * wear, sub-pixel sizing) stays seed-random on purpose, so a "Random" reroll
 * with parts locked still gives useful variety.
 *
 * A persisted config can name a value that's since been removed/renamed —
 * every generator falls back to a random pick on an unknown value rather
 * than crash (see each draw function's sanitize step).
 */
export interface BladeParts {
    profile?: BladeProfile;
    guard?: BladeGuard;
    pommel?: BladePommel;
    twoHanded?: boolean;
    /** A decoration cut into or laid onto the blade itself — serrations,
     *  fullers, rivets, glowing runes, inset gems… Applies to every profile. */
    modification?: BladeModification;
}
export interface AxeParts {
    head?: AxeHead;
    /** What sits opposite the cutting bit — a rear spike, war-pick, hammer poll. */
    back?: AxeBack;
    /** The butt end of the haft. */
    butt?: AxeButt;
    /** Ornament applied to the head/haft. */
    decoration?: AxeDecoration;
}
export interface SpearParts {
    head?: SpearHead;
    /** The socket where head meets shaft — ferrule, langets, a set gem… */
    collar?: SpearCollar;
    /** The butt end of the shaft. */
    butt?: SpearButt;
    /** Cloth/ornament hung on the upper shaft. */
    decoration?: SpearDecoration;
}
export interface StaffParts {
    head?: StaffHead;
    shaft?: StaffShaft;
    /** Fittings bound onto the shaft — collars, wraps, leaves, charms. */
    binding?: StaffBinding;
}
export interface TridentParts {
    type?: TridentType;
}
export interface ShieldParts {
    shape?: ShieldShape;
    blazon?: ShieldBlazon;
    emblem?: ShieldEmblem;
    /** The frame around the field — a metal band, riveted edge, or bare. */
    rim?: ShieldRim;
}
export type BladeProfile = "knight" | "broad" | "cleaver" | "rapier" | "flamberge" | "leaf" | "bowie" | "katana" | "dagger" | "barbed";
/**
 * Hand-protection styles. Each is an explicit geometric construction (a bar,
 * angled arms, a plate, a ring…) rather than a subtle retune of one wandering
 * crossguard — so every value reads distinct at the app's real 40–60px.
 */
export type BladeGuard = "bar" | "vee" | "swept" | "winged" | "balled" | "spiked" | "oval" | "ring" | "cup" | "shell" | "plate" | "knucklebow" | "none";
export type BladePommel = "round" | "gem" | "none" | "wheel" | "ring" | "trefoil" | "acorn" | "scentstopper" | "spike" | "faceted" | "flanged" | "crown" | "birdhead" | "crescent";
export type BladeModification = "none" | "serrated" | "notched" | "fullered" | "riveted" | "wavy" | "fireTempered" | "runes" | "gems" | "etched";
export type AxeHead = "fan" | "bearded" | "broad" | "double" | "crescent" | "halberd" | "warpick" | "hammer" | "greataxe" | "tomahawk";
export type AxeBack = "none" | "spike" | "pick" | "hammer" | "hook";
export type AxeButt = "none" | "ring" | "cap" | "spike";
export type AxeDecoration = "none" | "gem" | "rivets" | "inlay" | "thongs" | "fuller" | "runes" | "notch" | "wrap" | "ferrule";
export type SpearHead = "leaf" | "broadleaf" | "pike" | "winged" | "glaive" | "harpoon" | "needle" | "partisan" | "forked" | "flame" | "crescent" | "crystal";
export type SpearCollar = "none" | "ferrule" | "banded" | "langets" | "gem" | "ring" | "winged" | "spiked";
export type SpearButt = "none" | "cap" | "spike" | "ball" | "ring";
export type SpearDecoration = "none" | "ribbons" | "pennant" | "tassel" | "wrap" | "gem" | "rings" | "feathers";
export type StaffHead = "orb" | "crystal" | "cluster" | "crescent" | "halo" | "claws" | "wings" | "loop" | "crook" | "twinhorns" | "star" | "branch";
export type StaffShaft = "straight" | "twisted" | "wrapped" | "segmented" | "gnarled" | "bone" | "metal" | "lacquer";
export type StaffBinding = "none" | "collar" | "doublecollar" | "wrap" | "leaves" | "ribbons" | "charm" | "rings";
export type TridentType = "trident" | "pitchfork";
export type ShieldShape = "heater" | "kite" | "tower" | "round" | "crest" | "teardrop" | "lozenge" | "hexagon" | "scallop" | "oval";
export type ShieldBlazon = "planked" | "marble" | "hammered" | "bone" | "scaled" | "leather" | "weave" | "verdigris" | "crystal" | "half-vertical" | "half-horizontal" | "half-diagonal" | "quarters" | "stripes-vertical" | "stripes-horizontal" | "stripes-diagonal" | "checker" | "diamonds";
export type ShieldEmblem = "boss" | "gem" | "cross" | "star" | "chevron" | "crescent" | "bolt" | "sun" | "ring" | "diamond" | "studs" | "none";
export type ShieldRim = "none" | "metal" | "gold" | "riveted" | "dark" | "banded";
/** Per-class part overrides, namespaced by {@link IconClass} so switching
 *  weapon type never loses a previous type's choices (they just go unused
 *  until you switch back). */
export interface WeaponParts {
    blades?: BladeParts;
    spears?: SpearParts;
    axes?: AxeParts;
    staffs?: StaffParts;
    tridents?: TridentParts;
    shields?: ShieldParts;
}
/**
 * Serialisable icon configuration. Safe to store in JSON / YAML / a database.
 * The same `seed` + `iconClass` + `parts` always produce the same icon on
 * every device.
 */
export interface IconConfig {
    /** String seed. Drives every procedural choice not pinned by `parts`. */
    seed: string;
    /** Which generator to run, or a meta-selector resolved from the seed. */
    iconClass: IconClassSelector;
    /** Explicit "build it yourself" overrides. Optional; omit for fully random. */
    parts?: WeaponParts;
}
