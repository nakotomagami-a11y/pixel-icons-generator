/**
 * Pen — shared drawing surface for the weapon generators.
 * Extracted from IconGenerator — faithful TypeScript port of Brian MacIntosh's Icon Machine
 * procedural pixel-art weapon generator (blades, spears).
 *
 * The original also generates potions; that generator was dropped in this
 * build — only the weapon generators are ported.
 *
 * The original was a single `RandomArt` object bound to the page DOM. This
 * strips the UI: construct with a 2D canvas context + a square dimension, then
 * call `generate(config)`. Same seed + class → same icon on every device.
 *
 * The drawing math is kept 1:1 with the source (including its quirks) so output
 * matches the original pixel-for-pixel.
 */
import type { Color } from "./types";
import { Vector } from "./math";
import type { ParticleType } from "./particles";
import { Rng } from "./rng";
/** Subset of CanvasRenderingContext2D the generator relies on. */
export type Ctx2D = CanvasRenderingContext2D;
export interface IconOptions {
    /**
     * Outline color as [r, g, b], 0–255. Default is a warm near-black
     * ([32, 26, 38]) — the tiny-swords pack outlines in a dark desaturated plum,
     * not pure black, which reads softer against dark UIs. Pass [0,0,0] for the
     * original hard black.
     */
    border?: [number, number, number];
    /**
     * Cel-shading step count. Snaps every shade blend to N discrete value bands
     * for the hand-drawn tiny-swords look instead of smooth gradients. 0/1 =
     * continuous (original). Default: 4.
     */
    celSteps?: number;
    /**
     * Particle FX overlay. A {@link ParticleType} draws that aura; "random" picks
     * one from the seed; "themed" picks one matching the weapon's colour; omit /
     * "none" for no particles.
     */
    particles?: ParticleType | "random" | "themed" | "none";
}
export declare class Pen {
    ctx: Ctx2D;
    dimension: number;
    rng: Rng;
    translation: Vector;
    border: [number, number, number];
    celSteps: number;
    particles: ParticleType | "random" | "themed" | "none";
    constructor(ctx: Ctx2D, dimension: number, options?: IconOptions);
    clearCanvas(): void;
    drawPixel(x: number, y: number): void;
    /**
     * De-jaggy the silhouette before outlining. The tiny-swords pack reads clean
     * because its edges are deliberate hand-drawn curves with no stray pixels; our
     * procedural shapes leave orphan specks and single-pixel staircase notches. A
     * 3×3 neighbour pass:
     *   - clears opaque pixels with ≤1 opaque neighbour  → removes floating debris
     *     and lone protrusion tips
     *   - fills transparent pixels with ≥5 opaque neighbours → closes pinholes and
     *     rounds concave staircase corners (filled with the neighbour-average
     *     colour, which the outline then borders)
     * The ≤1 / ≥5 thresholds are deliberately extreme so 1px diagonal shafts
     * (which have exactly 2 opaque neighbours per pixel) are never eroded or
     * fattened.
     */
    cleanSilhouette(): void;
    /**
     * Snap every opaque pixel to the nearest fixed material tone. Continuous
     * shader gradients (cone lerps, edge lightens, orb falloff) collapse into the
     * pack's hard 4-tones-per-material cel bands, and the whole icon's colour
     * count drops to the ~12–16 the pack uses. Nearest-RGB keeps pixels within
     * their material family (the ramps are hue-separated).
     */
    snapToPalette(): void;
    /**
     * Battle-wear: a few short darker scratch strokes across the interior metal so
     * blades/heads read as USED, not factory-new. Interior-only (all 4 orthogonal
     * neighbours opaque) so it never nibbles the silhouette; the darkened pixels
     * snap to the material's shadow tone in {@link snapToPalette}. `amount` 0..1
     * scales the scratch count. Call before {@link addBorder}.
     */
    weather(amount: number): void;
    /**
     * Outline the silhouette. Selective (2-tone) like the pack: the near-black
     * `border` on shadowed (bottom-right) edges, a lifted navy on the top-left
     * lit edges. The light edge doubles as the only thing that reads against a
     * near-black UI card — a pure `#161c2e` outline vanishes on `#1a1a1a`.
     */
    addBorder(): void;
    /** Soft radial alpha falloff, used as a post-outline bloom overlay. */
    drawGlow(center: Vector, radius: number, color: Color): void;
    /** Tapered cone from (cx,cy) along (dx,dy): width `halfBase` at `startD`,
     *  narrowing to a point at `startD+len`. Shaded by facing + tip. */
    fillCone(cx: number, cy: number, dx: number, dy: number, startD: number, len: number, halfBase: number, light: Color, dark: Color): void;
    /**
     * A flowing cloth ribbon/streamer from (rx,ry) along (dx,dy). Unlike a flat
     * fillCone it flutters (lateral sine), tapers, and shades ACROSS its width —
     * one edge catches light, the fold darkens — with an optional swallowtail fork.
     * Reads as cloth, not a painted triangle.
     */
    drawRibbon(rx: number, ry: number, dx: number, dy: number, len: number, width: number, ramp: {
        shadow: Color;
        mid: Color;
        light: Color;
    }, opts?: {
        wave?: number;
        waveLen?: number;
        taper?: boolean;
        twist?: boolean;
        swallowtail?: boolean;
    }): void;
    drawBladeHelper(params: BladeParams): BladeResults;
    drawCrossguardHelper(params: CrossguardParams): CrossguardResults;
    drawGripHelper(params: GripParams): void;
    drawHaftHelper(params: HaftParams): {
        radius: number;
    };
    drawRodHelper(params: RodParams): void;
    drawRoundOrnamentHelper(params: OrnamentParams): void;
}
/** Discrete blade-profile knobs. Absent → the original random meander. */
export interface BladeStyle {
    /** Constant curvature per unit length (rad) → saber / scimitar arc. */
    curve?: number;
    /** Curvature direction, +1 (edge-forward) or -1. */
    curveDir?: number;
    /** Centreline wave amplitude (rad) → flamberge / kris. */
    wave?: number;
    /** Wave wavelength in base px. */
    waveLen?: number;
    /** Width-ripple amplitude in base px (0 = clean straight edges). */
    widthAmp?: number;
    /** Single-edged: bright cutting edge on one lateral side, dark flat spine on
     *  the other (saber / falchion / cleaver / katana). Default double-edged. */
    singleEdge?: boolean;
    /** Leaf/waisted blade: swell the width mid-blade by this factor (0.4–0.6). */
    bulge?: number;
    /** Clip-point (bowie): the spine side angles to the tip over the last `clip`
     *  fraction of the blade (0.2–0.35). */
    clip?: number;
    /** Draw a darker fuller (blood groove) down the blade centre. */
    fuller?: boolean;
    /** Saw-tooth serrations; value = tooth height in base px. */
    serrate?: number;
    /** Which side the serrations sit on. Default "edge" (widthL). */
    serrateSide?: "edge" | "spine" | "both";
    /** Serration tooth period in base px. Default 3 (fine). Larger = chunkier teeth. */
    serratePeriod?: number;
    /** Max total accumulated bend for a styled curve (rad). Default π/3 (scimitar).
     *  Raise for sickle/khopesh hooks. */
    maxTurn?: number;
    /** Override the blade metal (e.g. a magic crystal). Default: picked from the
     *  steel/bronze/iron pool. */
    metal?: {
        shadow: Color;
        mid: Color;
        light: Color;
        spec: Color;
    };
}
export interface BladeParams {
    startDiag: number;
    taperFactor: number;
    startRadius: number;
    style?: BladeStyle;
}
export interface BladeResults {
    startDiag: number;
    startOrtho: number;
    startRadius: number;
    hiltColor: Color;
    tipColor: Color;
}
export interface CrossguardParams {
    positionDiag: number;
    halfLength: number;
    omegaChance?: number;
    omegaAmount?: number;
    thickness?: number;
}
export interface CrossguardResults {
    colorLight: Color;
    colorDark: Color;
}
export interface GripParams {
    startDiag: number;
    lengthDiag: number;
    minRadius?: number;
    maxRadius: number;
    fractionalRadiusAllowed?: boolean;
}
export interface HaftParams {
    startDiag: number;
    lengthDiag: number;
    minRadius?: number;
    maxRadius: number;
    fractionalRadiusAllowed?: boolean;
    color?: Color;
}
export interface RodParams {
    radius: number;
    startDiag: number;
    lengthDiag: number;
    colorFunc: (l: number) => Color;
}
export interface OrnamentParams {
    center: Vector;
    radius: number;
    /** Vertical radius, for a flattened/elongated ellipse (e.g. a wheel or
     *  scent-stopper pommel). Default: same as `radius` (a circle). */
    radiusY?: number;
    /** Inner radius left unpainted, punching a hole through the middle (a ring
     *  pommel). Default: 0 (solid). */
    holeRadius?: number;
    colorLight?: Color;
    colorDark?: Color;
}
/**
 * Convenience one-shot: draw an icon into a fresh context.
 * Returns the concrete class that was drawn (useful when `iconClass` was a
 * meta-selector like "anyweapon").
 */
