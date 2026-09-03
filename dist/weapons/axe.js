import { Vector, Bounds, diagToPosition } from "../math";
import { colorLerp, colorStr, colorDarken } from "../color";
import { pickBladeMetal, pickGem, pickCrystal, GOLD, WOOD, DARK, BRONZE } from "../palette";
/**
 * Mix-and-match axe: a haft along the bottom-left→top-right diagonal, a head of
 * one of several shapes (single bit, bearded, broad fan, double bit, crescent),
 * and optional features — top spike, back pick/spike, notched edge, gem inset —
 * plus haft details (leather wrap bands, end ring / pommel). Procedural shapes
 * derived from the reference vocabulary, not copied pixels.
 */
const HEADS = ["fan", "bearded", "broad", "double", "crescent", "halberd", "fan", "bearded", "crescent", "halberd"];
const pick = (r, arr) => arr[Math.floor(r.float() * arr.length) % arr.length];
const norm = (x, y) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };
export function drawAxe(pen, parts) {
    pen.rng.checkpoint();
    const r = pen.rng;
    const bounds = new Bounds(0, 0, pen.dimension, pen.dimension);
    const dscale = bounds.h / 32;
    const canvasDiag = Math.hypot(bounds.w, bounds.h);
    pen.clearCanvas();
    const head = parts?.head ?? pick(r, HEADS);
    const metal = r.float() < 0.1 ? pickCrystal(r) : pickBladeMetal(r); // ~10% enchanted crystal head
    const accent = r.float() < 0.5 ? GOLD : metal;
    // Head anchor sits at the top of the haft; the haft ends just past it so the
    // head's neck always covers the shaft top (no thin haft poking above the head).
    // The bit reaches OUTWARD (up-left) by ~depth, so the anchor must sit far
    // enough down the diagonal that the cutting edge doesn't clip off the top
    // corner — hence more clearance than the old thin wedges needed. A halberd
    // sits lower still so its long top spike has room to reach the corner.
    const headDiag = canvasDiag - Math.ceil((head === "halberd" ? r.range(13, 16) : r.range(10, 13)) * dscale);
    const u = new Vector(1, -1).normalize(); // along haft, toward the head (top-right)
    const n = new Vector(-1, -1).normalize(); // outward (top-left)
    const anchorDiag = headDiag - Math.floor(r.range(0, 2) * dscale);
    const haftColor = r.float() < 0.7 ? WOOD.mid : DARK.mid;
    pen.drawHaftHelper({ startDiag: 0, lengthDiag: anchorDiag + 2 * dscale, maxRadius: Math.max(1, r.range(1, 2)) * dscale, fractionalRadiusAllowed: true, color: haftColor });
    const anchor = diagToPosition(anchorDiag, bounds);
    const notch = r.float() < 0.3 ? r.rangeFloat(0.16, 0.30) : 0;
    const doubleSide = head === "double";
    // Convex-arc bit (see FanParams). Defaults = single-bit hatchet: cutting edge
    // a bold convex arc reaching up-left, a beard hanging down toward the grip,
    // and only a small rise above the socket (so it never streams up-right off
    // the haft top into a pennant/flag — the old failure mode).
    const p = {
        sockTop: r.rangeFloat(3, 3.5) * dscale,
        sockBot: r.rangeFloat(3, 3.5) * dscale,
        kTop: r.rangeFloat(0.35, 0.5),
        kBot: r.rangeFloat(0.55, 0.72),
        depth: r.rangeFloat(10.5, 12) * dscale,
        curve: r.rangeFloat(1.4, 1.6),
        sMid: -r.rangeFloat(1.5, 3) * dscale,
        notch,
        fuller: notch === 0 && r.float() < 0.35,
    };
    if (head === "bearded") {
        // Hatchet with a long beard: flatter top, edge hangs toward the grip.
        p.kTop = r.rangeFloat(0.2, 0.32);
        p.kBot = r.rangeFloat(0.8, 1.0);
        p.depth = r.rangeFloat(11, 12.5) * dscale;
        p.curve = r.rangeFloat(1.25, 1.45);
        p.sMid = -r.rangeFloat(3.5, 5) * dscale;
    }
    else if (head === "broad") {
        p.kTop = r.rangeFloat(0.55, 0.7); // wide, near-symmetric fan
        p.kBot = r.rangeFloat(0.55, 0.7);
        p.sockTop = p.sockBot = r.rangeFloat(3.2, 3.8) * dscale;
        p.depth = r.rangeFloat(11, 12.5) * dscale;
        p.curve = r.rangeFloat(1.45, 1.65);
        p.sMid = 0;
    }
    else if (head === "double") {
        // Symmetric so the mirrored (sign = -1) second bit matches exactly.
        p.kTop = r.rangeFloat(0.5, 0.62);
        p.kBot = p.kTop;
        p.sockTop = p.sockBot = r.rangeFloat(3, 3.5) * dscale;
        p.depth = r.rangeFloat(10, 11.5) * dscale;
        p.curve = r.rangeFloat(1.35, 1.55);
        p.sMid = 0;
        p.fuller = false;
    }
    else if (head === "crescent") {
        p.kTop = r.rangeFloat(0.52, 0.66);
        p.kBot = r.rangeFloat(0.52, 0.66);
        p.sockTop = p.sockBot = r.rangeFloat(3.2, 3.8) * dscale;
        p.depth = r.rangeFloat(11, 12.5) * dscale;
        p.curve = r.rangeFloat(1.4, 1.6);
        p.sMid = 0;
        p.concave = r.rangeFloat(0.3, 0.45); // centre scoop → crescent horns
        p.fuller = false;
    }
    else if (head === "halberd") {
        // Compact bit — the long top spike (added below) is the halberd's signature.
        p.kTop = r.rangeFloat(0.25, 0.4);
        p.kBot = r.rangeFloat(0.45, 0.6);
        p.depth = r.rangeFloat(7, 8.5) * dscale;
        p.curve = r.rangeFloat(1.3, 1.5);
        p.sMid = -r.rangeFloat(1, 2.5) * dscale;
    }
    drawFan(pen, anchor, u, n, p, metal, 1);
    if (doubleSide)
        drawFan(pen, anchor, u, n, p, metal, -1);
    // Top spike: a long bladed point continuing past the head, in line with the
    // haft — the halberd's signature. On other heads this used to appear as a
    // short "finial" in the same spot, but continuing the bit's own top corner
    // in the same direction just fused with it into one over-long point (the
    // "flag" look) — dropped rather than fought into looking right.
    if (head === "halberd") {
        const startDiag = headDiag - Math.round(1 * dscale);
        const tp = diagToPosition(Math.min(canvasDiag - 1, startDiag), bounds);
        const len = canvasDiag - startDiag - 1;
        const half = r.rangeFloat(1.6, 2.4) * dscale;
        pen.fillCone(tp.x, tp.y, u.x, u.y, 0, len, half, metal.light, metal.shadow);
    }
    // Back pick/spike opposite the bit (single-bit heads only).
    if (!doubleSide && head !== "crescent" && r.float() < 0.5) {
        const beveled = r.float() < 0.5;
        pen.fillCone(anchor.x, anchor.y, -n.x, -n.y, 0, r.rangeFloat(3, 6) * dscale, (beveled ? 1.2 : 2.4) * dscale, metal.light, metal.shadow);
    }
    // Gem inset near the head's neck.
    const hasGem = r.float() < 0.28;
    const gem = hasGem ? pickGem(r) : null;
    if (gem) {
        const gc = new Vector(anchor.x + n.x * 1.5, anchor.y + n.y * 1.5);
        pen.drawRoundOrnamentHelper({ center: gc, radius: Math.max(1.2, 1.4 * dscale), colorLight: gem.light, colorDark: gem.shadow });
    }
    else if (r.float() < 0.4) {
        // Rivets: a couple of dark bolt studs where the bit is forged to the socket.
        const nR = r.float() < 0.5 ? 2 : 3;
        for (let i = 0; i < nR; i++) {
            const off = (1.6 + i * 2.2) * dscale;
            const rc = new Vector(anchor.x + n.x * off, anchor.y + n.y * off);
            pen.drawRoundOrnamentHelper({ center: rc, radius: Math.max(0.8, 0.6 * dscale), colorLight: DARK.mid, colorDark: DARK.shadow });
        }
    }
    // Hanging leather thongs from the head socket — short, stubby strips (NOT the
    // fluttering cloth ribbons the spears/tridents carry).
    if (r.float() < 0.3) {
        const th = r.float() < 0.5 ? WOOD : DARK;
        const nT = r.range(2, 4);
        const rootX = anchor.x - u.x * 1.5 * dscale;
        const rootY = anchor.y - u.y * 1.5 * dscale;
        for (let i = 0; i < nT; i++) {
            const sp = (i - (nT - 1) / 2) * 0.5;
            const dir = norm(-u.x + n.x * sp, -u.y + n.y * sp);
            pen.fillCone(rootX, rootY, dir.x, dir.y, 0, r.rangeFloat(3, 5) * dscale, Math.max(0.8, 0.8 * dscale), th.mid, th.shadow);
        }
    }
    // Enamel inlay band: a stripe of accent colour across the bit face.
    if (!gem && r.float() < 0.25) {
        const inlay = r.float() < 0.5 ? GOLD : pickCrystal(r);
        const d0 = r.rangeFloat(2.5, 4) * dscale;
        for (let t = -6 * dscale; t <= 6 * dscale; t += 0.5) {
            for (let du = -0.7 * dscale; du <= 0.7 * dscale; du += 0.5) {
                const x = Math.round(anchor.x + u.x * t + n.x * (d0 + du));
                const y = Math.round(anchor.y + u.y * t + n.y * (d0 + du));
                if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                    continue;
                if (pen.ctx.getImageData(x, y, 1, 1).data[3] === 0)
                    continue; // only over the bit
                pen.ctx.fillStyle = colorStr(du < 0 ? inlay.light : inlay.mid);
                pen.drawPixel(x, y);
            }
        }
    }
    // Mid-haft accent ferrule: a bright metal band girdling the shaft.
    if (r.float() < 0.35) {
        const bd = anchorDiag * r.rangeFloat(0.4, 0.7);
        const c = diagToPosition(bd, bounds);
        const litStr = colorStr(accent.light);
        const darkStr = colorStr(accent.shadow);
        for (let t = -2.2 * dscale; t <= 2.2 * dscale; t += 0.5) {
            for (let du = -0.7 * dscale; du <= 0.7 * dscale; du += 0.5) {
                const x = Math.round(c.x + n.x * t + u.x * du);
                const y = Math.round(c.y + n.y * t + u.y * du);
                if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                    continue;
                if (pen.ctx.getImageData(x, y, 1, 1).data[3] === 0)
                    continue; // only over the haft
                pen.ctx.fillStyle = t > 0.4 * dscale ? darkStr : litStr;
                pen.drawPixel(x, y);
            }
        }
    }
    // Haft wrap: a few dark leather bands across the shaft.
    if (r.float() < 0.6)
        drawHaftWrap(pen, bounds, u, n, dscale, r, anchorDiag);
    // Butt of the haft: end ring, or a capped pommel.
    const butt = r.float();
    if (butt < 0.4) {
        drawEndRing(pen, bounds, dscale, accent.mid, accent.shadow);
    }
    else if (butt < 0.75) {
        const pr = Math.ceil((0.6 + r.floatLow() * 0.7) * dscale);
        pen.drawRoundOrnamentHelper({ center: new Vector(Math.floor(pr), Math.ceil(bounds.h - pr - 1)), radius: pr, colorLight: accent.light, colorDark: accent.shadow });
    }
    pen.weather(r.floatLow() * 0.9); // battle-worn axe head
    pen.addBorder();
    // Gem bloom over the outline so it reads as light.
    if (gem) {
        const gc = new Vector(anchor.x + n.x * 1.5, anchor.y + n.y * 1.5);
        pen.drawGlow(gc, 3.2 * dscale, gem.light);
    }
}
/**
 * Convex-arc axe bit in the (s = along haft, d = outward·sign) frame. See
 * {@link FanParams} for the four-constraint convex-intersection model that
 * guarantees an axe-shaped (never spiky/flag) silhouette.
 */
