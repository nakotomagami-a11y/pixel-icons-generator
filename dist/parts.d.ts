/**
 * Runtime metadata for the "build it yourself" dropdowns — a display label
 * per option, for every field {@link WeaponParts} exposes. Pure data (no
 * canvas/RNG deps) so it's safe to import from UI code. Kept separate from
 * `types.ts` because TypeScript union types vanish at runtime; a UI needs an
 * actual array to map over.
 */
import type { BladeProfile, BladeGuard, BladePommel, AxeHead, SpearHead, StaffHead, StaffShaft, TridentType, ShieldShape, ShieldBlazon, ShieldEmblem } from "./types";
export interface PartOption<T extends string> {
    value: T;
    label: string;
}
export declare const BLADE_PROFILE_OPTIONS: PartOption<BladeProfile>[];
export declare const BLADE_GUARD_OPTIONS: PartOption<BladeGuard>[];
export declare const BLADE_POMMEL_OPTIONS: PartOption<BladePommel>[];
export declare const AXE_HEAD_OPTIONS: PartOption<AxeHead>[];
export declare const SPEAR_HEAD_OPTIONS: PartOption<SpearHead>[];
export declare const STAFF_HEAD_OPTIONS: PartOption<StaffHead>[];
export declare const STAFF_SHAFT_OPTIONS: PartOption<StaffShaft>[];
export declare const TRIDENT_TYPE_OPTIONS: PartOption<TridentType>[];
export declare const SHIELD_SHAPE_OPTIONS: PartOption<ShieldShape>[];
export declare const SHIELD_BLAZON_OPTIONS: PartOption<ShieldBlazon>[];
export declare const SHIELD_EMBLEM_OPTIONS: PartOption<ShieldEmblem>[];
