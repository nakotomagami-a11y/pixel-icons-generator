import type { IconConfig } from "../types";
import type { ParticleType } from "../particles";
export interface WeaponIconProps {
    /** Icon configuration (seed + class). Same config → same icon everywhere. */
    config: IconConfig;
    /** Display size in CSS pixels. @default 48 */
    size?: number;
    /**
     * Native render resolution in pixels. Lower = chunkier, more deliberate
     * pixels — which is what makes the tiny-swords pack read clean: a fixed low
     * native res with big blocks, not fine-grained detail. Omit to derive a
     * pack-like value from `size` (≈0.55×, clamped to 28–44); high resolutions
     * only amplify the procedural edge noise and look rough. Pass an explicit
     * value to override.
     */
    dimension?: number;
    /**
     * Outline color [r, g, b] 0–255. Omit for the original pure black; a dark
     * desaturated tone (e.g. [26, 22, 34]) reads softer against dark UIs.
     */
    border?: [number, number, number];
    /**
     * Particle FX aura over the icon: a {@link ParticleType}, "random" (seeded),
     * "themed" (matched to the weapon's colour), or omit for none. Ten types
     * (sparkle/ember/frost/spark/mote/leaf/bubble/blood/holy/ash), each hugging the
     * weapon so it reads as belonging to it.
     */
    particles?: ParticleType | "random" | "themed" | "none";
    /** Forwarded to the canvas element. */
    className?: string;
}
export declare const WeaponIcon: import("react").NamedExoticComponent<WeaponIconProps>;
