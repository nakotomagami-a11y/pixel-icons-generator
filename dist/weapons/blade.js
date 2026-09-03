import { Vector, Bounds, diagToPosition } from "../math";
import { pickGem, pickCrystal } from "../palette";
const PROFILES = {
    knight: { radius: [3, 4], taper: 0.16, hilt: [6, 9], makeStyle: () => ({ widthAmp: 0 }) },
    broad: { radius: [4, 5], taper: 0.2, hilt: [6, 9], wide: true, makeStyle: () => ({ widthAmp: 0, fuller: true }) },
    cleaver: { radius: [5, 6], taper: 0.26, hilt: [5, 8], wide: true, makeStyle: () => ({ widthAmp: 0, singleEdge: true }) },
    // A rapier reads as a rapier from two things: a genuinely needle-thin blade
    // that tapers along nearly its whole length (not a flat blade with a tiny
    // pointed tip), and the ornate hand-guard — so its guard pick is restricted
    // to guards that read as that (swept hilt, or a cup/disc guard), never a
    // plain crossguard or none.
    rapier: { radius: [1, 1], taper: 0.68, hilt: [7, 11], guardPool: ["swept", "swept", "disc"], makeStyle: () => ({ widthAmp: 0 }) },
    flamberge: { radius: [3, 3], taper: 0.18, hilt: [6, 9], makeStyle: () => ({ wave: 0.22, waveLen: 8, widthAmp: 0 }) },
    leaf: { radius: [2, 3], taper: 0.34, hilt: [6, 9], makeStyle: () => ({ widthAmp: 0, bulge: 0.55 }) },
    bowie: { radius: [3, 4], taper: 0.14, hilt: [6, 8], makeStyle: () => ({ widthAmp: 0, clip: 0.3, singleEdge: true }) },
    katana: { radius: [3, 3], taper: 0.2, hilt: [8, 11], makeStyle: () => ({ curve: Math.PI / 165, curveDir: 1, widthAmp: 0, singleEdge: true, clip: 0.14 }) },
    greatsword: { radius: [4, 5], taper: 0.16, hilt: [9, 13], wide: true, makeStyle: () => ({ widthAmp: 0, fuller: true }) },
    estoc: { radius: [2, 2], taper: 0.14, hilt: [8, 12], makeStyle: () => ({ widthAmp: 0, fuller: true }) },
    sawblade: { radius: [3, 4], taper: 0.2, hilt: [6, 9], makeStyle: () => ({ widthAmp: 0, singleEdge: true, serrate: 1.4 }) },
    dagger: { radius: [3, 3], taper: 0.3, hilt: [5, 7], makeStyle: () => ({ widthAmp: 0, clip: 0.22, singleEdge: true }) },
    scimitar: { radius: [3, 4], taper: 0.28, hilt: [6, 9], makeStyle: () => ({ curve: Math.PI / 95, curveDir: 1, widthAmp: 0, singleEdge: true, maxTurn: Math.PI / 3.2 }) },
    bigsaw: { radius: [3, 4], taper: 0.22, hilt: [6, 9], makeStyle: () => ({ widthAmp: 0, singleEdge: true, serrate: 2.4, serratePeriod: 5 }) },
    spinesaw: { radius: [3, 4], taper: 0.18, hilt: [6, 9], makeStyle: () => ({ widthAmp: 0, singleEdge: true, serrate: 1.8, serrateSide: "spine", serratePeriod: 4 }) },
    barbed: { radius: [2, 3], taper: 0.2, hilt: [6, 9], barbed: true, makeStyle: () => ({ widthAmp: 0 }) },
};
const PROFILE_KEYS = Object.keys(PROFILES);
const GUARDS = ["bar", "bar", "swept", "wings", "disc", "none"];
const POMMELS = ["round", "gem", "none", "none", "none"];
const pick = (r, arr) => arr[Math.floor(r.float() * arr.length) % arr.length];
const rangeIncl = (r, lo, hi) => r.range(lo, hi + 1);
const norm = (x, y) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };
export function drawBlade(pen, parts) {
    pen.rng.checkpoint();
    const r = pen.rng;
    const bounds = new Bounds(0, 0, pen.dimension, pen.dimension);
    const dscale = bounds.h / 32;
    pen.clearCanvas();
    const prof = PROFILES[parts?.profile ?? pick(r, PROFILE_KEYS)];
    const style = prof.makeStyle?.(r) ?? {};
    // ~12% of blades are an enchanted crystal (colour variety).
    if (r.float() < 0.12)
        style.metal = pickCrystal(r);
    let guard = parts?.guard ?? pick(r, prof.guardPool ?? GUARDS);
    // A broad blade's base overlaps the grip; without a crossguard it reads as a
    // slab sitting straight on the pommel. Force a real guard for wide profiles
    // — even over an explicit "none"/"disc" pick, since that's a rendering
    // artifact (slab-on-pommel), not a style choice worth honouring.
    if (prof.wide && (guard === "none" || guard === "disc"))
        guard = "bar";
    const pommel = parts?.pommel ?? pick(r, POMMELS);
    const twoHanded = parts?.twoHanded ?? r.float() < 0.22;
    const startRadius = Math.ceil(rangeIncl(r, prof.radius[0], prof.radius[1]) * dscale);
    const pommelLength = pommel === "none" ? 0 : Math.ceil((0.5 + r.floatLow() * 0.9) * dscale);
    const hiltLength = Math.ceil(rangeIncl(r, prof.hilt[0], prof.hilt[1]) * dscale) +
        (twoHanded ? Math.ceil(rangeIncl(r, 3, 6) * dscale) : 0);
    const xguardWidth = guard === "none" ? Math.ceil(dscale) : Math.ceil(rangeIncl(r, 1, 3) * dscale);
    const taperFactor = Math.max(0.05, prof.taper + r.rangeFloat(-0.03, 0.03));
    const blade = pen.drawBladeHelper({
        startDiag: pommelLength + hiltLength + xguardWidth,
        taperFactor,
        startRadius,
        style,
    });
    // Barbed blade: short thorn spikes off both sides along the blade, angled back
    // toward the hilt like a harpoon. Drawn in the blade's own metal so they read
    // as part of the steel.
    if (prof.barbed) {
        // Back-and-out directions (mix of −forward and ±normal): a swept-back barb.
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
    // Grip — a thin hand-width handle, clearly narrower than the blade. Capped low
    // (and below the blade's half-width) so it never reads as ~half the blade's
    // width. ~2px at the in-app/preview render sizes.
    const gripRadius = Math.max(2, Math.min(blade.startRadius - 1, Math.round(1.0 * dscale)));
    const hiltStartDiag = Math.floor(pommelLength * Math.SQRT2);
    pen.drawGripHelper({
        startDiag: hiltStartDiag,
        lengthDiag: Math.floor(blade.startOrtho - hiltStartDiag),
        minRadius: gripRadius,
        maxRadius: gripRadius,
        fractionalRadiusAllowed: false,
    });
    // Guard — sized off the blade's base half-width so it ALWAYS overhangs the
    // blade edges (a guard narrower than its blade reads as broken) and gets
    // chunkier for wider blades. `w` is the blade half-width at the base; a
    // crossguard should span past it, not sit flush.
    let guardColors;
    const w = blade.startRadius;
    if (guard === "bar" || guard === "swept" || guard === "wings") {
        // A crossguard is a THIN bar — thickness barely scales with blade width, or
        // thick + curved arms clump into a blob that reads as a ball at the base.
        const guardThick = Math.min(1.8, Math.max(1.2, w * 0.24));
        const cfg = {
            positionDiag: blade.startOrtho,
            halfLength: w * (1.4 + 0.7 * r.floatLow()) + 2, // ≥1.4× blade half-width
            thickness: guardThick,
        };
        if (guard === "swept") {
            // Gently curved-back quillons (not a tight curl).
            cfg.omegaChance = 0.35;
            cfg.omegaAmount = Math.PI / 9;
            cfg.halfLength = w * (1.6 + 0.8 * r.floatLow()) + 2;
        }
        else if (guard === "wings") {
            // A WIDE, mostly-straight crossguard — heavy curl spiralled into a blob.
            cfg.halfLength = w * (2.0 + 0.8 * r.floatLow()) + 2;
            cfg.omegaChance = 0.12;
            cfg.thickness = Math.min(2.0, guardThick + 0.3);
        }
        guardColors = pen.drawCrossguardHelper(cfg);
    }
    else if (guard === "disc") {
        // A small round disc/cup guard — a knob just past the grip, absolutely
        // capped so wide blades don't sprout a giant sphere at the base.
        const gp = diagToPosition(blade.startOrtho, bounds);
        pen.drawRoundOrnamentHelper({ center: new Vector(gp.x, gp.y), radius: Math.min(gripRadius + 2, Math.max(gripRadius + 1, w * 0.5)) });
    }
    // Pommel
    if (pommel !== "none") {
        // A pommel is a small knob flush with the grip's end — never a ball wider
        // than the handle. Sized just under the (thin) grip radius.
        const pommelRadius = Math.max(1, gripRadius * 0.55);
        const p = {
            center: new Vector(Math.floor(pommelRadius + 1), Math.ceil(bounds.h - pommelRadius - 2)),
            radius: pommelRadius,
        };
        if (pommel === "gem") {
            const g = pickGem(r);
            p.colorLight = g.light;
            p.colorDark = g.shadow;
        }
        else if (guardColors) {
            p.colorLight = guardColors.colorLight;
            p.colorDark = guardColors.colorDark;
        }
        pen.drawRoundOrnamentHelper(p);
    }
    pen.weather(r.floatLow()); // most blades lightly worn, a few battered
    pen.addBorder();
}
