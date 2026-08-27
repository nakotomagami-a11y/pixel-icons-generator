import { Vector } from "../math";
import { colorLerp, colorDarken, colorStr } from "../color";
import { STEEL, BLUED, GOLD, WOOD, DARK, BONE, BRONZE, DARKIRON, pickGem, pickCrystal, pickShieldPaint, } from "../palette";
const SHAPES = ["heater", "heater", "kite", "tower", "round", "crest", "teardrop", "heater", "kite", "crest"];
const BLAZONS = ["quarterly", "quarterly", "per-pale", "per-bend", "chief", "plain"];
const EMBLEMS = ["boss", "boss", "gem", "cross", "cross", "star", "chevron", "none"];
const pick = (r, arr) => arr[Math.floor(r.float() * arr.length) % arr.length];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** Half-width of the silhouette at normalised height `t` (0 top .. 1 bottom),
 *  in the shield's own frame (fraction of `maxHalf`, already scaled in). */
function halfWidthAt(shape, t) {
    switch (shape) {
        case "tower": {
            // Boxy: near-full width almost to the bottom, then a shallow round-off —
            // a flat-bottomed pavise/tower shield, not a point.
            const botRound = 0.86;
            if (t < botRound)
                return 1;
            const u = (t - botRound) / (1 - botRound);
            return 1 - 0.62 * Math.pow(u, 1.4);
        }
        case "kite": {
            // Domed top arc (apex at t=0, full width at topArc), then a long sharp
            // taper to a point — the tall Norman kite silhouette.
            const topArc = 0.24;
            if (t <= topArc) {
                const u = t / topArc;
                return Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)));
            }
            const u = (t - topArc) / (1 - topArc);
            return Math.max(0, 1 - Math.pow(u, 1.1));
        }
        case "teardrop": {
            // Wide rounded top, body stays round longer before a soft point.
            const topArc = 0.34;
            if (t <= topArc) {
                const u = t / topArc;
                return Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)));
            }
            const u = (t - topArc) / (1 - topArc);
            return Math.max(0, 1 - Math.pow(u, 1.55));
        }
        case "crest": {
            // The outer edge itself tapers to a point over the top band too — combined
            // with the centre notch below, the two halves read as pointed horns/ears
            // rather than a flat-topped block.
            const flare = 1.08;
            const topFlat = 0.17;
            if (t <= topFlat)
                return flare * Math.pow(t / topFlat, 0.75);
            const u = (t - topFlat) / (1 - topFlat);
            return flare * Math.max(0, 1 - Math.pow(u, 1.3));
        }
        case "heater":
        default: {
            const topFlat = 0.14;
            if (t <= topFlat)
                return 1;
            const u = (t - topFlat) / (1 - topFlat);
            return Math.max(0, 1 - Math.pow(u, 1.3));
        }
    }
}
/** The crest's scalloped top-centre notch: a shallow V dividing two "horns". */
function crestNotchCut(nx, t) {
    const notchHalf = 0.22;
    const notchDepth = 0.16;
    if (Math.abs(nx) >= notchHalf)
        return false;
    const centerness = 1 - Math.abs(nx) / notchHalf;
    return t < notchDepth * centerness;
}
/** Classify a canvas pixel against the shield silhouette. Returns null when
 *  the pixel is outside the shape. Shared by the field fill, the rim band,
 *  and the chevron emblem overlay so geometry only lives in one place. */
