import { Vector, Bounds, diagToPosition } from "../math";
import { colorLerp, colorStr, colorDarken } from "../color";
import { pickBladeMetal, pickGem, pickCrystal, GOLD, WOOD, DARK, BRONZE } from "../palette";
/**
 * Mix-and-match axe, layer by layer: a haft along the bottom-left→top-right
 * diagonal, a HEAD of one of ten shapes, an explicit BACK fitting opposite
 * the bit (spike / pick / hammer poll / hook), a BUTT at the haft's end, and
 * a DECORATION (gem, rivets, inlay, runes, wrap…). Every layer is an
 * independent pick so the dropdowns compose.
 */
const HEADS = [
    "fan", "fan", "bearded", "bearded", "broad", "double", "crescent",
    "halberd", "halberd", "warpick", "hammer", "greataxe", "tomahawk",
];
const BACKS = ["none", "none", "spike", "spike", "pick", "hammer", "hook"];
const BUTTS = ["none", "ring", "ring", "cap", "cap", "spike"];
const DECORATIONS = [
    "none", "none", "gem", "rivets", "rivets", "inlay", "thongs",
    "fuller", "runes", "notch", "wrap", "wrap", "ferrule",
];
const pick = (r, arr) => arr[Math.floor(r.float() * arr.length) % arr.length];
const norm = (x, y) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };
export function drawAxe(pen, parts) {
    pen.rng.checkpoint();
    const r = pen.rng;
    const bounds = new Bounds(0, 0, pen.dimension, pen.dimension);
    const dscale = bounds.h / 32;
    const canvasDiag = Math.hypot(bounds.w, bounds.h);
    pen.clearCanvas();
    const head = parts?.head && HEADS.includes(parts.head) ? parts.head : pick(r, HEADS);
    const back = parts?.back && BACKS.includes(parts.back) ? parts.back : pick(r, BACKS);
    const butt = parts?.butt && BUTTS.includes(parts.butt) ? parts.butt : pick(r, BUTTS);
    const deco = parts?.decoration && DECORATIONS.includes(parts.decoration) ? parts.decoration : pick(r, DECORATIONS);
    const metal = r.float() < 0.1 ? pickCrystal(r) : pickBladeMetal(r); // ~10% enchanted crystal head
    const accent = r.float() < 0.5 ? GOLD : metal;
    // Head anchor sits at the top of the haft; the haft ends just past it so the
    // head's neck always covers the shaft top (no thin haft poking above the head).
    // The bit reaches OUTWARD (up-left) by ~depth, so the anchor must sit far
    // enough down the diagonal that the cutting edge doesn't clip off the top
    // corner — hence more clearance than the old thin wedges needed. A halberd
    // sits lower still so its long top spike has room to reach the corner.
    const headDiag = canvasDiag - Math.ceil((head === "halberd" ? r.range(13, 16) : head === "tomahawk" ? r.range(8, 10) : head === "greataxe" ? r.range(12, 14) : r.range(10, 13)) * dscale);
    const u = new Vector(1, -1).normalize(); // along haft, toward the head (top-right)
    const n = new Vector(-1, -1).normalize(); // outward (top-left)
    const anchorDiag = headDiag - Math.floor(r.range(0, 2) * dscale);
    const haftColor = r.float() < 0.7 ? WOOD.mid : DARK.mid;
    pen.drawHaftHelper({ startDiag: 0, lengthDiag: anchorDiag + 2 * dscale, maxRadius: Math.max(1, r.range(1, 2)) * dscale, fractionalRadiusAllowed: true, color: haftColor });
    const anchor = diagToPosition(anchorDiag, bounds);
    const notch = deco === "notch" ? r.rangeFloat(0.16, 0.30) : 0;
    const doubleSide = head === "double";
    const fanFamily = head !== "warpick" && head !== "hammer";
    // Convex-arc bit (see FanParams). Defaults = single-bit hatchet: cutting edge
    // a bold convex arc reaching up-left, a beard hanging down toward the grip,
    // and only a small rise above the socket (so it never streams up-right off
    // the haft top into a pennant/flag — the old failure mode).
    const p = {
        sockTop: r.rangeFloat(2.5, 3) * dscale,
        sockBot: r.rangeFloat(2.5, 3) * dscale,
        kTop: r.rangeFloat(0.28, 0.4),
        kBot: r.rangeFloat(0.65, 0.85),
        depth: r.rangeFloat(10.5, 12) * dscale,
        curve: r.rangeFloat(1.3, 1.5),
        sMid: -r.rangeFloat(2, 3.5) * dscale,
        notch,
        fuller: deco === "fuller",
    };
    if (head === "bearded") {
        // Hatchet with a long beard: flatter top, edge hangs toward the grip.
        p.kTop = r.rangeFloat(0.18, 0.28);
        p.kBot = r.rangeFloat(0.85, 1.05);
        p.sockTop = r.rangeFloat(2.4, 2.8) * dscale;
        p.sockBot = r.rangeFloat(2.4, 2.8) * dscale;
        p.depth = r.rangeFloat(11, 12.5) * dscale;
        p.curve = r.rangeFloat(1.25, 1.45);
        p.sMid = -r.rangeFloat(3.5, 5) * dscale;
    }
    else if (head === "broad") {
        p.kTop = r.rangeFloat(0.55, 0.7); // wide, near-symmetric fan
        p.kBot = r.rangeFloat(0.55, 0.7);
        p.sockTop = p.sockBot = r.rangeFloat(2.8, 3.2) * dscale;
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
        p.concave = r.rangeFloat(0.45, 0.6); // centre scoop → crescent horns
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
    else if (head === "greataxe") {
        // An oversized executioner bit: deep, tall, boldly curved.
        p.kTop = r.rangeFloat(0.6, 0.75);
        p.kBot = r.rangeFloat(0.6, 0.75);
        p.sockTop = p.sockBot = r.rangeFloat(3.8, 4.4) * dscale;
        p.depth = r.rangeFloat(12.5, 14) * dscale;
        p.curve = r.rangeFloat(1.5, 1.7);
        p.sMid = 0;
    }
    else if (head === "tomahawk") {
        // A small, light hatchet bit high on a slender haft.
        p.kTop = r.rangeFloat(0.3, 0.42);
        p.kBot = r.rangeFloat(0.5, 0.65);
        p.sockTop = p.sockBot = r.rangeFloat(2.2, 2.6) * dscale;
        p.depth = r.rangeFloat(7, 8.5) * dscale;
        p.curve = r.rangeFloat(1.3, 1.5);
        p.sMid = -r.rangeFloat(1, 2) * dscale;
    }
    if (fanFamily) {
        drawFan(pen, anchor, u, n, p, metal, 1);
        if (doubleSide)
            drawFan(pen, anchor, u, n, p, metal, -1);
    }
    else if (head === "warpick") {
        // A long forward pick spike instead of a bit, angled slightly down (a
        // raven's beak), plus a solid poll block behind.
        const pickLen = r.rangeFloat(11, 13) * dscale;
        const dir = norm(n.x - u.x * 0.18, n.y - u.y * 0.18);
        pen.fillCone(anchor.x, anchor.y, dir.x, dir.y, 0, pickLen, r.rangeFloat(2.8, 3.3) * dscale, metal.light, metal.shadow);
        drawBlock(pen, anchor, u, n, r.rangeFloat(3.0, 3.5) * dscale, r.rangeFloat(3.4, 4.2) * dscale, metal, -1);
    }
    else if (head === "hammer") {
        // A double-faced maul: a big striking block outward and a shorter poll
        // behind, so the head reads as one heavy rectangle through the haft.
        drawBlock(pen, anchor, u, n, r.rangeFloat(4.0, 4.6) * dscale, r.rangeFloat(7, 8) * dscale, metal, 1);
        drawBlock(pen, anchor, u, n, r.rangeFloat(3.2, 3.6) * dscale, r.rangeFloat(3.5, 4.2) * dscale, metal, -1);
    }
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
    // -- back fitting opposite the bit (single-bit heads only; warpick/hammer
    // carry their own poll, double/crescent have no "back") ---------------------
    if (!doubleSide && head !== "crescent" && head !== "warpick" && head !== "hammer" && back !== "none") {
        if (back === "spike") {
            pen.fillCone(anchor.x, anchor.y, -n.x, -n.y, 0, r.rangeFloat(3.5, 5.5) * dscale, 2.4 * dscale, metal.light, metal.shadow);
        }
        else if (back === "pick") {
            // Longer, thinner, angled slightly down — a raven's-beak war pick.
            const dir = norm(-n.x - u.x * 0.35, -n.y - u.y * 0.35);
            pen.fillCone(anchor.x, anchor.y, dir.x, dir.y, 0, r.rangeFloat(5.5, 7) * dscale, 1.5 * dscale, metal.light, metal.shadow);
        }
        else if (back === "hammer") {
            drawBlock(pen, anchor, u, n, r.rangeFloat(2.2, 2.6) * dscale, r.rangeFloat(2.8, 3.4) * dscale, metal, -1);
        }
        else if (back === "hook") {
            // A down-curved hook: two joined cones bending toward the hilt.
            const dir1 = norm(-n.x - u.x * 0.15, -n.y - u.y * 0.15);
            const elbowLen = r.rangeFloat(2.6, 3.2) * dscale;
            const ex = anchor.x + dir1.x * elbowLen;
            const ey = anchor.y + dir1.y * elbowLen;
            const dir2 = norm(-n.x - u.x * 1.2, -n.y - u.y * 1.2);
            pen.fillCone(anchor.x, anchor.y, dir1.x, dir1.y, 0, elbowLen + 1, 1.6 * dscale, metal.light, metal.shadow);
            pen.fillCone(ex, ey, dir2.x, dir2.y, 0, r.rangeFloat(3, 4) * dscale, 1.3 * dscale, metal.light, metal.shadow);
        }
    }
    // -- decoration --------------------------------------------------------------
    let gem = null;
    if (deco === "gem") {
        const gm = pickGem(r);
        gem = gm;
        const gc = new Vector(anchor.x + n.x * 1.5, anchor.y + n.y * 1.5);
        pen.drawRoundOrnamentHelper({ center: gc, radius: Math.max(1.2, 1.4 * dscale), colorLight: gm.light, colorDark: gm.shadow });
    }
    else if (deco === "rivets") {
        // Dark bolt studs where the bit is forged to the socket.
        const nR = r.float() < 0.5 ? 2 : 3;
        for (let i = 0; i < nR; i++) {
            const off = (1.6 + i * 2.2) * dscale;
            const rc = new Vector(anchor.x + n.x * off, anchor.y + n.y * off);
            pen.drawRoundOrnamentHelper({ center: rc, radius: Math.max(0.8, 0.6 * dscale), colorLight: DARK.mid, colorDark: DARK.shadow });
        }
    }
    else if (deco === "thongs") {
        // Hanging leather thongs from the head socket — short, stubby strips.
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
    else if (deco === "inlay") {
        // Enamel inlay band: a stripe of accent colour across the bit face.
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
    else if (deco === "runes") {
        // Small glowing glyphs stamped across the bit face.
        const rune = pickCrystal(r);
        const runeStr = colorStr(rune.light);
        const dimStr = colorStr(rune.mid);
        const d0 = (fanFamily ? p.depth * 0.45 : 2.5 * dscale);
        for (let i = 0; i < 3; i++) {
            const s0 = (i - 1) * 2.8 * dscale + (doubleSide ? 0 : -1 * dscale);
            const x = Math.round(anchor.x + u.x * s0 + n.x * d0);
            const y = Math.round(anchor.y + u.y * s0 + n.y * d0);
            if (x < 1 || y < 1 || x >= bounds.w - 1 || y >= bounds.h - 1)
                continue;
            if (pen.ctx.getImageData(x, y, 1, 1).data[3] === 0)
                continue;
            pen.ctx.fillStyle = i % 2 === 0 ? runeStr : dimStr;
            pen.drawPixel(x, y);
            if (i % 2 === 0) {
                pen.drawPixel(x + 1, y);
                pen.drawPixel(x, y - 1);
            }
            else {
                pen.drawPixel(x - 1, y);
                pen.drawPixel(x, y + 1);
            }
        }
    }
    else if (deco === "ferrule") {
        // Mid-haft accent ferrule: a bright metal band girdling the shaft.
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
    else if (deco === "wrap") {
        // Haft wrap: a few dark leather bands across the shaft.
        drawHaftWrap(pen, bounds, u, n, dscale, r, anchorDiag);
    }
    // -- butt of the haft --------------------------------------------------------
    if (butt === "ring") {
        drawEndRing(pen, bounds, dscale, accent.mid, accent.shadow);
    }
    else if (butt === "cap") {
        const pr = Math.ceil((0.6 + r.floatLow() * 0.7) * dscale);
        pen.drawRoundOrnamentHelper({ center: new Vector(Math.floor(pr), Math.ceil(bounds.h - pr - 1)), radius: pr, colorLight: accent.light, colorDark: accent.shadow });
    }
    else if (butt === "spike") {
        const bu = new Vector(1, -1).normalize();
        pen.fillCone(0, bounds.h - 1, -bu.x, -bu.y, 0, r.rangeFloat(3, 4.5) * dscale, Math.max(1, 1.1 * dscale), accent.light, accent.shadow);
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
 * A rectangular block head in the (s = along haft, d = outward·sign) frame —
 * a hammer poll / maul face. Bright striking face at the outer end, darker
 * toward the socket, beveled top/bottom edges.
 */
function drawBlock(pen, anchor, u, n, sHalf, depth, metal, sign) {
    const B = pen.dimension;
    for (let x = 0; x < B; x++) {
        for (let y = 0; y < B; y++) {
            const px = x - anchor.x;
            const py = y - anchor.y;
            const s = px * u.x + py * u.y;
            const d = (px * n.x + py * n.y) * sign;
            if (d < 0 || d > depth)
                continue;
            if (Math.abs(s) > sHalf)
                continue;
            const lat = Math.abs(s) / sHalf;
            const out = d / depth;
            let shade = 0.3 + 0.45 * out - 0.3 * Math.pow(lat, 2);
            if (out > 0.82)
                shade += 0.35; // bright striking face
            if (s > sHalf * 0.6)
                shade -= 0.18; // shadowed lower edge
            shade = Math.max(0, Math.min(1, shade));
            pen.ctx.fillStyle = colorStr(out > 0.94 && lat < 0.5 ? metal.spec : colorLerp(metal.shadow, metal.light, shade));
            pen.drawPixel(x, y);
        }
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
            let shade = 0.08 + 0.5 * flare;
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
