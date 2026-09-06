import { Vector, Bounds } from "../math";
import { pickGem, pickCrystal, pickGuardAccent, FIRE_TEMPERED } from "../palette";
import { colorLerp, colorStr } from "../color";
const PROFILES = {
    knight: { radius: [3, 4], taper: 0.16, hilt: [6, 9], makeStyle: () => ({ widthAmp: 0 }) },
    broad: { radius: [4, 5], taper: 0.2, hilt: [6, 9], wide: true, makeStyle: () => ({ widthAmp: 0, fuller: true }) },
    cleaver: { radius: [5, 6], taper: 0.26, hilt: [5, 8], wide: true, makeStyle: () => ({ widthAmp: 0, singleEdge: true }) },
    // A rapier reads as a rapier from two things: a genuinely needle-thin blade
    // that tapers along nearly its whole length, and the ornate hand-guard — so
    // its guard pick is restricted to guards that read as that.
    rapier: { radius: [1, 1], taper: 0.68, hilt: [7, 11], guardPool: ["swept", "swept", "cup", "ring", "shell", "knucklebow"], makeStyle: () => ({ widthAmp: 0 }) },
    flamberge: { radius: [3, 3], taper: 0.18, hilt: [6, 9], makeStyle: () => ({ wave: 0.22, waveLen: 8, widthAmp: 0 }) },
    leaf: { radius: [2, 3], taper: 0.34, hilt: [6, 9], makeStyle: () => ({ widthAmp: 0, bulge: 0.55 }) },
    bowie: { radius: [3, 4], taper: 0.14, hilt: [6, 8], makeStyle: () => ({ widthAmp: 0, clip: 0.3, singleEdge: true }) },
    katana: { radius: [2, 2], taper: 0.14, hilt: [8, 12], makeStyle: () => ({ widthAmp: 0, fuller: true }) },
    dagger: { radius: [3, 3], taper: 0.3, hilt: [5, 7], makeStyle: () => ({ widthAmp: 0, clip: 0.22, singleEdge: true }) },
    barbed: { radius: [2, 3], taper: 0.2, hilt: [6, 9], barbed: true, makeStyle: () => ({ widthAmp: 0 }) },
};
const PROFILE_KEYS = Object.keys(PROFILES);
// A plain crossbar stays common (weight 2); "none" is a rare, deliberate pick.
const GUARDS = [
    "bar", "bar", "vee", "swept", "winged", "balled", "spiked",
    "oval", "ring", "cup", "shell", "plate", "knucklebow", "none",
];
// Guards that don't work on a wide blade's base — compact/round ones don't
// span past it, and angled-arm ones overlap into the broad steel — forced to
// a spanning straight-bar-family guard for `wide` profiles.
const ROUND_GUARDS = ["ring", "cup", "shell", "plate", "vee", "swept", "knucklebow"];
/** Legacy → current mapping for persisted configs from the old guard set. */
const LEGACY_GUARDS = {
    wings: "winged",
    disc: "oval",
    hook: "swept",
    hourglass: "balled",
    langets: "bar",
    sidering: "ring",
    trilobe: "shell",
    starburst: "spiked",
    basket: "knucklebow",
};
const POMMELS = [
    "round", "round", "gem", "faceted", "wheel", "ring", "trefoil",
    "acorn", "scentstopper", "spike", "flanged", "crown", "birdhead", "crescent", "none",
];
// Blade decorations, applicable to EVERY profile. "none" weighted heavily so
// most random rolls stay a clean blade; a decoration is a deliberate accent,
// not the common case.
const MODIFICATIONS = [
    "none", "none", "none", "none", "none", "none", "none", "none",
    "serrated", "notched", "fullered", "riveted", "wavy", "fireTempered",
    "runes", "gems", "etched",
];
/** Legacy value from the WIP era. */
const LEGACY_MODIFICATIONS = { diamond: "etched" };
/** Merge a modification's style deltas onto the profile's base style. Only
 *  the shape-affecting knobs `drawBladeHelper` already understands. `dscale`
 *  scales `serrate`/`serratePeriod` — unlike `waveLen` (scaled internally by
 *  `drawBladeHelper`), serrations are applied in raw render pixels. */