function sample(shape, dx, y, m) {
    if (shape === "round") {
        const radius = m.maxHalf;
        const cy = m.top + m.H / 2;
        const dyc = y - cy;
        const d = Math.hypot(dx, dyc);
        if (d > radius)
            return null;
        return { nx: dx / radius, ny: dyc / radius, edgeDist: radius - d };
    }
    const t = clamp01((y - m.top) / m.H);
    const hw = halfWidthAt(shape, t) * m.maxHalf;
    const nxRaw = m.maxHalf > 0 ? dx / m.maxHalf : 0;
    if (Math.abs(dx) > hw)
        return null;
    if (shape === "crest" && crestNotchCut(nxRaw, t))
        return null;
    const edgeSide = hw - Math.abs(dx);
    const hasFlatTop = shape === "heater" || shape === "tower" || shape === "crest";
    const edgeTop = hasFlatTop ? y - m.top : Infinity;
    return { nx: hw > 0 ? dx / hw : 0, ny: t * 2 - 1, edgeDist: Math.min(edgeSide, edgeTop) };
}
/** Field colour for the two-tone heraldic blazons, from normalised nx/ny. */
function blazonRamp(blazon, nx, ny, a, b) {
    switch (blazon) {
        case "per-pale":
            return nx < 0 ? a : b;
        case "per-bend":
            return nx + ny < 0 ? a : b;
        case "quarterly":
            return (nx < 0) === (ny < 0) ? a : b;
        case "chief":
            return ny < -0.56 ? b : a;
        case "plain":
        default:
            return a;
    }
}
/** Thin darker seam every few px — reads as butted wooden planks. */
function applyWoodGrain(color, dx, dscale) {
    const plankW = 3.1 * dscale;
    const phase = ((dx % plankW) + plankW) % plankW;
    return Math.abs(phase - plankW / 2) < 0.55 ? colorDarken(color, 0.3) : color;
}
export function drawShield(pen) {
    pen.rng.checkpoint();
    const r = pen.rng;
    const B = pen.dimension;
    const dscale = B / 32;
    pen.clearCanvas();
    const shape = pick(r, SHAPES);
    const marginX = Math.max(1, Math.round(B * 0.11));
    const marginTop = Math.max(1, Math.round(B * 0.08));
    const marginBottom = Math.max(1, Math.round(B * 0.035));
    const top = marginTop;
    const H = B - 1 - marginBottom - top;
    const cx = (B - 1) / 2;
    const fullHalf = (B - 1 - 2 * marginX) / 2;
    const widthScale = shape === "kite" ? 0.74 : shape === "teardrop" ? 0.86 : shape === "crest" ? 0.94 : 1;
    const maxHalf = shape === "round" ? Math.min(fullHalf, H / 2) : fullHalf * widthScale;
    const m = { cx, top, H, maxHalf };
    // -- field: worked material, or painted heraldic blazon -------------------
    const crystalField = r.float() < 0.06;
    const painted = !crystalField && r.float() < 0.58;
    const materialRamps = [STEEL, BLUED, WOOD, WOOD, DARK, BONE, BRONZE, DARKIRON];
    const fieldA = crystalField ? pickCrystal(r) : painted ? pickShieldPaint(r) : pick(r, materialRamps);
    let fieldB = painted ? pickShieldPaint(r) : GOLD;
    if (painted && fieldB === fieldA)
        fieldB = pickShieldPaint(r);
    const blazon = painted ? pick(r, BLAZONS) : "plain";
    const isWoodPlain = !painted && !crystalField && fieldA === WOOD;
    const rimMetalPool = [GOLD, STEEL, GOLD, BRONZE, DARKIRON];
    const rimMetal = pick(r, rimMetalPool);
    const hasRim = r.float() < 0.72;
    const rimPx = hasRim ? Math.max(1, (r.float() < 0.5 ? 1 : 1.7) * dscale) : 0;
    // Light from the top-left, matching the pack's directional convention.
    const lx = -0.6;
    const ly = -0.62;
    for (let x = 0; x < B; x++) {
        for (let y = 0; y < B; y++) {
            const dx = x - cx;
            const s = sample(shape, dx, y, m);
            if (!s)
                continue;
            const lt = clamp01(0.5 + 0.5 * (s.nx * lx + s.ny * ly));
            const inRim = rimPx > 0 && s.edgeDist < rimPx;
            let color;
            if (inRim) {
                color = lt > 0.82 ? rimMetal.spec : colorLerp(rimMetal.shadow, rimMetal.light, lt);
            }
            else {
                const ramp = blazonRamp(blazon, s.nx, s.ny, fieldA, fieldB);
                color = colorLerp(ramp.shadow, ramp.light, lt);
                if (isWoodPlain)
                    color = applyWoodGrain(color, dx, dscale);
            }
            pen.ctx.fillStyle = colorStr(color);
            pen.drawPixel(x, y);
        }
    }
    // -- rivets along the rim (skip on round; the boss reads as the focal point
    //    there and the pack rarely studs bucklers) --------------------------
    if (shape !== "round" && r.float() < 0.4) {
        const nStud = r.range(3, 6);
        const studDark = colorDarken(DARK.mid, 0.1);
        for (let i = 0; i < nStud; i++) {
            const t = (i + 1) / (nStud + 1);
            const hw = halfWidthAt(shape, t) * maxHalf;
            if (hw < 1.5)
                continue;
            const side = r.sign();
            const sx = Math.round(cx + side * (hw - Math.max(1, 0.8 * dscale)));
            const sy = Math.round(top + t * H);
            pen.drawRoundOrnamentHelper({ center: new Vector(sx, sy), radius: Math.max(0.7, 0.55 * dscale), colorLight: DARK.shadow, colorDark: studDark });
        }
    }
    // -- corner reinforcement brackets (true flat-top shapes only — crest's
    //    horns already taper to a point, a bar there reads as a stuck-on block)
    // Masked so the bracket only ever paints over pixels the field pass already
    // filled — a mismatched taper can never leave a stray metal blob floating
    // outside the silhouette.
    if ((shape === "heater" || shape === "tower") && r.float() < 0.45) {
        const cornerHalf = halfWidthAt(shape, 0.02) * maxHalf;
        const capLen = Math.max(2, 4 * dscale);
        const half = Math.max(1, 1.2 * dscale);
        for (const side of [-1, 1]) {
            const cxCorner = cx + side * cornerHalf;
            paintMaskedBar(pen, cxCorner, top, -side, 0, capLen, half, rimMetal);
            paintMaskedBar(pen, cxCorner, top, 0, 1, capLen * 0.8, half, rimMetal);
        }
    }
    // -- centrepiece emblem -----------------------------------------------------
    const emblem = pick(r, EMBLEMS);
    const centerY = top + H * (shape === "round" ? 0.5 : shape === "tower" ? 0.46 : 0.4);
    const center = new Vector(cx, centerY);
    const er = Math.min(maxHalf, H * 0.5) * (shape === "round" ? 0.6 : 0.5);
    const accent = pick(r, [GOLD, STEEL, rimMetal]);
    let gemColorForGlow = null;
    if (emblem === "boss") {
        pen.drawRoundOrnamentHelper({ center, radius: Math.max(1.5, er * 0.62), colorLight: accent.light, colorDark: accent.shadow });
    }
    else if (emblem === "gem") {
        const gem = crystalField ? pickCrystal(r) : pickGem(r);
        pen.drawRoundOrnamentHelper({ center, radius: Math.max(1.4, er * 0.46), colorLight: gem.light, colorDark: gem.shadow });
        gemColorForGlow = gem.light;
    }
    else if (emblem === "cross") {
        drawCross(pen, center, er, accent);
    }
    else if (emblem === "star") {
        drawMullet(pen, center, er, r.float() < 0.5 ? 4 : 5, accent, r);
    }
    else if (emblem === "chevron") {
        drawChevron(pen, shape, m, accent, r);
    }
    pen.weather(r.floatLow() * (crystalField ? 0.3 : 0.85));
    pen.addBorder();
    if (gemColorForGlow)
        pen.drawGlow(center, er * 1.9, gemColorForGlow);
}
/** A short straight metal bar from (x0,y0) along unit direction (dx,dy),
 *  painted only over pixels that are already opaque — used for corner
 *  brackets so the shape's own silhouette is the only clip mask needed. */
