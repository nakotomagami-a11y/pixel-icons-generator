/**
 * Runtime metadata for the "build it yourself" dropdowns — a display label
 * per option, for every field {@link WeaponParts} exposes. Pure data (no
 * canvas/RNG deps) so it's safe to import from UI code. Kept separate from
 * `types.ts` because TypeScript union types vanish at runtime; a UI needs an
 * actual array to map over.
 */
import type {
  BladeProfile, BladeGuard, BladePommel,
  AxeHead,
  SpearHead,
  StaffHead, StaffShaft,
  TridentType,
  ShieldShape, ShieldBlazon, ShieldEmblem,
} from "./types";

export interface PartOption<T extends string> {
  value: T;
  label: string;
}

export const BLADE_PROFILE_OPTIONS: PartOption<BladeProfile>[] = [
  { value: "knight", label: "Knight" },
  { value: "broad", label: "Broadsword" },
  { value: "cleaver", label: "Cleaver" },
  { value: "rapier", label: "Rapier" },
  { value: "flamberge", label: "Flamberge" },
  { value: "leaf", label: "Leaf Blade" },
  { value: "bowie", label: "Bowie" },
  { value: "estoc", label: "Estoc" },
  { value: "dagger", label: "Dagger" },
  { value: "barbed", label: "Barbed" },
];
export const BLADE_GUARD_OPTIONS: PartOption<BladeGuard>[] = [
  { value: "bar", label: "Bar" },
  { value: "swept", label: "Swept" },
  { value: "wings", label: "Wings" },
  { value: "disc", label: "Disc" },
  { value: "none", label: "None" },
];
export const BLADE_POMMEL_OPTIONS: PartOption<BladePommel>[] = [
  { value: "round", label: "Round" },
  { value: "gem", label: "Gem" },
  { value: "none", label: "None" },
];

export const AXE_HEAD_OPTIONS: PartOption<AxeHead>[] = [
  { value: "fan", label: "Fan" },
  { value: "bearded", label: "Bearded" },
  { value: "broad", label: "Broad" },
  { value: "double", label: "Double Bit" },
  { value: "crescent", label: "Crescent" },
  { value: "halberd", label: "Halberd" },
];

export const SPEAR_HEAD_OPTIONS: PartOption<SpearHead>[] = [
  { value: "leaf", label: "Leaf" },
  { value: "pike", label: "Pike" },
  { value: "broadleaf", label: "Broad Leaf" },
  { value: "winged", label: "Winged" },
  { value: "glaive", label: "Glaive" },
  { value: "harpoon", label: "Harpoon" },
  { value: "needle", label: "Needle" },
  { value: "partisan", label: "Partisan" },
  { value: "forked", label: "Forked" },
];

export const STAFF_HEAD_OPTIONS: PartOption<StaffHead>[] = [
  { value: "bare", label: "Bare Gem" },
  { value: "claws", label: "Claws" },
  { value: "crescent", label: "Crescent" },
  { value: "halo", label: "Halo" },
  { value: "wings", label: "Wings" },
  { value: "cluster", label: "Crystal Cluster" },
  { value: "collar", label: "Collar" },
  { value: "loop", label: "Loop" },
];
export const STAFF_SHAFT_OPTIONS: PartOption<StaffShaft>[] = [
  { value: "straight", label: "Straight" },
  { value: "twisted", label: "Twisted" },
  { value: "wrapped", label: "Wrapped" },
  { value: "segmented", label: "Segmented" },
];

export const TRIDENT_TYPE_OPTIONS: PartOption<TridentType>[] = [
  { value: "trident", label: "Trident" },
  { value: "pitchfork", label: "Pitchfork" },
];

export const SHIELD_SHAPE_OPTIONS: PartOption<ShieldShape>[] = [
  { value: "heater", label: "Heater" },
  { value: "kite", label: "Kite" },
  { value: "tower", label: "Tower" },
  { value: "round", label: "Round" },
  { value: "crest", label: "Crest" },
  { value: "teardrop", label: "Teardrop" },
];
export const SHIELD_BLAZON_OPTIONS: PartOption<ShieldBlazon>[] = [
  { value: "plain", label: "Plain (material)" },
  { value: "per-pale", label: "Per Pale" },
  { value: "per-bend", label: "Per Bend" },
  { value: "quarterly", label: "Quarterly" },
  { value: "chief", label: "Chief" },
];
export const SHIELD_EMBLEM_OPTIONS: PartOption<ShieldEmblem>[] = [
  { value: "boss", label: "Boss" },
  { value: "gem", label: "Gem" },
  { value: "cross", label: "Cross" },
  { value: "star", label: "Star" },
  { value: "chevron", label: "Chevron" },
  { value: "none", label: "None" },
];
