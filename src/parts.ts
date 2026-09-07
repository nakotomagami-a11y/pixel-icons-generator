/**
 * Runtime metadata for the "build it yourself" dropdowns — a display label
 * per option, for every field {@link WeaponParts} exposes. Pure data (no
 * canvas/RNG deps) so it's safe to import from UI code. Kept separate from
 * `types.ts` because TypeScript union types vanish at runtime; a UI needs an
 * actual array to map over.
 */
import type {
  BladeProfile, BladeGuard, BladePommel, BladeModification,
  AxeHead, AxeBack, AxeButt, AxeDecoration,
  SpearHead, SpearCollar, SpearButt, SpearDecoration,
  StaffHead, StaffShaft, StaffBinding, StaffFoot,
  TridentType,
  ShieldShape, ShieldBlazon, ShieldEmblem, ShieldRim,
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
  { value: "katana", label: "Katana" },
  { value: "dagger", label: "Dagger" },
  { value: "barbed", label: "Barbed" },
];
export const BLADE_GUARD_OPTIONS: PartOption<BladeGuard>[] = [
  { value: "bar", label: "Bar" },
  { value: "vee", label: "V-Guard" },
  { value: "swept", label: "Swept" },
  { value: "winged", label: "Winged" },
  { value: "balled", label: "Ball Tips" },
  { value: "spiked", label: "Spiked" },
  { value: "oval", label: "Oval Plate" },
  { value: "ring", label: "Ring" },
  { value: "cup", label: "Cup" },
  { value: "shell", label: "Shell" },
  { value: "plate", label: "Plate" },
  { value: "knucklebow", label: "Knuckle-Bow" },
  { value: "none", label: "None" },
];
export const BLADE_POMMEL_OPTIONS: PartOption<BladePommel>[] = [
  { value: "round", label: "Round" },
  { value: "gem", label: "Gem" },
  { value: "faceted", label: "Faceted Gem" },
  { value: "wheel", label: "Wheel" },
  { value: "ring", label: "Ring" },
  { value: "trefoil", label: "Trefoil" },
  { value: "acorn", label: "Acorn" },
  { value: "scentstopper", label: "Scent-Stopper" },
  { value: "spike", label: "Spike" },
  { value: "flanged", label: "Flanged" },
  { value: "crown", label: "Crown" },
  { value: "birdhead", label: "Bird-Head" },
  { value: "crescent", label: "Crescent" },
  { value: "none", label: "None" },
];
export const BLADE_MODIFICATION_OPTIONS: PartOption<BladeModification>[] = [
  { value: "none", label: "None" },
  { value: "serrated", label: "Serrated Edge" },
  { value: "notched", label: "Notched Edge" },
  { value: "fullered", label: "Fullered" },
  { value: "riveted", label: "Riveted Spine" },
  { value: "wavy", label: "Wavy Blade" },
  { value: "fireTempered", label: "Fire-Tempered" },
  { value: "runes", label: "Runes" },
  { value: "gems", label: "Inset Gems" },
  { value: "etched", label: "Diamond Etched" },
];

export const AXE_HEAD_OPTIONS: PartOption<AxeHead>[] = [
  { value: "fan", label: "Fan" },
  { value: "bearded", label: "Bearded" },
  { value: "broad", label: "Broad" },
  { value: "double", label: "Double Bit" },
  { value: "crescent", label: "Crescent" },
  { value: "halberd", label: "Halberd" },
  { value: "warpick", label: "War-Pick" },
  { value: "hammer", label: "War-Hammer" },
  { value: "greataxe", label: "Greataxe" },
  { value: "tomahawk", label: "Tomahawk" },
];
export const AXE_BACK_OPTIONS: PartOption<AxeBack>[] = [
  { value: "none", label: "None" },
  { value: "spike", label: "Spike" },
  { value: "pick", label: "Pick" },
  { value: "hammer", label: "Hammer Poll" },
  { value: "hook", label: "Hook" },
];
export const AXE_BUTT_OPTIONS: PartOption<AxeButt>[] = [
  { value: "none", label: "None" },
  { value: "ring", label: "End Ring" },
  { value: "cap", label: "Cap" },
  { value: "spike", label: "Spike" },
];
export const AXE_DECORATION_OPTIONS: PartOption<AxeDecoration>[] = [
  { value: "none", label: "None" },
  { value: "gem", label: "Gem" },
  { value: "rivets", label: "Rivets" },
  { value: "inlay", label: "Inlay Band" },
  { value: "thongs", label: "Leather Thongs" },
  { value: "fuller", label: "Fuller Groove" },
  { value: "runes", label: "Runes" },
  { value: "notch", label: "Notched Edge" },
  { value: "wrap", label: "Haft Wrap" },
  { value: "ferrule", label: "Ferrule Band" },
];