function applyModification(style, mod, dscale) {
    switch (mod) {
        case "serrated":
            // Fine, frequent teeth on the cutting edge only.
            style.serrate = 1.3 * dscale;
            style.serratePeriod = 3 * dscale;
            style.serrateSide = "edge";
            break;
        case "notched":
            // Fewer, chunkier notches on both edges — a castellated look, distinct
            // from "serrated"'s fine sawtooth.
            style.serrate = 1.8 * dscale;
            style.serratePeriod = 5.5 * dscale;
            style.serrateSide = "both";
            break;
        case "fullered":
            style.fuller = true;
            break;
        case "wavy":
            // Gentler than the dedicated `flamberge` profile's wave (0.22/8) — a
            // hint of ripple, not a full kris.
            style.wave = 0.16;
            style.waveLen = 7;
            break;
        case "fireTempered":
            // A heat-quenched blade: dark red base fading to hot yellow-white at
            // the tip — the hilt→tip gradient the helper already draws is exactly
            // the effect; only the ramp changes.
            style.metal = FIRE_TEMPERED;
            break;
        case "riveted":
        case "runes":
        case "gems":
        case "etched":
        case "none":
            break; // post-draw stamps, see drawBlade
    }
}
const pick = (r, arr) => arr[Math.floor(r.float() * arr.length) % arr.length];
const rangeIncl = (r, lo, hi) => r.range(lo, hi + 1);
const norm = (x, y) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };
const rotate = (v, a) => ({
    x: v.x * Math.cos(a) - v.y * Math.sin(a),
    y: v.x * Math.sin(a) + v.y * Math.cos(a),
});
/** Small diamond/rhombus mark — same light-to-dark falloff as
 *  `drawRoundOrnamentHelper` but Manhattan distance, so a faceted gem reads
 *  as a cut stone rather than a ball. */
function drawFacetedGem(pen, center, radius, light, dark) {
    for (let x = Math.floor(center.x - radius); x <= Math.ceil(center.x + radius); x++) {
        for (let y = Math.floor(center.y - radius); y <= Math.ceil(center.y + radius); y++) {
            const dist = Math.abs(x - center.x) + Math.abs(y - center.y);
            if (dist <= radius) {
                pen.ctx.fillStyle = colorStr(colorLerp(light, dark, dist / radius));
                pen.drawPixel(x, y);
            }
        }
    }
}
/**
 * A straight beveled bar between two points: every pixel within `half` of the
 * segment, shaded across its thickness (lit toward the blade tip side). The
 * workhorse for the whole crossguard family — deterministic geometry, no
 * wandering integrator, so every guard style lands exactly where intended.
 */
