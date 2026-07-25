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
 * `blades` and `spears` are weapons; `potions` is a consumable.
 */
export type IconClass = "potions" | "blades" | "spears";

/**
 * What to generate. In addition to the concrete classes, two meta-values
 * resolve to a concrete class deterministically from the seed:
 *   - `any`       → potions | blades | spears
 *   - `anyweapon` → blades | spears
 */
export type IconClassSelector = IconClass | "any" | "anyweapon";

/**
 * Serialisable icon configuration. Safe to store in JSON / YAML / a database.
 * The same `seed` + `iconClass` always produce the same icon on every device.
 */
export interface IconConfig {
  /** String seed. Drives every procedural choice. */
  seed: string;
  /** Which generator to run, or a meta-selector resolved from the seed. */
  iconClass: IconClassSelector;
}
