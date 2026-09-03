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
 * Explicit archetype overrides, one shape per weapon class. Each field is the
 * "headline" shape/hilt choice that defines what the weapon visually IS (e.g.
 * a sword's blade profile, an axe's head shape). Anything left `undefined`
 * still comes from `seed` via the normal random pick, same as before — only
 * the fields you set here are pinned. Small embellishments (gems, wraps,
 * weathering, colour) are intentionally NOT overridable here; they stay
 * randomized so a "Random" reroll still gives useful variety even with parts
 * locked in. `BladeParts.modification` is a deliberate carve-out from that
 * rule — see its doc comment.
 */
export interface BladeParts {
    profile?: BladeProfile;
    guard?: BladeGuard;
    pommel?: BladePommel;
    twoHanded?: boolean;
    /**
     * A shape cut into or added onto the blade — a base of one-off flourishes
     * to make individual swords feel more unique, on top of the profile's own
     * silhouette. Currently only applied to the `knight` profile (the plain
     * arming-sword shape reads cleanest with an added flourish; other profiles
     * already carry a strong identity of their own). Unlike every other blade
     * embellishment this one IS overridable, by request — pick a specific look
     * instead of rerolling the seed and hoping.
     */
    modification?: BladeModification;
}
export interface AxeParts {
    head?: AxeHead;
}
export interface SpearParts {
    head?: SpearHead;
}
export interface StaffParts {
    head?: StaffHead;
    shaft?: StaffShaft;
}
export interface TridentParts {
    type?: TridentType;
}
export interface ShieldParts {
    shape?: ShieldShape;
    blazon?: ShieldBlazon;
    emblem?: ShieldEmblem;
}
export type BladeProfile = "knight" | "broad" | "cleaver" | "rapier" | "flamberge" | "leaf" | "bowie" | "katana" | "dagger" | "barbed";
export type BladeGuard = "bar" | "swept" | "wings" | "disc" | "none" | "spiked" | "hook" | "hourglass" | "langets" | "sidering" | "trilobe" | "cup" | "starburst" | "knucklebow" | "basket";
export type BladePommel = "round" | "gem" | "none" | "wheel" | "ring" | "trefoil" | "acorn" | "scentstopper" | "spike" | "faceted" | "flanged" | "crown" | "birdhead";
export type BladeModification = "none" | "serrated" | "notched" | "fullered" | "riveted" | "wavy";
export type AxeHead = "fan" | "bearded" | "broad" | "double" | "crescent" | "halberd";
export type SpearHead = "leaf" | "pike" | "broadleaf" | "winged" | "glaive" | "harpoon" | "needle" | "partisan" | "forked";
export type StaffHead = "bare" | "claws" | "crescent" | "halo" | "wings" | "cluster" | "collar" | "loop";
export type StaffShaft = "straight" | "twisted" | "wrapped" | "segmented";
export type TridentType = "trident" | "pitchfork";
export type ShieldShape = "heater" | "kite" | "tower" | "round" | "crest" | "teardrop";
export type ShieldBlazon = "plain" | "per-pale" | "per-bend" | "quarterly" | "chief";
export type ShieldEmblem = "boss" | "gem" | "cross" | "star" | "chevron" | "none";
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