function paintMaskedBar(pen, x0, y0, dx, dy, len, half, ramp) {
    const steps = Math.max(1, Math.ceil(len));
    for (let s = 0; s <= steps; s++) {
        const cx = x0 + dx * s;
        const cy = y0 + dy * s;
        for (let w = -half; w <= half; w += 0.5) {
            const px = Math.round(cx - dy * w);
            const py = Math.round(cy + dx * w);
            if (px < 0 || py < 0 || px >= pen.dimension || py >= pen.dimension)
                continue;
            if (pen.ctx.getImageData(px, py, 1, 1).data[3] === 0)
                continue;
            pen.ctx.fillStyle = colorStr(w < 0 ? ramp.light : ramp.shadow);
            pen.drawPixel(px, py);
        }
    }
}
/** A thick heraldic "+", two overlapping beveled bars centred on `c`. */
function drawCross(pen, c, er, ramp) {
    const arm = er * 0.92;
    const half = Math.max(0.9, er * 0.24);
    pen.fillCone(c.x, c.y, 0, -1, 0, arm, half, ramp.light, ramp.shadow);
    pen.fillCone(c.x, c.y, 0, 1, 0, arm, half, ramp.light, ramp.shadow);
    pen.fillCone(c.x, c.y, -1, 0, 0, arm, half, ramp.light, ramp.shadow);
    pen.fillCone(c.x, c.y, 1, 0, 0, arm, half, ramp.light, ramp.shadow);
}
/** A radial mullet / heraldic star: `n` short beveled rays from the centre. */
function drawMullet(pen, c, er, n, ramp, r) {
    const start = r.rangeFloat(0, Math.PI * 2);
    const half = Math.max(0.9, er * 0.22);
    for (let i = 0; i < n; i++) {
        const a = start + (i / n) * Math.PI * 2;
        pen.fillCone(c.x, c.y, Math.cos(a), Math.sin(a), 0, er * 0.85, half, ramp.light, ramp.shadow);
    }
    pen.drawRoundOrnamentHelper({ center: c, radius: Math.max(1, half * 1.1), colorLight: ramp.light, colorDark: ramp.shadow });
}
/** A diagonal accent band painted across the already-filled field. */
function drawChevron(pen, shape, m, ramp, r) {
    const width = Math.max(1.4, m.maxHalf * 0.22);
    const dir = r.sign();
    const litStr = colorStr(ramp.light);
    const midStr = colorStr(ramp.mid);
    for (let x = 0; x < pen.dimension; x++) {
        for (let y = 0; y < pen.dimension; y++) {
            const dx = x - m.cx;
            const s = sample(shape, dx, y, m);
            if (!s)
                continue;
            const band = dir * dx + s.ny * m.maxHalf;
            if (Math.abs(band) > width)
                continue;
            pen.ctx.fillStyle = band < 0 ? litStr : midStr;
            pen.drawPixel(x, y);
        }
    }
}