function fillBar(pen, x0, y0, x1, y1, half, light, dark, litDir) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - half - 1));
    const maxX = Math.min(pen.dimension - 1, Math.ceil(Math.max(x0, x1) + half + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - half - 1));
    const maxY = Math.min(pen.dimension - 1, Math.ceil(Math.max(y0, y1) + half + 1));
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const px = x - x0;
            const py = y - y0;
            let t = (px * ux + py * uy);
            t = Math.max(0, Math.min(len, t));
            const cx = x0 + ux * t;
            const cy = y0 + uy * t;
            const d = Math.hypot(x - cx, y - cy);
            if (d > half)
                continue;
            // Bevel: lit on the blade-tip side of the bar's axis, shadowed opposite.
            const side = ((x - cx) * litDir.x + (y - cy) * litDir.y) / (half || 1);
            const shade = 0.65 + 0.35 * Math.max(-1, Math.min(1, side)) - 0.25 * (d / half) * (side < 0 ? 1 : 0);
            pen.ctx.fillStyle = colorStr(colorLerp(dark, light, Math.max(0, Math.min(1, shade))));
            pen.drawPixel(x, y);
        }
    }
}
export function drawBlade(pen, parts) {
    pen.rng.checkpoint();
    const r = pen.rng;
    const bounds = new Bounds(0, 0, pen.dimension, pen.dimension);
    const dscale = bounds.h / 32;
    pen.clearCanvas();
    // A persisted skill config can name a value that's since been removed or
    // renamed — map legacy names, otherwise fall back to a random pick.
    const requestedProfile = parts?.profile && parts.profile in PROFILES ? parts.profile : undefined;
    const profileKey = requestedProfile ?? pick(r, PROFILE_KEYS);
    const prof = PROFILES[profileKey];
    const style = prof.makeStyle?.(r) ?? {};
    // ~12% of blades are an enchanted crystal (colour variety).
    if (r.float() < 0.12)
        style.metal = pickCrystal(r);
    const requestedMod = parts?.modification;
    const modification = requestedMod && MODIFICATIONS.includes(requestedMod)
        ? requestedMod
        : requestedMod && requestedMod in LEGACY_MODIFICATIONS
            ? LEGACY_MODIFICATIONS[requestedMod]
            : pick(r, MODIFICATIONS);
    applyModification(style, modification, dscale);
    const requestedGuard = parts?.guard;
    let guard = requestedGuard && GUARDS.includes(requestedGuard)
        ? requestedGuard
        : requestedGuard && requestedGuard in LEGACY_GUARDS
            ? LEGACY_GUARDS[requestedGuard]
            : pick(r, prof.guardPool ?? GUARDS);
    // A broad blade's base overlaps the grip; without a spanning crossguard it
    // reads as a slab sitting straight on the pommel. Force one for wide
    // profiles — even over an explicit compact-guard pick, since that's a
    // rendering artifact (slab-on-pommel), not a style choice worth honouring.
    if (prof.wide && (guard === "none" || ROUND_GUARDS.includes(guard)))
        guard = "bar";
    const requestedPommel = parts?.pommel;
    const pommel = requestedPommel && POMMELS.includes(requestedPommel) ? requestedPommel : pick(r, POMMELS);
    const twoHanded = parts?.twoHanded ?? r.float() < 0.22;
    const startRadius = Math.ceil(rangeIncl(r, prof.radius[0], prof.radius[1]) * dscale);
    const pommelLength = pommel === "none" ? 0 : Math.ceil((0.5 + r.floatLow() * 0.9) * dscale);
    const rawHiltLength = Math.ceil(rangeIncl(r, prof.hilt[0], prof.hilt[1]) * dscale) +
        (twoHanded ? Math.ceil(rangeIncl(r, 3, 6) * dscale) : 0);
    // Hard cap the grip at a fixed share of the blade's total reach — a long
    // profile hilt range stacked with the two-handed bonus could otherwise eat
    // up to half the icon as handle.
    const maxHiltLength = Math.round(pen.dimension * Math.SQRT2 * 0.22);
    const hiltLength = Math.min(rawHiltLength, maxHiltLength);
    const xguardWidth = guard === "none" ? Math.ceil(dscale) : Math.ceil(rangeIncl(r, 1, 3) * dscale);
    const taperFactor = Math.max(0.05, prof.taper + r.rangeFloat(-0.03, 0.03));
    const blade = pen.drawBladeHelper({
        startDiag: pommelLength + hiltLength + xguardWidth,
        taperFactor,
        startRadius,
        style,
    });
    // Barbed blade: short thorn spikes off both sides along the blade, angled back
    // toward the hilt like a harpoon.
    if (prof.barbed) {
        const back = { x: -Math.SQRT1_2, y: Math.SQRT1_2 }; // toward hilt (down-left)
        const perpA = { x: Math.SQRT1_2, y: Math.SQRT1_2 }; // down-right
        const dirA = norm(back.x + perpA.x * 1.6, back.y + perpA.y * 1.6);
        const dirB = norm(back.x - perpA.x * 1.6, back.y - perpA.y * 1.6);
        const startO = blade.startOrtho + Math.round(4 * dscale);
        const endO = pen.dimension - Math.round(9 * dscale);
        const spacing = Math.max(4, Math.round(4.5 * dscale));
        const off = blade.startRadius * 0.75;
        const len = 2.2 * dscale;
        const half = Math.max(1.4, 1.3 * dscale); // stubby so cleanSilhouette keeps it
        for (let o = startO; o < endO; o += spacing) {
            const cx = o, cy = pen.dimension - 1 - o;
            pen.fillCone(cx, cy, dirA.x, dirA.y, off, len, half, blade.tipColor, blade.hiltColor);
            pen.fillCone(cx, cy, dirB.x, dirB.y, off, len, half, blade.tipColor, blade.hiltColor);
        }
    }
    // -- post-draw blade decorations -------------------------------------------
    // All walk the blade's own centerline (the ortho diagonal from its base).
    const decoStartO = blade.startOrtho + Math.round(3 * dscale);
    const decoEndO = pen.dimension - Math.round(7 * dscale);
    const decoSpacing = Math.max(4, Math.round(4.5 * dscale));
    if (modification === "riveted") {
        // Small round studs stamped down the centerline — a bolstered blade.
        const rivetRadius = Math.max(1, 0.9 * dscale);
        for (let o = decoStartO; o < decoEndO; o += decoSpacing) {
            pen.drawRoundOrnamentHelper({ center: new Vector(o, pen.dimension - 1 - o), radius: rivetRadius });
        }
    }
    else if (modification === "runes") {
        // Glowing script down the centerline: alternating dash / cross marks in a
        // single crystal colour (snapped to the crystal ramp, so they stay vivid).
        const rune = pickCrystal(r);
        const runeStr = colorStr(rune.light);
        const runeDim = colorStr(rune.mid);
        let alt = false;
        for (let o = decoStartO; o < decoEndO; o += Math.max(3, Math.round(3.4 * dscale))) {
            const cx = o, cy = pen.dimension - 1 - o;
            pen.ctx.fillStyle = alt ? runeStr : runeDim;
            // A tiny 2-3px glyph: a diagonal tick, alternating orientation.
            pen.drawPixel(cx, cy);
            if (alt) {
                pen.drawPixel(cx + 1, cy);
                pen.drawPixel(cx, cy - 1);
            }
            else {
                pen.drawPixel(cx - 1, cy);
                pen.drawPixel(cx, cy + 1);
            }
            alt = !alt;
        }
    }
    else if (modification === "gems") {
        // 2–3 gems set along the lower half of the blade.
        const g = pickGem(r);
        const nGems = r.float() < 0.5 ? 2 : 3;
        for (let i = 0; i < nGems; i++) {
            const o = decoStartO + i * decoSpacing;
            if (o >= decoEndO)
                break;
            pen.drawRoundOrnamentHelper({
                center: new Vector(o, pen.dimension - 1 - o),
                radius: Math.max(1, 1.0 * dscale),
                colorLight: g.light,
                colorDark: g.shadow,
            });
        }
    }
    else if (modification === "etched") {
        // A row of dark etched diamond marks — engraved ornament, not studs.
        const etchR = Math.max(1.2, 1.1 * dscale);
        for (let o = decoStartO; o < decoEndO; o += decoSpacing) {
            pen.drawDiamondOrnamentHelper({
                center: new Vector(o, pen.dimension - 1 - o),
                radius: etchR,
                colorLight: blade.hiltColor,
                colorDark: { r: blade.hiltColor.r * 0.4, g: blade.hiltColor.g * 0.4, b: blade.hiltColor.b * 0.4 },
            });
        }
    }
    // Grip — a thin hand-width handle, clearly narrower than the blade.
    const gripRadius = Math.max(2, Math.min(blade.startRadius - 1, Math.round(1.0 * dscale)));
    const hiltStartDiag = Math.floor(pommelLength * Math.SQRT2);
    pen.drawGripHelper({
        startDiag: hiltStartDiag,
        lengthDiag: Math.floor(blade.startOrtho - hiltStartDiag),
        minRadius: gripRadius,
        maxRadius: gripRadius,
        fractionalRadiusAllowed: false,
    });
    // -- guard ------------------------------------------------------------------
    // All guards are anchored at the crossguard point on the blade axis and
    // built from explicit bars/cones/discs along the perpendicular axis.
    let guardColors;
    const w = blade.startRadius;
    const g = new Vector(blade.startOrtho, bounds.h - 1 - blade.startOrtho);
    const toHilt = { x: -Math.SQRT1_2, y: Math.SQRT1_2 };
    const toTip = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
    const perp = { x: Math.SQRT1_2, y: Math.SQRT1_2 }; // across the blade
    const featureR = Math.min(gripRadius + 2, Math.max(gripRadius + 1, w * 0.5));
    if (guard !== "none") {
        const accent = pickGuardAccent(r);
        guardColors = { colorLight: accent.light, colorDark: accent.shadow };
        const light = accent.light;
        const dark = accent.shadow;
        // Bar-family sizing: always spans past the blade's edges.
        const halfLen = w * (1.5 + 0.6 * r.floatLow()) + 2 * dscale;
        const thick = Math.max(1.3, Math.min(2.2, w * 0.28));
        const barTipA = { x: g.x + perp.x * halfLen, y: g.y + perp.y * halfLen };
        const barTipB = { x: g.x - perp.x * halfLen, y: g.y - perp.y * halfLen };
        switch (guard) {
            case "bar":
                fillBar(pen, barTipA.x, barTipA.y, barTipB.x, barTipB.y, thick, light, dark, toTip);
                break;
            case "vee": {
                // Arms angled TOWARD the blade — a V cradling the blade's base.
                const dirA = norm(perp.x + toTip.x * 0.65, perp.y + toTip.y * 0.65);
                const dirB = norm(-perp.x + toTip.x * 0.65, -perp.y + toTip.y * 0.65);
                const armLen = halfLen * 1.15;
                fillBar(pen, g.x, g.y, g.x + dirA.x * armLen, g.y + dirA.y * armLen, thick, light, dark, toTip);
                fillBar(pen, g.x, g.y, g.x + dirB.x * armLen, g.y + dirB.y * armLen, thick, light, dark, toTip);
                break;
            }
            case "swept": {
                // Mirrored V: arms droop toward the pommel — a swept hilt.
                const dirA = norm(perp.x + toHilt.x * 0.65, perp.y + toHilt.y * 0.65);
                const dirB = norm(-perp.x + toHilt.x * 0.65, -perp.y + toHilt.y * 0.65);
                const armLen = halfLen * 1.15;
                fillBar(pen, g.x, g.y, g.x + dirA.x * armLen, g.y + dirA.y * armLen, thick, light, dark, toTip);
                fillBar(pen, g.x, g.y, g.x + dirB.x * armLen, g.y + dirB.y * armLen, thick, light, dark, toTip);
                // A small ball where the arms meet, so the join reads deliberate.
                pen.drawRoundOrnamentHelper({ center: g, radius: thick * 1.1, colorLight: light, colorDark: dark });
                break;
            }
            case "winged": {
                // A straight bar with upturned tip flicks — winged crossguard.
                fillBar(pen, barTipA.x, barTipA.y, barTipB.x, barTipB.y, thick, light, dark, toTip);
                const flick = halfLen * 0.55;
                for (const tip of [barTipA, barTipB]) {
                    pen.fillCone(tip.x, tip.y, toTip.x, toTip.y, 0, flick, thick * 1.15, light, dark);
                }
                break;
            }
            case "balled": {
                // A bar with a distinct bead at each tip.
                fillBar(pen, barTipA.x, barTipA.y, barTipB.x, barTipB.y, thick * 0.85, light, dark, toTip);
                for (const tip of [barTipA, barTipB]) {
                    pen.drawRoundOrnamentHelper({ center: new Vector(tip.x, tip.y), radius: featureR * 0.85, colorLight: light, colorDark: dark });
                }
                break;
            }
            case "spiked": {
                // A bar whose tips continue into sharp outward spikes.
                fillBar(pen, barTipA.x, barTipA.y, barTipB.x, barTipB.y, thick, light, dark, toTip);
                const spikeLen = halfLen * 0.7;
                pen.fillCone(barTipA.x, barTipA.y, perp.x, perp.y, 0, spikeLen, thick * 1.3, light, dark);
                pen.fillCone(barTipB.x, barTipB.y, -perp.x, -perp.y, 0, spikeLen, thick * 1.3, light, dark);
                break;
            }
            case "oval": {
                // A chunky rounded slab across the blade — a tsuba-style plate,
                // clearly thicker than a bar and wider than the blade.
                fillBar(pen, barTipA.x, barTipA.y, barTipB.x, barTipB.y, Math.max(2.2, w * 0.42), light, dark, toTip);
                break;
            }
            case "ring": {
                // An open ring just below the blade base — the hole is the feature.
                const ringR = featureR * 1.35;
                const c = new Vector(g.x + toHilt.x * ringR * 0.2, g.y + toHilt.y * ringR * 0.2);
                pen.drawRoundOrnamentHelper({ center: c, radius: ringR, holeRadius: ringR * 0.5, colorLight: light, colorDark: dark });
                break;
            }
            case "cup": {
                // A dome sheltering the grip top: a half-annulus opening toward the
                // pommel, plus a thin bar across the mouth.
                const ro = featureR * 1.7;
                const ri = ro * 0.5;
                for (let x = Math.floor(g.x - ro); x <= Math.ceil(g.x + ro); x++) {
                    for (let y = Math.floor(g.y - ro); y <= Math.ceil(g.y + ro); y++) {
                        if (x < 0 || y < 0 || x >= pen.dimension || y >= pen.dimension)
                            continue;
                        const d = Math.hypot(x - g.x, y - g.y);
                        if (d > ro || d < ri)
                            continue;
                        const along = (x - g.x) * toTip.x + (y - g.y) * toTip.y;
                        if (along < -ro * 0.15)
                            continue; // keep only the blade-side dome
                        const side = ((x - g.x) * perp.x + (y - g.y) * perp.y) / ro;
                        pen.ctx.fillStyle = colorStr(colorLerp(dark, light, 0.65 - side * 0.35));
                        pen.drawPixel(x, y);
                    }
                }
                fillBar(pen, g.x + perp.x * ro * 0.9, g.y + perp.y * ro * 0.9, g.x - perp.x * ro * 0.9, g.y - perp.y * ro * 0.9, thick * 0.8, light, dark, toTip);
                break;
            }
            case "shell": {
                // A scallop fan of short blades spread toward the blade side.
                const nRib = 5;
                const ribLen = featureR * 2.4;
                for (let i = 0; i < nRib; i++) {
                    const a = (i / (nRib - 1) - 0.5) * (Math.PI * 0.85);
                    const d = rotate(toTip, a);
                    pen.fillCone(g.x, g.y, d.x, d.y, featureR * 0.2, ribLen, thick * 0.95, light, dark);
                }
                break;
            }
            case "plate": {
                // A rhombus plate — a diamond escutcheon at the blade's base.
                pen.drawDiamondOrnamentHelper({ center: g, radius: featureR * 1.9, colorLight: light, colorDark: dark });
                break;
            }
            case "knucklebow": {
                // A short bar plus a smooth arc from one tip down to the pommel — a
                // real knuckle-bow, drawn as a quadratic curve, not a bead run.
                fillBar(pen, barTipA.x, barTipA.y, barTipB.x, barTipB.y, thick, light, dark, toTip);
                const pommelPt = { x: Math.max(2, gripRadius), y: pen.dimension - 1 - Math.max(2, gripRadius) - 1 };
                // Control point pushed outward so the bow bellies away from the grip.
                const midX = (barTipA.x + pommelPt.x) / 2 + perp.x * halfLen * 0.9;
                const midY = (barTipA.y + pommelPt.y) / 2 + perp.y * halfLen * 0.9;
                const steps = 22;
                const bowHalf = Math.max(1.1, thick * 0.8);
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const it = 1 - t;
                    const bx = it * it * barTipA.x + 2 * it * t * midX + t * t * pommelPt.x;
                    const by = it * it * barTipA.y + 2 * it * t * midY + t * t * pommelPt.y;
                    for (let ox = -bowHalf; ox <= bowHalf; ox += 0.5) {
                        for (let oy = -bowHalf; oy <= bowHalf; oy += 0.5) {
                            if (Math.hypot(ox, oy) > bowHalf)
                                continue;
                            const x = Math.round(bx + ox);
                            const y = Math.round(by + oy);
                            if (x < 0 || y < 0 || x >= pen.dimension || y >= pen.dimension)
                                continue;
                            pen.ctx.fillStyle = colorStr(colorLerp(dark, light, 0.5 - ox * 0.25));
                            pen.drawPixel(x, y);
                        }
                    }
                }
                break;
            }
        }
    }
    // -- pommel -----------------------------------------------------------------
    // Historical hilt-cap shapes. The accent metal is its own independent roll
    // half the time (a gold pommel on a steel guard), otherwise matches the
    // guard's fitting for a coordinated hilt.
    if (pommel !== "none") {
        const pommelRadius = Math.max(1, gripRadius * 0.55);
        const wideRadius = Math.min(gripRadius + 1.2, pommelRadius * 2.2);
        const midRadius = (pommelRadius + wideRadius) / 2;
        const center = new Vector(Math.floor(pommelRadius + 1), Math.ceil(bounds.h - pommelRadius - 2));
        const wideCenter = new Vector(Math.floor(wideRadius + 1), Math.ceil(bounds.h - wideRadius - 2));
        const midCenter = new Vector(Math.floor(midRadius + 1), Math.ceil(bounds.h - midRadius - 2));
        const back = { x: -Math.SQRT1_2, y: Math.SQRT1_2 };
        if (pommel === "gem" || pommel === "faceted") {
            const gm = pickGem(r);
            if (pommel === "gem") {
                pen.drawRoundOrnamentHelper({ center, radius: pommelRadius, colorLight: gm.light, colorDark: gm.shadow });
            }
            else {
                drawFacetedGem(pen, center, pommelRadius * 1.3, gm.light, gm.shadow);
            }
        }
        else if (pommel === "round") {
            const p = { center, radius: pommelRadius };
            if (guardColors && r.float() < 0.6) {
                p.colorLight = guardColors.colorLight;
                p.colorDark = guardColors.colorDark;
            }
            pen.drawRoundOrnamentHelper(p);
        }
        else {
            // Independent accent roll half the time — pommels aren't always the
            // same metal as the guard.
            const useGuardMetal = guardColors && r.float() < 0.5;
            const metal = useGuardMetal ? guardColors : (() => { const a = pickGuardAccent(r); return { colorLight: a.light, colorDark: a.shadow }; })();
            const { colorLight: light, colorDark: dark } = metal;
            switch (pommel) {
                case "wheel":
                    pen.drawRoundOrnamentHelper({ center: wideCenter, radius: wideRadius, radiusY: wideRadius * 0.6, colorLight: light, colorDark: dark });
                    break;
                case "ring":
                    pen.drawRoundOrnamentHelper({ center: wideCenter, radius: wideRadius, holeRadius: wideRadius * 0.5, colorLight: light, colorDark: dark });
                    break;
                case "trefoil": {
                    const lobeR = midRadius * 0.78;
                    for (const a of [0, (Math.PI * 2) / 3, -(Math.PI * 2) / 3]) {
                        const o = rotate(back, a);
                        pen.drawRoundOrnamentHelper({
                            center: new Vector(midCenter.x + o.x * lobeR * 1.35, midCenter.y + o.y * lobeR * 1.35),
                            radius: lobeR,
                            colorLight: light,
                            colorDark: dark,
                        });
                    }
                    break;
                }
                case "acorn": {
                    pen.drawRoundOrnamentHelper({ center: midCenter, radius: midRadius, colorLight: light, colorDark: dark });
                    const cap = pickGuardAccent(r);
                    const capOffset = midRadius * 0.9;
                    pen.drawRoundOrnamentHelper({
                        center: new Vector(midCenter.x - back.x * capOffset, midCenter.y - back.y * capOffset),
                        radius: Math.max(1, midRadius * 0.7),
                        colorLight: cap.light,
                        colorDark: cap.shadow,
                    });
                    break;
                }
                case "scentstopper":
                    pen.drawRoundOrnamentHelper({ center, radius: pommelRadius * 0.75, radiusY: pommelRadius * 1.9, colorLight: light, colorDark: dark });
                    break;
                case "spike":
                    pen.fillCone(center.x, center.y, back.x, back.y, 0, pommelRadius * 2.4, pommelRadius * 0.9, light, dark);
                    break;
                case "flanged":
                    pen.drawRoundOrnamentHelper({ center: wideCenter, radius: wideRadius * 0.7, colorLight: light, colorDark: dark });
                    for (let i = 0; i < 4; i++) {
                        const d = rotate(back, (i / 4) * Math.PI * 2);
                        pen.fillCone(wideCenter.x, wideCenter.y, d.x, d.y, wideRadius * 0.4, wideRadius * 0.85, wideRadius * 0.32, light, dark);
                    }
                    break;
                case "crown":
                    pen.drawRoundOrnamentHelper({ center: midCenter, radius: midRadius * 0.8, colorLight: light, colorDark: dark });
                    for (const a of [-0.6, 0, 0.6]) {
                        const d = rotate(back, a);
                        pen.fillCone(midCenter.x, midCenter.y, d.x, d.y, midRadius * 0.3, midRadius * 1.5, midRadius * 0.45, light, dark);
                    }
                    break;
                case "birdhead": {
                    pen.drawRoundOrnamentHelper({ center: midCenter, radius: midRadius * 0.85, colorLight: light, colorDark: dark });
                    const hook = rotate(back, 1.15);
                    pen.fillCone(midCenter.x, midCenter.y, hook.x, hook.y, midRadius * 0.5, midRadius * 1.8, midRadius * 0.6, light, dark);
                    break;
                }
                case "crescent": {
                    // A moon-crescent cap: a disc with an offset disc cut away, horns
                    // pointing back past the grip end.
                    const rad = midRadius * 1.15;
                    const cutOff = rad * 0.5;
                    const lit = colorStr(light);
                    const dk = colorStr(dark);
                    for (let x = Math.floor(midCenter.x - rad); x <= Math.ceil(midCenter.x + rad); x++) {
                        for (let y = Math.floor(midCenter.y - rad); y <= Math.ceil(midCenter.y + rad); y++) {
                            if (x < 0 || y < 0 || x >= pen.dimension || y >= pen.dimension)
                                continue;
                            if (Math.hypot(x - midCenter.x, y - midCenter.y) > rad)
                                continue;
                            // Cut away a disc shifted toward the blade → horns point back.
                            if (Math.hypot(x - (midCenter.x - back.x * cutOff), y - (midCenter.y - back.y * cutOff)) < rad * 0.78)
                                continue;
                            pen.ctx.fillStyle = (x - midCenter.x) * toTip.x + (y - midCenter.y) * toTip.y > 0 ? lit : dk;
                            pen.drawPixel(x, y);
                        }
                    }
                    break;
                }
            }
        }
    }
    pen.weather(r.floatLow()); // most blades lightly worn, a few battered
    pen.addBorder();
}