export const SPEAR_HEAD_OPTIONS: PartOption<SpearHead>[] = [
  { value: "leaf", label: "Leaf" },
  { value: "broadleaf", label: "Broad Leaf" },
  { value: "pike", label: "Pike" },
  { value: "winged", label: "Winged" },
  { value: "glaive", label: "Glaive" },
  { value: "harpoon", label: "Harpoon" },
  { value: "needle", label: "Needle" },
  { value: "partisan", label: "Partisan" },
  { value: "forked", label: "Forked" },
  { value: "flame", label: "Flame" },
  { value: "crescent", label: "Crescent" },
  { value: "crystal", label: "Crystal" },
];
export const SPEAR_COLLAR_OPTIONS: PartOption<SpearCollar>[] = [
  { value: "none", label: "None" },
  { value: "ferrule", label: "Ferrule" },
  { value: "sleeve", label: "Sleeve" },
  { value: "langets", label: "Langets" },
  { value: "gem", label: "Gem" },
  { value: "ring", label: "Ring" },
  { value: "winged", label: "Winged" },
  { value: "spiked", label: "Spiked" },
];
export const SPEAR_BUTT_OPTIONS: PartOption<SpearButt>[] = [
  { value: "none", label: "None" },
  { value: "cap", label: "Cap" },
  { value: "spike", label: "Spike" },
  { value: "ball", label: "Ball" },
  { value: "ring", label: "Ring" },
];
export const SPEAR_DECORATION_OPTIONS: PartOption<SpearDecoration>[] = [
  { value: "none", label: "None" },
  { value: "ribbons", label: "Ribbons" },
  { value: "pennant", label: "Pennant" },
  { value: "tassel", label: "Tassel" },
  { value: "wrap", label: "Shaft Wrap" },
  { value: "gem", label: "Gem" },
  { value: "charm", label: "Charm" },
  { value: "feathers", label: "Feathers" },
];

export const STAFF_HEAD_OPTIONS: PartOption<StaffHead>[] = [
  { value: "orb", label: "Orb" },
  { value: "crystal", label: "Crystal" },
  { value: "cluster", label: "Crystal Cluster" },
  { value: "crescent", label: "Crescent Moon" },
  { value: "halo", label: "Halo" },
  { value: "claws", label: "Claws" },
  { value: "wings", label: "Wings" },
  { value: "loop", label: "Loop" },
  { value: "crook", label: "Shepherd's Crook" },
  { value: "twinhorns", label: "Twin Horns" },
  { value: "star", label: "Star" },
  { value: "branch", label: "Living Branch" },
];
export const STAFF_SHAFT_OPTIONS: PartOption<StaffShaft>[] = [
  { value: "straight", label: "Straight" },
  { value: "twisted", label: "Twisted" },
  { value: "wrapped", label: "Wrapped" },
  { value: "spiral", label: "Spiral-Carved" },
  { value: "gnarled", label: "Gnarled" },
  { value: "bone", label: "Bone" },
  { value: "metal", label: "Metal" },
  { value: "lacquer", label: "Lacquer" },
];
export const STAFF_BINDING_OPTIONS: PartOption<StaffBinding>[] = [
  { value: "none", label: "None" },
  { value: "collar", label: "Collar" },
  { value: "wrap", label: "Cord Wrap" },
  { value: "spiralcord", label: "Spiral Cord" },
  { value: "leaves", label: "Leaves" },
  { value: "vines", label: "Vines" },
  { value: "ribbons", label: "Ribbons" },
  { value: "talisman", label: "Talisman" },
  { value: "feathers", label: "Feathers" },
  { value: "runes", label: "Runes" },
  { value: "charm", label: "Hanging Charm" },
];
export const STAFF_FOOT_OPTIONS: PartOption<StaffFoot>[] = [
  { value: "none", label: "None" },
  { value: "ferrule", label: "Ferrule" },
  { value: "cap", label: "Cap" },
  { value: "spike", label: "Spike" },
  { value: "orb", label: "Orb" },
  { value: "claw", label: "Claw Foot" },
  { value: "sphere", label: "Sphere" },
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
  { value: "lozenge", label: "Lozenge" },
  { value: "hexagon", label: "Hexagon" },
  { value: "scallop", label: "Scallop" },
  { value: "oval", label: "Oval" },
];
export const SHIELD_BLAZON_OPTIONS: PartOption<ShieldBlazon>[] = [
  { value: "planked", label: "Planked" },
  { value: "marble", label: "Marble" },
  { value: "hammered", label: "Hammered" },
  { value: "bone", label: "Bone" },
  { value: "scaled", label: "Scaled" },
  { value: "leather", label: "Leather" },
  { value: "weave", label: "Weave" },
  { value: "verdigris", label: "Verdigris" },
  { value: "crystal", label: "Crystal" },
  { value: "half-vertical", label: "Half — Vertical" },
  { value: "half-horizontal", label: "Half — Horizontal" },
  { value: "half-diagonal", label: "Half — Diagonal" },
  { value: "quarters", label: "Quarters" },
  { value: "stripes-vertical", label: "Stripes — Vertical" },
  { value: "stripes-horizontal", label: "Stripes — Horizontal" },
  { value: "stripes-diagonal", label: "Stripes — Diagonal" },
  { value: "checker", label: "Checkerboard" },
  { value: "diamonds", label: "Diamonds" },
];
export const SHIELD_EMBLEM_OPTIONS: PartOption<ShieldEmblem>[] = [
  { value: "boss", label: "Boss" },
  { value: "gem", label: "Gem" },
  { value: "cross", label: "Cross" },
  { value: "star", label: "Star" },
  { value: "chevron", label: "Chevron" },
  { value: "crescent", label: "Crescent" },
  { value: "bolt", label: "Bolt" },
  { value: "sun", label: "Sun" },
  { value: "ring", label: "Ring" },
  { value: "diamond", label: "Diamond" },
  { value: "studs", label: "Studs" },
  { value: "none", label: "None" },
];
export const SHIELD_RIM_OPTIONS: PartOption<ShieldRim>[] = [
  { value: "none", label: "None" },
  { value: "metal", label: "Metal" },
  { value: "gold", label: "Gold" },
  { value: "dark", label: "Dark Iron" },
  { value: "banded", label: "Banded" },
  { value: "riveted", label: "Riveted" },
  { value: "studded", label: "Studded" },
  { value: "corners", label: "Corner Brackets" },
  { value: "notched", label: "Notched" },
  { value: "rope", label: "Rope" },
  { value: "engraved", label: "Engraved" },
  { value: "runic", label: "Runic" },
  { value: "spiked", label: "Spiked" },
];
