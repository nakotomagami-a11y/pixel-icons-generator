import { Vector, Bounds, diagToPosition } from "../math";
import { colorDarken, colorLerp, colorLighten, colorStr } from "../color";
import { WOOD, DARK, BONE, BLUED, GOLD, STEEL, pickGem, RIBBONS } from "../palette";
/**
 * Mix-and-match staff, layer by layer, rebuilt from the ground up: a SHAFT
 * (straight / twisted / wrapped / segmented / gnarled / bone / metal /
 * lacquer) along the bottom-left→top-right diagonal, a magical HEAD topping
 * it (orb, crystal shard, cluster, crescent moon, halo, claws, wings, ankh
 * loop, shepherd's crook, twin horns, star, living branch), and a BINDING
 * bound onto the shaft (collars, cord wraps, leaves, ribbons, a hanging
 * charm…). Every layer is an independent pick so the dropdowns compose.
 */
const pick = (r, arr) => arr[Math.floor(r.float() * arr.length) % arr.length];
const HEADS = [
    "orb", "orb", "crystal", "cluster", "crescent", "halo", "claws", "claws",
    "wings", "loop", "crook", "twinhorns", "star", "branch",
];
const SHAFTS = ["straight", "straight", "twisted", "wrapped", "segmented", "gnarled", "bone", "metal", "lacquer"];
const BINDINGS = ["none", "none", "none", "collar", "collar", "doublecollar", "wrap", "leaves", "ribbons", "charm", "rings"];
/** Legacy head names from the pre-rework generator. */
const LEGACY_HEADS = { bare: "orb", collar: "orb" };
/** Heads that centre on a gem (get glow + sparkles). */
const GEM_HEADS = new Set(["orb", "crystal", "cluster", "crescent", "halo", "claws", "wings", "star"]);
export function drawStaff(pen, parts) {
    pen.rng.checkpoint();
    const r = pen.rng;
    const bounds = new Bounds(0, 0, pen.dimension, pen.dimension);
    const dscale = bounds.h / 32;
    pen.clearCanvas();
    const requestedHead = parts?.head;
    const head = requestedHead && HEADS.includes(requestedHead)
        ? requestedHead
        : requestedHead && requestedHead in LEGACY_HEADS
            ? LEGACY_HEADS[requestedHead]
            : pick(r, HEADS);
    const shaft = parts?.shaft && SHAFTS.includes(parts.shaft) ? parts.shaft : pick(r, SHAFTS);
    const binding = parts?.binding && BINDINGS.includes(parts.binding) ? parts.binding : pick(r, BINDINGS);
    const isWand = r.float() < 0.25;
    const gemRadius = (isWand ? r.rangeFloat(2.4, 3.4) : r.rangeFloat(3.6, 5.2)) * dscale;
    const haftMaxRadius = (isWand ? r.rangeFloat(0.9, 1.4) : r.rangeFloat(1.4, 2.2)) * dscale;
    const gemOrtho = bounds.h - 1 - Math.ceil(gemRadius * 1.25) - 1;
    const gemCenter = new Vector(gemOrtho, bounds.h - 1 - gemOrtho);
    const u = new Vector(1, -1).normalize(); // toward the head
    const n = new Vector(-1, -1).normalize(); // outward (top-left)
    // -- shaft -------------------------------------------------------------------
    // Material follows the shaft pick where it implies one; otherwise rolled.
    let haftColor;
    let isWood = false;
    if (shaft === "bone")
        haftColor = BONE.mid;
    else if (shaft === "metal")
        haftColor = r.float() < 0.5 ? BLUED.mid : STEEL.mid;
    else if (shaft === "lacquer")
        haftColor = DARK.mid;
    else {
        const mat = r.float();
        haftColor = mat < 0.55 ? WOOD.mid : mat < 0.75 ? DARK.mid : mat < 0.9 ? BONE.mid : BLUED.shadow;
        isWood = mat < 0.55;
    }
    if (shaft === "gnarled" || shaft === "twisted") {
        haftColor = WOOD.mid;
        isWood = true;
    }
    const haftTopDiag = (gemOrtho - gemRadius * 0.4) * Math.SQRT2;
    pen.drawHaftHelper({ startDiag: 0, lengthDiag: haftTopDiag, maxRadius: haftMaxRadius, fractionalRadiusAllowed: true, color: haftColor });
    const metalRamp = r.float() < 0.55 ? GOLD : STEEL;
    const metal = metalRamp.light;
    const metalDark = metalRamp.shadow;
    // Shaft working overlays.
    if (shaft === "twisted") {
        twistShaft(pen, bounds, haftTopDiag, haftMaxRadius, dscale, haftColor);
    }
    else if (shaft === "wrapped") {
        pen.drawGripHelper({ startDiag: haftTopDiag * r.rangeFloat(0.2, 0.4), lengthDiag: haftTopDiag * r.rangeFloat(0.18, 0.3), minRadius: haftMaxRadius, maxRadius: haftMaxRadius + 0.7 * dscale, fractionalRadiusAllowed: true });
    }
    else if (shaft === "segmented") {
        // Bound grip framed by a metal ferrule at each end.
        const gripStart = haftTopDiag * r.rangeFloat(0.26, 0.4);
        const gripLen = haftTopDiag * r.rangeFloat(0.2, 0.32);
        pen.drawGripHelper({ startDiag: gripStart, lengthDiag: gripLen, minRadius: haftMaxRadius, maxRadius: haftMaxRadius + 0.6 * dscale, fractionalRadiusAllowed: true });
        drawShaftRing(pen, bounds, gripStart, haftMaxRadius + 0.6 * dscale, dscale, metal, metalDark);
        drawShaftRing(pen, bounds, gripStart + gripLen, haftMaxRadius + 0.6 * dscale, dscale, metal, metalDark);
    }
    else if (shaft === "gnarled") {
        gnarlShaft(pen, bounds, haftTopDiag, haftMaxRadius, dscale, r);
    }
    else if (shaft === "bone") {
        // Vertebral joints: paired darker rings spaced down the shaft.
        const nJoint = 3;
        for (let i = 0; i < nJoint; i++) {
            const d = haftTopDiag * (0.25 + 0.22 * i);
            drawShaftRing(pen, bounds, d, haftMaxRadius + 0.2 * dscale, dscale, BONE.light, BONE.shadow);
            drawShaftRing(pen, bounds, d + 1.6 * dscale, haftMaxRadius + 0.1 * dscale, dscale, BONE.mid, BONE.shadow);
        }
    }
    else if (shaft === "metal") {
        // A bright specular line down the lit side of the shaft.
        const litStr = colorStr(STEEL.spec);
        for (let l = 3 * dscale; l < haftTopDiag / Math.SQRT2 - 2; l += 1) {
            const x = Math.round(l + n.x * haftMaxRadius * 0.4);
            const y = Math.round(bounds.h - 1 - l + n.y * haftMaxRadius * 0.4);
            if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                continue;
            if (pen.ctx.getImageData(x, y, 1, 1).data[3] === 0)
                continue;
            pen.ctx.fillStyle = litStr;
            pen.drawPixel(x, y);
        }
    }
    else if (shaft === "lacquer") {
        // Glossy black: a thin highlight stripe + gold ferrule near each end.
        const litStr = colorStr(colorLighten(DARK.light, 0.3));
        for (let l = 4 * dscale; l < haftTopDiag / Math.SQRT2 - 3; l += 1) {
            if (Math.floor(l / (3 * dscale)) % 2 === 0)
                continue; // broken gloss
            const x = Math.round(l + n.x * haftMaxRadius * 0.3);
            const y = Math.round(bounds.h - 1 - l + n.y * haftMaxRadius * 0.3);
            if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                continue;
            if (pen.ctx.getImageData(x, y, 1, 1).data[3] === 0)
                continue;
            pen.ctx.fillStyle = litStr;
            pen.drawPixel(x, y);
        }
        drawShaftRing(pen, bounds, haftTopDiag * 0.16, haftMaxRadius, dscale, GOLD.light, GOLD.shadow);
        drawShaftRing(pen, bounds, haftTopDiag * 0.8, haftMaxRadius, dscale, GOLD.light, GOLD.shadow);
    }
    // -- binding -----------------------------------------------------------------
    if (binding === "collar") {
        drawShaftRing(pen, bounds, haftTopDiag * r.rangeFloat(0.55, 0.72), haftMaxRadius, dscale, metal, metalDark);
    }
    else if (binding === "doublecollar") {
        const d0 = haftTopDiag * r.rangeFloat(0.5, 0.62);
        drawShaftRing(pen, bounds, d0, haftMaxRadius, dscale, metal, metalDark);
        drawShaftRing(pen, bounds, d0 + 2.4 * dscale, haftMaxRadius, dscale, metal, metalDark);
    }
    else if (binding === "wrap") {
        pen.drawGripHelper({ startDiag: haftTopDiag * r.rangeFloat(0.3, 0.45), lengthDiag: haftTopDiag * r.rangeFloat(0.12, 0.2), minRadius: haftMaxRadius, maxRadius: haftMaxRadius + 0.5 * dscale, fractionalRadiusAllowed: true });
    }
    else if (binding === "leaves") {
        const leafBase = diagToPosition((gemOrtho - gemRadius * 1.3) * Math.SQRT2, bounds);
        const green = { shadow: { r: 0x2f, g: 0x5a, b: 0x2e }, light: { r: 0x6f, g: 0xb0, b: 0x4a } };
        for (const side of [-1, 1]) {
            const a = -Math.PI / 4 + side * 1.3;
            pen.fillCone(leafBase.x, leafBase.y, Math.cos(a), Math.sin(a), 0, r.rangeFloat(3, 5) * dscale, Math.max(1.2, 1.3 * dscale), green.light, green.shadow);
        }
    }
    else if (binding === "ribbons") {
        const cloth = pick(r, RIBBONS);
        const rootDiag = (gemOrtho - gemRadius * 0.9) * Math.SQRT2;
        const rp = diagToPosition(rootDiag, bounds);
        for (const side of [0.5, -0.6]) {
            const dir = { x: -u.x + n.x * side, y: -u.y + n.y * side };
            const m = Math.hypot(dir.x, dir.y);
            pen.drawRibbon(rp.x, rp.y, dir.x / m, dir.y / m, r.rangeFloat(5, 7) * dscale, Math.max(1.4, 1.4 * dscale), cloth, { wave: 1.6 * dscale, waveLen: 6 * dscale, taper: true, twist: true });
        }
    }
    else if (binding === "charm") {
        // A small gem dangling on a short cord below the head.
        const g = pickGem(r);
        const rootDiag = (gemOrtho - gemRadius * 0.8) * Math.SQRT2;
        const rp = diagToPosition(rootDiag, bounds);
        const cordStr = colorStr(DARK.mid);
        const drop = 3.2 * dscale;
        for (let l = 0; l <= drop; l += 0.5) {
            pen.ctx.fillStyle = cordStr;
            pen.drawPixel(Math.round(rp.x + n.x * 0.4 * l - u.x * 0.9 * l), Math.round(rp.y + n.y * 0.4 * l - u.y * 0.9 * l));
        }
        pen.drawRoundOrnamentHelper({
            center: new Vector(rp.x + n.x * 0.4 * drop - u.x * 0.9 * drop, rp.y + n.y * 0.4 * drop - u.y * 0.9 * drop),
            radius: Math.max(1, 1 * dscale),
            colorLight: g.light,
            colorDark: g.shadow,
        });
    }
    else if (binding === "rings") {
        for (let i = 0; i < 3; i++) {
            drawShaftRing(pen, bounds, haftTopDiag * (0.3 + 0.18 * i), haftMaxRadius, dscale, metal, metalDark);
        }
    }
    // Base finial.
    if (r.float() < 0.7) {
        const baseR = haftMaxRadius + 0.4 * dscale;
        pen.drawRoundOrnamentHelper({ center: new Vector(Math.floor(baseR) + 1, Math.ceil(bounds.h - baseR - 2)), radius: baseR, colorLight: metal, colorDark: metalDark });
    }
    // -- head --------------------------------------------------------------------
    const gemR = pickGem(r);
    const gemLight = gemR.mid, gemDark = gemR.shadow, gemCore = gemR.light, spec = gemR.spec;
    // Settings drawn BEHIND the gem first.
    if (head === "halo") {
        drawRingShape(pen, bounds, gemCenter.x, gemCenter.y, gemRadius * 1.5, Math.max(0.9, 0.7 * dscale), metal, metalDark);
    }
    else if (head === "crescent") {
        // A metal moon cradling the gem from behind: a thick arc opening toward
        // the shaft, horns reaching past the gem.
        drawArc(pen, bounds, gemCenter.x, gemCenter.y, gemRadius * 1.6, gemRadius * 0.6, (-Math.PI * 3) / 4 - 1.25, (-Math.PI * 3) / 4 + 1.25, metal, metalDark);
    }
    else if (head === "wings") {
        for (const side of [-1, 1]) {
            const a = -Math.PI / 4 + side * (Math.PI / 2.1);
            pen.fillCone(gemCenter.x, gemCenter.y, Math.cos(a), Math.sin(a), gemRadius * 0.5, gemRadius * 1.5, Math.max(1.4, gemRadius * 0.5), metal, metalDark);
        }
    }
    else if (head === "twinhorns") {
        // Two horns sweeping up-out from the shaft top, cradling a small gem.
        const base = diagToPosition((gemOrtho - gemRadius * 0.5) * Math.SQRT2, bounds);
        for (const side of [-1, 1]) {
            const a1 = -Math.PI / 4 + side * 1.05; // out
            const e1x = base.x + Math.cos(a1) * gemRadius * 1.05;
            const e1y = base.y + Math.sin(a1) * gemRadius * 1.05;
            pen.fillCone(base.x, base.y, Math.cos(a1), Math.sin(a1), 0, gemRadius * 1.1, Math.max(1.3, gemRadius * 0.34), metal, metalDark);
            const a2 = -Math.PI / 4 + side * 0.35; // then curl up toward the tip
            pen.fillCone(e1x, e1y, Math.cos(a2), Math.sin(a2), 0, gemRadius * 1.25, Math.max(1.1, gemRadius * 0.3), metal, metalDark);
        }
    }
    // The gem / centrepiece.
    if (head === "loop") {
        drawRingShape(pen, bounds, gemCenter.x, gemCenter.y, gemRadius * 1.05, Math.max(1, 0.9 * dscale), metal, metalDark);
        if (r.float() < 0.6)
            drawOrb(pen, gemCenter.x, gemCenter.y, gemRadius * 0.42, gemDark, gemLight, gemCore, spec);
    }
    else if (head === "cluster") {
        drawFacet(pen, gemCenter.x, gemCenter.y, gemRadius, gemDark, gemLight, gemCore, spec);
        for (const side of [-1, 1]) {
            const a = -Math.PI / 4 + side * 0.9;
            const sc = new Vector(gemCenter.x + Math.cos(a) * gemRadius * 1.1, gemCenter.y + Math.sin(a) * gemRadius * 1.1);
            drawFacet(pen, sc.x, sc.y, gemRadius * 0.6, gemDark, gemLight, gemCore, spec);
        }
    }
    else if (head === "crystal") {
        // One big shard, elongated along the shaft axis: a facet stretched by
        // drawing it twice with a slight offset toward the tip.
        drawFacet(pen, gemCenter.x - u.x * gemRadius * 0.3, gemCenter.y - u.y * gemRadius * 0.3, gemRadius * 0.85, gemDark, gemLight, gemCore, spec);
        drawFacet(pen, gemCenter.x + u.x * gemRadius * 0.45, gemCenter.y + u.y * gemRadius * 0.45, gemRadius * 0.8, gemDark, gemLight, gemCore, spec);
    }
    else if (head === "crook") {
        // A shepherd's crook: the shaft continues into a curling spiral. No gem.
        const start = diagToPosition(haftTopDiag, bounds);
        const half = Math.max(1, haftMaxRadius * 0.8);
        const turns = r.rangeFloat(3.6, 4.6);
        const rad0 = gemRadius * 1.15;
        const steps = 26;
        const litStr = haftColor;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const ang = -Math.PI * 0.75 + t * turns; // start pointing up-right, curl over
            const rad = rad0 * (1 - 0.55 * t);
            const cx = start.x + u.x * rad0 * 0.4 + Math.cos(ang) * rad * 0.0 + Math.sin(ang) * 0; // placeholder, replaced below
            void cx;
            // Spiral centre sits above the shaft top.
            const scx = start.x + u.x * rad0 * 0.9;
            const scy = start.y + u.y * rad0 * 0.9;
            const px = scx + Math.cos(ang) * rad;
            const py = scy + Math.sin(ang) * rad;
            for (let ox = -half; ox <= half; ox += 0.5) {
                for (let oy = -half; oy <= half; oy += 0.5) {
                    if (Math.hypot(ox, oy) > half)
                        continue;
                    const x = Math.round(px + ox);
                    const y = Math.round(py + oy);
                    if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                        continue;
                    pen.ctx.fillStyle = colorStr(oy < 0 ? colorLighten(litStr, 0.2) : colorDarken(litStr, 0.2));
                    pen.drawPixel(x, y);
                }
            }
        }
    }
    else if (head === "star") {
        // A radiant star: beveled rays in the gem colour + a bright core.
        const rayLen = gemRadius * 1.15;
        for (let i = 0; i < 4; i++) {
            const a = -Math.PI / 4 + (i / 4) * Math.PI * 2;
            pen.fillCone(gemCenter.x, gemCenter.y, Math.cos(a), Math.sin(a), 0, rayLen, Math.max(1.2, gemRadius * 0.32), gemLight, gemDark);
        }
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            pen.fillCone(gemCenter.x, gemCenter.y, Math.cos(a), Math.sin(a), 0, rayLen * 0.6, Math.max(1, gemRadius * 0.24), gemLight, gemDark);
        }
        drawOrb(pen, gemCenter.x, gemCenter.y, gemRadius * 0.45, gemDark, gemLight, gemCore, spec);
    }
    else if (head === "branch") {
        // Living wood: the shaft forks into twigs with leaves, a small gem
        // nested at the fork.
        const base = diagToPosition(haftTopDiag, bounds);
        const green = { shadow: { r: 0x2f, g: 0x5a, b: 0x2e }, light: { r: 0x6f, g: 0xb0, b: 0x4a } };
        for (const side of [-0.9, 0.15, 0.9]) {
            const dir = { x: u.x + n.x * side * 0.7, y: u.y + n.y * side * 0.7 };
            const m = Math.hypot(dir.x, dir.y);
            const len = r.rangeFloat(4.5, 6.5) * dscale;
            pen.fillCone(base.x, base.y, dir.x / m, dir.y / m, 0, len, Math.max(1, haftMaxRadius * 0.7), WOOD.light, WOOD.shadow);
            // A leaf at each twig's end.
            const lx = base.x + (dir.x / m) * len * 0.9;
            const ly = base.y + (dir.y / m) * len * 0.9;
            pen.fillCone(lx, ly, dir.x / m, dir.y / m, 0, 2.6 * dscale, Math.max(1.2, 1.2 * dscale), green.light, green.shadow);
        }
        drawOrb(pen, base.x + u.x * 1.5 * dscale, base.y + u.y * 1.5 * dscale, gemRadius * 0.4, gemDark, gemLight, gemCore, spec);
    }
    else if (head === "twinhorns") {
        drawOrb(pen, gemCenter.x, gemCenter.y, gemRadius * 0.5, gemDark, gemLight, gemCore, spec);
    }
    else if (head === "orb") {
        drawOrb(pen, gemCenter.x, gemCenter.y, gemRadius, gemDark, gemLight, gemCore, spec);
    }
    else if (r.float() < 0.42 && head !== "claws") {
        drawFacet(pen, gemCenter.x, gemCenter.y, gemRadius, gemDark, gemLight, gemCore, spec);
    }
    else {
        drawOrb(pen, gemCenter.x, gemCenter.y, gemRadius * (head === "crescent" ? 0.85 : 1), gemDark, gemLight, gemCore, spec);
    }
    // Collar ring at the shaft/gem join for gem-carrying settings.
    if (GEM_HEADS.has(head) && head !== "cluster" && r.float() < 0.4) {
        drawShaftRing(pen, bounds, (gemOrtho - gemRadius * 0.7) * Math.SQRT2, haftMaxRadius + 0.4 * dscale, dscale, metal, metalDark);
    }
    // Settings drawn OVER the gem (claw tips read in front).
    if (head === "claws") {
        const clawBase = diagToPosition((gemOrtho - gemRadius * 0.6) * Math.SQRT2, bounds);
        const clawHalf = Math.max(1, 0.85 * dscale);
        const prongs = r.float() < 0.5 ? 2 : 3;
        for (let i = 0; i < prongs; i++) {
            const a = -Math.PI / 4 + (i - (prongs - 1) / 2) * 0.7;
            pen.fillCone(clawBase.x, clawBase.y, Math.cos(a), Math.sin(a), gemRadius * 0.4, gemRadius * 1.5, clawHalf, metal, metalDark);
        }
    }
    pen.addBorder();
    // Bloom + sparkles over the outline, for the gem-centred heads.
    if (GEM_HEADS.has(head)) {
        if (isWand || r.float() < 0.6)
            pen.drawGlow(gemCenter, gemRadius * 2.4, gemLight);
        if (r.float() < 0.72) {
            const nSpark = r.range(1, 4);
            for (let i = 0; i < nSpark; i++) {
                const a = -Math.PI / 2 + r.rangeFloat(-1.4, 1.4);
                const dist = gemRadius * (0.55 + 0.55 * r.float());
                drawSparkle(pen, Math.round(gemCenter.x + Math.cos(a) * dist), Math.round(gemCenter.y + Math.sin(a) * dist), r.range(1, 3), spec);
            }
        }
    }
}
/** A helical highlight/shadow running down the shaft → a twisted look. */
function twistShaft(pen, bounds, topDiag, haftR, dscale, base) {
    const litStr = colorStr(colorLighten(base, 0.25));
    const darkStr = colorStr(colorDarken(base, 0.3));
    const perpX = Math.SQRT1_2, perpY = Math.SQRT1_2; // across the shaft
    const wave = 2.2 * dscale;
    for (let l = 3 * dscale; l < topDiag / Math.SQRT2 - 2; l += 0.5) {
        const cx = l, cy = bounds.h - 1 - l;
        const off = Math.sin(l / wave) * haftR * 0.7;
        const x = Math.round(cx + perpX * off);
        const y = Math.round(cy + perpY * off);
        if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
            continue;
        if (pen.ctx.getImageData(x, y, 1, 1).data[3] === 0)
            continue;
        pen.ctx.fillStyle = Math.cos(l / wave) > 0 ? litStr : darkStr;
        pen.drawPixel(x, y);
    }
}
/** Knots and bumps down a wooden shaft → gnarled driftwood. */
function gnarlShaft(pen, bounds, topDiag, haftR, dscale, r) {
    const nKnot = r.range(3, 6);
    for (let i = 0; i < nKnot; i++) {
        const l = (topDiag / Math.SQRT2) * (0.15 + 0.7 * (i / nKnot) + r.rangeFloat(0, 0.08));
        const side = r.sign();
        const cx = l + Math.SQRT1_2 * side * haftR * 0.8;
        const cy = bounds.h - 1 - l + Math.SQRT1_2 * side * haftR * 0.8;
        // A small woody nub bulging off the shaft.
        pen.drawRoundOrnamentHelper({
            center: new Vector(cx, cy),
            radius: Math.max(1, r.rangeFloat(0.8, 1.3) * dscale),
            colorLight: WOOD.light,
            colorDark: WOOD.shadow,
        });
        // A dark knot eye.
        if (r.float() < 0.5) {
            pen.ctx.fillStyle = colorStr(WOOD.shadow);
            pen.drawPixel(Math.round(cx), Math.round(cy));
        }
    }
}
/** Filled metal ring (halo) behind the gem. */
function drawRingShape(pen, bounds, cx, cy, rad, thick, light, dark) {
    const lit = colorStr(light), dk = colorStr(dark);
    for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
        for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) {
            if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                continue;
            const d = Math.hypot(x - cx, y - cy);
            if (d < rad - thick || d > rad)
                continue;
            pen.ctx.fillStyle = x - cx + (y - cy) > 0 ? dk : lit;
            pen.drawPixel(x, y);
        }
    }
}
/** An annular arc (crescent) spanning [a0,a1] radians. */
function drawArc(pen, bounds, cx, cy, rad, thick, a0, a1, light, dark) {
    const lit = colorStr(light), dk = colorStr(dark);
    for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
        for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) {
            if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                continue;
            const d = Math.hypot(x - cx, y - cy);
            if (d < rad - thick || d > rad)
                continue;
            let ang = Math.atan2(y - cy, x - cx);
            // normalise to be near the [a0,a1] window
            while (ang < a0 - Math.PI)
                ang += Math.PI * 2;
            while (ang > a1 + Math.PI)
                ang -= Math.PI * 2;
            if (ang < a0 || ang > a1)
                continue;
            pen.ctx.fillStyle = (x - cx) < 0 ? lit : dk;
            pen.drawPixel(x, y);
        }
    }
}
function drawOrb(pen, cx, cy, rad, dark, light, core, spec) {
    const specX = cx - rad * 0.36;
    const specY = cy - rad * 0.36;
    const specR = Math.max(1.3, rad * 0.3);
    for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
        for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) {
            if (x < 0 || y < 0 || x >= pen.dimension || y >= pen.dimension)
                continue;
            const dx = x - cx, dy = y - cy;
            const d = Math.hypot(dx, dy);
            if (d > rad + 0.4)
                continue;
            const nd = Math.min(1, d / rad);
            const nx = dx / rad, ny = dy / rad;
            const lightAmt = Math.max(0, Math.min(1, 0.55 - (nx + ny) * 0.4));
            let c = colorLerp(dark, light, lightAmt);
            c = colorLerp(c, core, Math.pow(Math.max(0, 1 - nd), 1.7) * 0.55);
            if (nd > 0.78)
                c = colorDarken(c, ((nd - 0.78) / 0.22) * 0.5);
            const sd = Math.hypot(x - specX, y - specY);
            if (sd < specR)
                c = colorLerp(c, spec, Math.pow(1 - sd / specR, 1.4) * 0.95);
            pen.ctx.fillStyle = colorStr(c);
            pen.drawPixel(x, y);
        }
    }
}
function drawFacet(pen, cx, cy, rad, dark, light, core, spec) {
    const specX = cx - rad * 0.26;
    const specY = cy - rad * 0.34;
    const specR = Math.max(1.2, rad * 0.24);
    for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
        for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) {
            if (x < 0 || y < 0 || x >= pen.dimension || y >= pen.dimension)
                continue;
            const nx = (x - cx) / rad, ny = (y - cy) / rad;
            const m = Math.abs(nx) + Math.abs(ny);
            if (m > 1.0)
                continue;
            let c;
            if (m < 0.4)
                c = colorLerp(light, core, 0.5);
            else {
                const b = ny < 0 ? (nx < 0 ? 0.9 : 0.66) : nx < 0 ? 0.46 : 0.3;
                c = colorLerp(dark, light, b);
            }
            if (Math.abs(m - 0.4) < 0.06)
                c = colorDarken(c, 0.28);
            else if (Math.abs(nx) < 0.06 && m > 0.4)
                c = colorDarken(c, 0.22);
            if (m > 0.9)
                c = colorDarken(c, ((m - 0.9) / 0.1) * 0.42);
            const sd = Math.hypot(x - specX, y - specY);
            if (sd < specR)
                c = colorLerp(c, spec, Math.pow(1 - sd / specR, 1.3) * 0.9);
            pen.ctx.fillStyle = colorStr(c);
            pen.drawPixel(x, y);
        }
    }
}
function drawShaftRing(pen, bounds, diag, halfWidth, dscale, light, dark) {
    const ortho = diag / Math.SQRT2;
    const cx = ortho, cy = bounds.h - 1 - ortho;
    const fwd = Math.SQRT1_2, perp = Math.SQRT1_2;
    const halfW = halfWidth + 0.8 * dscale;
    const halfT = Math.max(0.6, 0.7 * dscale);
    const litStr = colorStr(light), darkStr = colorStr(dark);
    for (let t = -halfW; t <= halfW; t += 0.5) {
        for (let u = -halfT; u <= halfT; u += 0.5) {
            const x = Math.round(cx + perp * t + fwd * u);
            const y = Math.round(cy + perp * t - fwd * u);
            if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                continue;
            pen.ctx.fillStyle = t > halfW * 0.35 ? darkStr : litStr;
            pen.drawPixel(x, y);
        }
    }
}
function drawSparkle(pen, cx, cy, size, color) {
    const rr = Math.floor(color.r), gg = Math.floor(color.g), bb = Math.floor(color.b);
    for (let i = -size; i <= size; i++) {
        if (i === 0)
            continue;
        const a = (1 - Math.abs(i) / (size + 1)) * 0.9;
        pen.ctx.fillStyle = `rgba(${rr},${gg},${bb},${a.toFixed(2)})`;
        pen.drawPixel(cx + i, cy);
        pen.drawPixel(cx, cy + i);
    }
    pen.ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
    pen.drawPixel(cx, cy);
}
