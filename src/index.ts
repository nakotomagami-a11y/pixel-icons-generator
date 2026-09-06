/**
 * pixel-icons — procedural pixel-art weapon icon generator.
 *
 * TypeScript port of Icon Machine by Brian MacIntosh (GPL-3.0).
 * See README for attribution and licensing.
 */
export type {
  Color, IconClass, IconClassSelector, IconConfig,
  WeaponParts,
  BladeParts, BladeProfile, BladeGuard, BladePommel, BladeModification,
  AxeParts, AxeHead, AxeBack, AxeButt, AxeDecoration,
  SpearParts, SpearHead, SpearCollar, SpearButt, SpearDecoration,
  StaffParts, StaffHead, StaffShaft, StaffBinding,
  TridentParts, TridentType,
  ShieldParts, ShieldShape, ShieldBlazon, ShieldEmblem, ShieldRim,
} from "./types";
export { IconGenerator, generateIcon, type Ctx2D } from "./generator";
export { randomIcon, randomIconOfClass } from "./random";
export { createRandomSeed } from "./rng";
export { Vector, Bounds } from "./math";
export { PARTICLE_TYPES, pickParticleType, type ParticleType } from "./particles";
export {
  type PartOption,
  BLADE_PROFILE_OPTIONS, BLADE_GUARD_OPTIONS, BLADE_POMMEL_OPTIONS, BLADE_MODIFICATION_OPTIONS,
  AXE_HEAD_OPTIONS, AXE_BACK_OPTIONS, AXE_BUTT_OPTIONS, AXE_DECORATION_OPTIONS,
  SPEAR_HEAD_OPTIONS, SPEAR_COLLAR_OPTIONS, SPEAR_BUTT_OPTIONS, SPEAR_DECORATION_OPTIONS,
  STAFF_HEAD_OPTIONS, STAFF_SHAFT_OPTIONS, STAFF_BINDING_OPTIONS,
  TRIDENT_TYPE_OPTIONS,
  SHIELD_SHAPE_OPTIONS, SHIELD_BLAZON_OPTIONS, SHIELD_EMBLEM_OPTIONS, SHIELD_RIM_OPTIONS,
} from "./parts";