function drawFan(pen, anchor, u, n, p, metal, sign) {
    const B = pen.dimension;
    const dscale = B / 32;
    const R = p.depth * p.curve;
    const cd = p.depth - R; // circle centre (outward coord) sits behind the peak
    const cs = p.sMid;
    const crescent = !!p.concave && p.concave > 0;
    const scoopHalf = 0.35 * (p.sockTop + p.sockBot + p.depth); // crescent centre-scoop half-width
    const fullerHalf = Math.max(0.9, (Math.max(p.sockTop, p.sockBot) + 1.5) * 0.5);
    for (let x = 0; x < B; x++) {
        for (let y = 0; y < B; y++) {
            const px = x - anchor.x;
            const py = y - anchor.y;
            const s = px * u.x + py * u.y;
            const d = (px * n.x + py * n.y) * sign;
            if (d < 0)
                continue;
            const topLim = p.sockTop + p.kTop * d; // top edge (flares out)
            const botLim = p.sockBot + p.kBot * d; // bottom edge / beard (flares out)
            if (s > topLim || s < -botLim)
                continue;
            const dxr = s - cs;
            const dyr = d - cd;
            if (dxr * dxr + dyr * dyr > R * R)
                continue; // outside the cutting-edge arc
            // Outward extent of the cutting-edge arc at this s.
            let cap = cd + Math.sqrt(Math.max(0, R * R - dxr * dxr));
            if (crescent)
                cap -= p.concave * p.depth * Math.max(0, 1 - Math.abs(s - cs) / scoopHalf); // centre scoop
            if (p.notch > 0) {
                const tri = Math.abs(((s / (3.2 * dscale)) % 2 + 2) % 2 - 1);
                cap *= 1 - p.notch * (1 - tri);
            }
            if (d > cap)
                continue;
            // Shading: dark thick neck (d small) → bright sharpened cutting edge
            // (d near cap); darken toward the flat top/bottom edges (high lat).
            const sideHalf = s > 0 ? topLim : botLim;
            const lat = sideHalf > 0 ? Math.min(1, Math.abs(s) / sideHalf) : 0;
            const edgeProx = cap > 0 ? d / cap : 0;
            const flare = d / p.depth;
            let shade = 0.16 + 0.5 * flare;
            if (edgeProx > 0.72)
                shade += 0.7 * ((edgeProx - 0.72) / 0.28);
            shade -= 0.28 * Math.pow(lat, 1.7);
            shade = Math.max(0, Math.min(1, shade));
            // Fuller: a dark engraved groove running the centre of the bit from the
            // neck out toward (but not into) the cutting edge.
            const inFuller = p.fuller && Math.abs(s - cs) < fullerHalf && flare > 0.15 && edgeProx < 0.7;
            const col = inFuller ? metal.shadow : edgeProx > 0.9 ? metal.spec : colorLerp(metal.shadow, metal.light, shade);
            pen.ctx.fillStyle = colorStr(col);
            pen.drawPixel(x, y);
        }
    }
}
/** A few dark leather wrap bands across the lower haft. */
function drawHaftWrap(pen, bounds, u, n, dscale, r, headDiag) {
    const bands = r.range(2, 5);
    const dark = colorStr(colorDarken(WOOD.shadow, 0.2));
    const lo = 4 * dscale;
    for (let i = 0; i < bands; i++) {
        const frac = 0.15 + 0.5 * (i / Math.max(1, bands));
        const diag = frac * headDiag + lo;
        const ortho = diag / Math.SQRT2;
        const cx = ortho;
        const cy = bounds.h - 1 - ortho;
        const halfW = 2.2 * dscale;
        for (let t = -halfW; t <= halfW; t += 0.5) {
            const x = Math.round(cx + n.x * t);
            const y = Math.round(cy + n.y * t);
            if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                continue;
            // only paint over the existing haft
            if (pen.ctx.getImageData(x, y, 1, 1).data[3] === 0)
                continue;
            pen.ctx.fillStyle = dark;
            pen.drawPixel(x, y);
            void u;
        }
    }
}
/** A metal ring at the butt of the haft. */
function drawEndRing(pen, bounds, dscale, light, dark) {
    const rad = 2.2 * dscale;
    const cx = rad + 1;
    const cy = bounds.h - 1 - rad - 1;
    const lit = colorStr(light);
    const dk = colorStr(dark);
    for (let x = Math.floor(cx - rad - 1); x <= Math.ceil(cx + rad + 1); x++) {
        for (let y = Math.floor(cy - rad - 1); y <= Math.ceil(cy + rad + 1); y++) {
            if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h)
                continue;
            const dd = Math.hypot(x - cx, y - cy);
            if (Math.abs(dd - rad) <= Math.max(0.8, 0.7 * dscale)) {
                pen.ctx.fillStyle = y - cy + (x - cx) > 0 ? dk : lit;
                pen.drawPixel(x, y);
            }
        }
    }
    void BRONZE;
}
