import { sfc32, xmur3 } from "./rng";
import { setCelSteps } from "./color";
import { drawParticles, pickParticleType, pickThemedParticle } from "./particles";
import { Pen } from "./pen";
import { drawBlade } from "./weapons/blade";
import { drawSpear } from "./weapons/spear";
import { drawAxe } from "./weapons/axe";
import { drawStaff } from "./weapons/staff";
import { drawTrident } from "./weapons/trident";
import { drawShield } from "./weapons/shield";
const ALL_CLASSES = ["blades", "spears", "axes", "staffs", "tridents", "shields"];
const DRAW = {
    blades: drawBlade,
    spears: drawSpear,
    axes: drawAxe,
    staffs: drawStaff,
    tridents: drawTrident,
    shields: drawShield,
};
export class IconGenerator {
    constructor(ctx, dimension, options = {}) {
        this.pen = new Pen(ctx, dimension, options);
    }
    /** Draw the configured icon into the context. */
    generate(config) {
        const seed = config.seed;
        // meta-rng resolves "any" / "anyweapon" to a concrete class deterministically
        const metaGen = xmur3(seed);
        const metaRandom = sfc32(metaGen(), metaGen(), metaGen(), metaGen());
        let drawClass;
        const sel = config.iconClass;
        // Meta-selectors and any class we no longer draw (e.g. a persisted icon from
        // a since-removed class) resolve to a concrete class deterministically.
        if (sel === "any" || sel === "anyweapon" || !(sel in DRAW)) {
            drawClass = ALL_CLASSES[Math.floor(ALL_CLASSES.length * metaRandom())];
        }
        else {
            drawClass = sel;
        }
        setCelSteps(this.pen.celSteps);
        this.pen.rng.seed(seed);
        const parts = config.parts;
        switch (drawClass) {
            case "blades":
                drawBlade(this.pen, parts?.blades);
                break;
            case "spears":
                drawSpear(this.pen, parts?.spears);
                break;
            case "axes":
                drawAxe(this.pen, parts?.axes);
                break;
            case "staffs":
                drawStaff(this.pen, parts?.staffs);
                break;
            case "tridents":
                drawTrident(this.pen, parts?.tridents);
                break;
            case "shields":
                drawShield(this.pen, parts?.shields);
                break;
        }
        // Particle FX overlay (drawn over the finished, outlined icon).
        if (this.pen.particles && this.pen.particles !== "none") {
            const mode = this.pen.particles;
            // Auto modes only decorate ~30% of icons; the gate is a fresh seed hash so
            // it's a clean uniform 30% independent of the weapon's RNG usage. An
            // explicit type is always drawn.
            const auto = mode === "random" || mode === "themed";
            const fxGen = xmur3(`${seed}:fx`);
            const fxRandom = sfc32(fxGen(), fxGen(), fxGen(), fxGen());
            if (!auto || fxRandom() < 0.3) {
                this.pen.rng.checkpoint();
                const type = mode === "random" ? pickParticleType(this.pen.rng)
                    : mode === "themed" ? pickThemedParticle(this.pen, this.pen.rng)
                        : mode;
                drawParticles(this.pen, type, this.pen.rng);
            }
        }
        return drawClass;
    }
}
/**
 * Convenience one-shot: draw an icon into a fresh context.
 * Returns the concrete class that was drawn (useful when `iconClass` was a
 * meta-selector like "anyweapon").
 */
export function generateIcon(ctx, dimension, config, options) {
    return new IconGenerator(ctx, dimension, options).generate(config);
}
