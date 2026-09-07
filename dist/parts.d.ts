/**
 * Runtime metadata for the "build it yourself" dropdowns — a display label
 * per option, for every field {@link WeaponParts} exposes. Pure data (no
 * canvas/RNG deps) so it's safe to import from UI code. Kept separate from
 * `types.ts` because TypeScript union types vanish at runtime; a UI needs an
 * actual array to map over.
 */
import type { BladeProfile, BladeGuard, BladePommel, BladeModification, AxeHead, AxeBack, AxeButt, AxeDecoration, SpearHead, SpearCollar, SpearButt, SpearDecoration, StaffHead, StaffShaft, StaffBinding, StaffFoot, TridentType, ShieldShape, ShieldBlazon, ShieldEmblem, ShieldRim } from "./types";
export interface PartOption<T extends string> {
    value: T;
    label: string;
}
export declare const BLADE_PROFILE_OPTIONS: PartOption<BladeProfile>[];
export declare const BLADE_GUARD_OPTIONS: PartOption<BladeGuard>[];
export declare const BLADE_POMMEL_OPTIONS: PartOption<BladePommel>[];
export declare const BLADE_MODIFICATION_OPTIONS: PartOption<BladeModification>[];
export declare const AXE_HEAD_OPTIONS: PartOption<AxeHead>[];
export declare const AXE_BACK_OPTIONS: PartOption<AxeBack>[];
export declare const AXE_BUTT_OPTIONS: PartOption<AxeButt>[];
export declare const AXE_DECORATION_OPTIONS: PartOption<AxeDecoration>[];
export declare const SPEAR_HEAD_OPTIONS: PartOption<SpearHead>[];
export declare const SPEAR_COLLAR_OPTIONS: PartOption<SpearCollar>[];
export declare const SPEAR_BUTT_OPTIONS: PartOption<SpearButt>[];
export declare const SPEAR_DECORATION_OPTIONS: PartOption<SpearDecoration>[];
export declare const STAFF_HEAD_OPTIONS: PartOption<StaffHead>[];
export declare const STAFF_SHAFT_OPTIONS: PartOption<StaffShaft>[];
export declare const STAFF_BINDING_OPTIONS: PartOption<StaffBinding>[];
export declare const STAFF_FOOT_OPTIONS: PartOption<StaffFoot>[];
export declare const TRIDENT_TYPE_OPTIONS: PartOption<TridentType>[];
export declare const SHIELD_SHAPE_OPTIONS: PartOption<ShieldShape>[];
export declare const SHIELD_BLAZON_OPTIONS: PartOption<ShieldBlazon>[];
export declare const SHIELD_EMBLEM_OPTIONS: PartOption<ShieldEmblem>[];
export declare const SHIELD_RIM_OPTIONS: PartOption<ShieldRim>[];
