/**
 * Procedural particle FX for weapon icons. Ten seeded types, each a scatter of
 * small glowing pixels that hug the weapon's silhouette (sampled from its opaque
 * pixels) so they read as belonging to it. Drawn AFTER the outline as a light
 * layer (semi-transparent), never snapped — the icon's magical/elemental aura.
 */
import type { Pen } from "./pen";
import type { Rng } from "./rng";
export type ParticleType = "sparkle" | "ember" | "frost" | "spark" | "mote" | "leaf" | "bubble" | "blood" | "holy" | "ash";
export declare const PARTICLE_TYPES: ParticleType[];
export declare function pickParticleType(rng: Rng): ParticleType;
/**
 * Choose a particle type that MATCHES the drawn weapon: its most saturated /
 * brightest pixel picks the element — red→ember/blood, green→leaf, blue→frost/
 * bubble, gold→holy/ember, grey steel→spark/frost sheen, dark→ash, else sparkle.
 */
export declare function pickThemedParticle(pen: Pen, rng: Rng): ParticleType;
export declare function drawParticles(pen: Pen, type: ParticleType, rng: Rng, count?: number): void;
