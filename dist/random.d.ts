/**
 * Random config helpers for "reroll" buttons. Uses `Math.random()` — not
 * seeded. For deterministic generation, construct an {@link IconConfig} with a
 * stable seed string yourself.
 */
import type { IconClass, IconClassSelector, IconConfig } from "./types";
/** Random config with the given selector (default "anyweapon"). */
export declare function randomIcon(iconClass?: IconClassSelector): IconConfig;
/** Random config pinned to one concrete class. */
export declare function randomIconOfClass(iconClass: IconClass): IconConfig;
