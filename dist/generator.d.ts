/**
 * IconGenerator — faithful TypeScript port of Brian MacIntosh's Icon Machine
 * procedural pixel-art weapon generator.
 *
 * The original was a single `RandomArt` object bound to the page DOM. This
 * strips the UI: construct with a 2D canvas context + a square dimension, then
 * call `generate(config)`. Same seed + class → same icon on every device.
 *
 * The drawing math is kept 1:1 with the source (including its quirks). The
 * shared drawing surface lives in {@link Pen}; each weapon is a standalone
 * function in `./weapons/*` that draws onto a Pen.
 */
import type { IconClass, IconConfig } from "./types";
import { type Ctx2D, type IconOptions } from "./pen";
export type { Ctx2D, IconOptions } from "./pen";
export declare class IconGenerator {
    private pen;
    constructor(ctx: Ctx2D, dimension: number, options?: IconOptions);
    /** Draw the configured icon into the context. */
    generate(config: IconConfig): IconClass;
}
/**
 * Convenience one-shot: draw an icon into a fresh context.
 * Returns the concrete class that was drawn (useful when `iconClass` was a
 * meta-selector like "anyweapon").
 */
export declare function generateIcon(ctx: Ctx2D, dimension: number, config: IconConfig, options?: IconOptions): IconClass;
