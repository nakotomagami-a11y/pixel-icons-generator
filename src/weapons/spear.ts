import type { Pen, BladeStyle } from "../pen";
import type { Color } from "../types";
import type { SpearHead as HeadKey, SpearCollar, SpearButt, SpearDecoration, SpearParts } from "../types";
import { Vector, Bounds, diagToPosition } from "../math";
import { Rng } from "../rng";
import { colorStr, colorDarken, colorLerp } from "../color";
import { GOLD, WOOD, DARK, pickPoleHead, pickCrystal, pickGem, RIBBONS, FIRE_TEMPERED } from "../palette";

/**
 * Mix-and-match polearm, layer by layer: a long haft along the bottom-left→
 * top-right diagonal, topped by one of twelve head types, with an explicit
 * COLLAR at the socket (ferrule / langets / gem / ring / lugs…), a BUTT
 * fitting at the bottom end, and a DECORATION hung on the upper shaft
 * (ribbons / pennant / tassel / rings / feathers…). Every layer is an
 * independent pick so the dropdowns compose.
 */

interface HeadCfg {
  len: [number, number]; // head length along the diagonal (base px)
  radius: [number, number]; // head half-width (base px)
  taper: number;
  winged?: boolean; // boar-spear lugs at the base
  harpoon?: boolean; // backward barbs
  prongs?: boolean; // partisan/ranseur: two forward side blades flanking the head
  forked?: boolean; // the head splits into a two-pronged fork
  crescent?: boolean; // a moon blade cradling the tip
  crystal?: boolean; // a floating faceted shard instead of a steel head
  fire?: boolean; // fire-tempered ramp (flame head)
  style: (r: Rng) => BladeStyle;
}

const HEADS: Record<HeadKey, HeadCfg> = {
  // Spearheads taper to a POINT — high taperFactor, or they read as blunt paddles.
  leaf: { len: [15, 19], radius: [1.4, 1.9], taper: 0.52, style: () => ({ widthAmp: 0, bulge: 0.4 }) },
  broadleaf: { len: [15, 18], radius: [1.9, 2.4], taper: 0.52, style: () => ({ widthAmp: 0, bulge: 0.32, fuller: true }) },
  pike: { len: [10, 13], radius: [1.1, 1.5], taper: 0.62, style: () => ({ widthAmp: 0 }) },
  winged: { len: [14, 18], radius: [1.4, 1.9], taper: 0.52, winged: true, style: () => ({ widthAmp: 0, bulge: 0.3 }) },
  glaive: { len: [16, 21], radius: [2.0, 2.8], taper: 0.34, style: () => ({ widthAmp: 0, curve: Math.PI / 80, curveDir: 1, singleEdge: true, maxTurn: Math.PI / 2.6, clip: 0.16 }) },
  harpoon: { len: [14, 18], radius: [1.3, 1.8], taper: 0.48, harpoon: true, style: () => ({ widthAmp: 0, singleEdge: true }) },
  needle: { len: [16, 21], radius: [0.8, 1.2], taper: 0.14, style: () => ({ widthAmp: 0, fuller: true }) },
  partisan: { len: [14, 18], radius: [1.5, 2.0], taper: 0.5, prongs: true, style: () => ({ widthAmp: 0, bulge: 0.2 }) },
  forked: { len: [12, 15], radius: [1.1, 1.5], taper: 0.5, forked: true, style: () => ({ widthAmp: 0 }) },
  // Fantasy heads. Flame uses a brightened slice of the fire ramp — the full
  // ramp's near-black base reads as a charred blob on a head this small.
  flame: { len: [15, 18], radius: [1.5, 2.0], taper: 0.42, fire: true, style: () => ({ widthAmp: 0, wave: 0.26, waveLen: 5, bulge: 0.25, metal: { shadow: FIRE_TEMPERED.mid, mid: FIRE_TEMPERED.mid, light: FIRE_TEMPERED.light, spec: FIRE_TEMPERED.spec } }) },
  crescent: { len: [12, 15], radius: [1.1, 1.5], taper: 0.55, crescent: true, style: () => ({ widthAmp: 0 }) },
  crystal: { len: [13, 17], radius: [1.4, 1.9], taper: 0.5, crystal: true, style: () => ({ widthAmp: 0 }) },
};
const HEAD_KEYS: HeadKey[] = [
  "leaf", "leaf", "pike", "broadleaf", "winged", "glaive", "glaive",
  "harpoon", "needle", "partisan", "forked", "flame", "crescent", "crystal",
];
const COLLARS: SpearCollar[] = ["none", "ferrule", "ferrule", "ferrule", "banded", "langets", "gem", "ring", "winged", "spiked"];
const BUTTS: SpearButt[] = ["none", "cap", "cap", "spike", "ball", "ring"];
const DECORATIONS: SpearDecoration[] = ["none", "none", "none", "ribbons", "ribbons", "pennant", "tassel", "wrap", "wrap", "gem", "rings", "feathers"];

const pick = <T,>(r: Rng, arr: T[]): T => arr[Math.floor(r.float() * arr.length) % arr.length]!;
const rf = (r: Rng, lo: number, hi: number) => r.rangeFloat(lo, hi);
const norm = (x: number, y: number) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };

/** One of a few ribbon looks: straight, fluttering wave, twisting fold, or a
 *  forked swallowtail. Shared by spear + trident. */
export function ribbonStyle(r: Rng, dscale: number): { wave?: number; waveLen?: number; taper?: boolean; twist?: boolean; swallowtail?: boolean } {
  const kind = r.float();
  if (kind < 0.28) return { taper: true, twist: true }; // near-straight, folded
  if (kind < 0.62) return { wave: r.rangeFloat(1.6, 3) * dscale, waveLen: r.rangeFloat(5, 8) * dscale, taper: true, twist: true }; // fluttering
  if (kind < 0.82) return { wave: r.rangeFloat(1.2, 2.2) * dscale, waveLen: r.rangeFloat(5, 7) * dscale, taper: false, twist: true, swallowtail: true }; // swallowtail banner
  return { wave: r.rangeFloat(2.4, 3.8) * dscale, waveLen: r.rangeFloat(4, 6) * dscale, taper: true, twist: true }; // strong flutter
}

export function drawSpear(pen: Pen, parts?: SpearParts): void {
  pen.rng.checkpoint();
  const r = pen.rng;

  const bounds = new Bounds(0, 0, pen.dimension, pen.dimension);
  const canvasDiag = Math.hypot(bounds.w, bounds.h);
  const dscale = bounds.h / 32;

  pen.clearCanvas();

  const headKey: HeadKey = parts?.head && parts.head in HEADS ? parts.head : pick(r, HEAD_KEYS);
  const cfg = HEADS[headKey]!;
  const collar: SpearCollar = parts?.collar && COLLARS.includes(parts.collar) ? parts.collar : pick(r, COLLARS);
  const butt: SpearButt = parts?.butt && BUTTS.includes(parts.butt) ? parts.butt : pick(r, BUTTS);
  const deco: SpearDecoration = parts?.decoration && DECORATIONS.includes(parts.decoration) ? parts.decoration : pick(r, DECORATIONS);

  const headLen = rf(r, cfg.len[0], cfg.len[1]) * dscale;
  const startRadius = Math.max(1, Math.ceil(rf(r, cfg.radius[0], cfg.radius[1]) * dscale));
  const tipStartDiag = canvasDiag - headLen;

  const u = new Vector(1, -1).normalize(); // toward the head (top-right)
  const n = new Vector(-1, -1).normalize(); // outward (top-left)

  // Haft first, head drawn over it.
  const haftColor = r.float() < 0.7 ? WOOD.mid : DARK.mid;
  const haftR = Math.max(1, rf(r, 1.2, 1.8) * dscale);
  pen.drawHaftHelper({ startDiag: 0, lengthDiag: tipStartDiag + 2 * dscale, maxRadius: haftR, fractionalRadiusAllowed: true, color: haftColor });

  const headStyle = cfg.style(r);
  if (!cfg.fire && !cfg.crystal && r.float() < 0.1) headStyle.metal = pickCrystal(r); // ~10% enchanted head

  let tipColors: { tipColor: Color; hiltColor: Color; startOrtho: number };
  const base = diagToPosition(tipStartDiag, bounds);

  if (cfg.crystal) {
    // A floating faceted shard: an elongated diamond hovering just off the
    // shaft top, in a vivid crystal ramp — no steel socket at all.
    const crys = pickCrystal(r);
    const gap = 1.5 * dscale;
    const shardBase = diagToPosition(tipStartDiag + gap * Math.SQRT2, bounds);
    const shardLen = headLen - gap * 2;
    const half = startRadius * 1.25;
    // Two cones base-to-base → a stretched rhombus shard.
    const waist = 0.4; // fraction of length where the widest point sits
    pen.fillCone(shardBase.x + u.x * shardLen * waist, shardBase.y + u.y * shardLen * waist, u.x, u.y, 0, shardLen * (1 - waist), half, crys.light, crys.shadow);
    pen.fillCone(shardBase.x + u.x * shardLen * waist, shardBase.y + u.y * shardLen * waist, -u.x, -u.y, 0, shardLen * waist, half, crys.mid, crys.shadow);
    tipColors = { tipColor: crys.light, hiltColor: crys.mid, startOrtho: Math.floor(tipStartDiag / Math.SQRT2) };
  } else {
    const tip = pen.drawBladeHelper({
      startDiag: tipStartDiag,
      taperFactor: cfg.taper + rf(r, -0.03, 0.03),
      startRadius,
      style: headStyle,
    });
    tipColors = tip;
  }

  // Partisan/ranseur: two forward-and-out side blades flanking the central head.
  if (cfg.prongs) {
    const dirA = norm(u.x * 1.1 + n.x, u.y * 1.1 + n.y);
    const dirB = norm(u.x * 1.1 - n.x, u.y * 1.1 - n.y);
    const len = rf(r, 6, 8) * dscale;
    const half = Math.max(1.3, 1.2 * dscale);
    const off = startRadius * 0.4;
    pen.fillCone(base.x, base.y, dirA.x, dirA.y, off, len, half, tipColors.tipColor, tipColors.hiltColor);
    pen.fillCone(base.x, base.y, dirB.x, dirB.y, off, len, half, tipColors.tipColor, tipColors.hiltColor);
  }

  // Forked head: two clear symmetric tines diverging from the socket.
  if (cfg.forked) {
    for (const sgn of [1, -1]) {
      const dir = norm(u.x + n.x * 0.3 * sgn, u.y + n.y * 0.3 * sgn);
      pen.fillCone(base.x, base.y, dir.x, dir.y, 1 * dscale, headLen * 0.9, Math.max(1.1, startRadius * 0.95), tipColors.tipColor, tipColors.hiltColor);
    }
  }

  // Crescent: a moon blade cradling the central point — an arc opening
  // toward the tip, sitting at the head's base.
  if (cfg.crescent) {
    const metal = headStyle.metal ?? (r.float() < 0.4 ? GOLD : pickPoleHead(r));
    const arcC = diagToPosition(tipStartDiag + headLen * 0.2, bounds);
    const rad = rf(r, 5.2, 6.4) * dscale;
    const thick = Math.max(1.8, 2.0 * dscale);
    const lit = colorStr(metal.light);
    const dk = colorStr(metal.shadow);
    // Angular window: centred on the up-right axis (-π/4), opening ±~1.25 rad.
    for (let x = Math.floor(arcC.x - rad - 1); x <= Math.ceil(arcC.x + rad + 1); x++) {
      for (let y = Math.floor(arcC.y - rad - 1); y <= Math.ceil(arcC.y + rad + 1); y++) {
        if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h) continue;
        const d = Math.hypot(x - arcC.x, y - arcC.y);
        if (d < rad - thick || d > rad) continue;
        let ang = Math.atan2(y - arcC.y, x - arcC.x) + Math.PI / 4; // 0 = up-right
        while (ang > Math.PI) ang -= Math.PI * 2;
        while (ang < -Math.PI) ang += Math.PI * 2;
        if (Math.abs(ang) > 1.3) continue;
        pen.ctx.fillStyle = ang < 0 ? lit : dk;
        pen.drawPixel(x, y);
      }
    }
  }

  // Winged lugs: two short back-swept prongs at the head's base.
  if (cfg.winged) {
    const dirA = norm(-u.x + n.x, -u.y + n.y);
    const dirB = norm(-u.x - n.x, -u.y - n.y);
    const len = rf(r, 3.5, 5) * dscale;
    const half = Math.max(1.3, 1.2 * dscale);
    pen.fillCone(base.x, base.y, dirA.x, dirA.y, 0, len, half, tipColors.tipColor, tipColors.hiltColor);
    pen.fillCone(base.x, base.y, dirB.x, dirB.y, 0, len, half, tipColors.tipColor, tipColors.hiltColor);
  }

  // Harpoon barbs: two bold back-swept hooks near the tip (a real harpoon has
  // one or two big barbs, not a comb of little ones).
  if (cfg.harpoon) {
    const back = { x: -u.x, y: -u.y };
    const dirA = norm(back.x + n.x * 1.2, back.y + n.y * 1.2);
    const dirB = norm(back.x - n.x * 1.2, back.y - n.y * 1.2);
    const nBarb = 2;
    for (let i = 0; i < nBarb; i++) {
      const o = tipColors.startOrtho + Math.round((3 + i * 4.5) * dscale);
      const cx = o, cy = pen.dimension - 1 - o;
      pen.fillCone(cx, cy, dirA.x, dirA.y, startRadius * 0.5, 3.4 * dscale, Math.max(1.5, 1.4 * dscale), tipColors.tipColor, tipColors.hiltColor);
      pen.fillCone(cx, cy, dirB.x, dirB.y, startRadius * 0.5, 3.4 * dscale, Math.max(1.5, 1.4 * dscale), tipColors.tipColor, tipColors.hiltColor);
    }
  }

  // -- collar: the socket fitting where head meets shaft ----------------------
  const collarMetal = r.float() < 0.5 ? GOLD : pickPoleHead(r);
  if (collar === "ferrule") {
    drawCollar(pen, bounds, u, n, base.x, base.y, haftR + 1.2 * dscale, Math.max(0.8, 0.8 * dscale), collarMetal.light, collarMetal.shadow);
  } else if (collar === "banded") {
    // Three tight thin bands stacked down from the socket.
    for (let i = 0; i < 3; i++) {
      const c = diagToPosition(tipStartDiag - (1.4 + i * 2.2) * dscale * Math.SQRT2 * 0.5, bounds);
      drawCollar(pen, bounds, u, n, c.x, c.y, haftR + 0.8 * dscale, Math.max(0.6, 0.5 * dscale), collarMetal.light, collarMetal.shadow);
    }
  } else if (collar === "langets") {
    // Two thin metal reinforcing straps running down the shaft from the socket.
    const litStr = colorStr(collarMetal.mid);
    const len = rf(r, 5, 8) * dscale;
    for (const sgn of [1, -1]) {
      for (let l = 0; l < len; l += 0.5) {
        const cx = base.x - u.x * l + n.x * (haftR - 0.2) * sgn;
        const cy = base.y - u.y * l + n.y * (haftR - 0.2) * sgn;
        const x = Math.round(cx), y = Math.round(cy);
        if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h) continue;
        if (pen.ctx.getImageData(x, y, 1, 1).data[3]! === 0) continue; // only over the haft
        pen.ctx.fillStyle = litStr;
        pen.drawPixel(x, y);
      }
    }
    drawCollar(pen, bounds, u, n, base.x, base.y, haftR + 0.9 * dscale, Math.max(0.7, 0.7 * dscale), collarMetal.light, collarMetal.shadow);
  } else if (collar === "gem") {
    const gm = pickGem(r);
    const gc = new Vector(tipColors.startOrtho + u.x * 2 * dscale, pen.dimension - 1 - tipColors.startOrtho + u.y * 2 * dscale);
    pen.drawRoundOrnamentHelper({ center: gc, radius: Math.max(1.2, 1.2 * dscale), colorLight: gm.light, colorDark: gm.shadow });
  } else if (collar === "ring") {
    // An open ring hugging the socket — bigger than a ferrule band, with a
    // visible hole on each side of the shaft.
    const ringR = haftR + 1.8 * dscale;
    pen.drawRoundOrnamentHelper({ center: new Vector(base.x, base.y), radius: ringR, holeRadius: ringR * 0.55, colorLight: collarMetal.light, colorDark: collarMetal.shadow });
  } else if (collar === "winged") {
    // Small forward lugs off the socket (subtler than the winged HEAD's).
    for (const sgn of [1, -1]) {
      const dir = norm(u.x * 0.5 + n.x * sgn, u.y * 0.5 + n.y * sgn);
      pen.fillCone(base.x, base.y, dir.x, dir.y, haftR * 0.4, 2.6 * dscale, Math.max(1.1, 1.0 * dscale), collarMetal.light, collarMetal.shadow);
    }
  } else if (collar === "spiked") {
    // Two short downward spurs off the socket.
    for (const sgn of [1, -1]) {
      const dir = norm(-u.x * 0.8 + n.x * sgn, -u.y * 0.8 + n.y * sgn);
      pen.fillCone(base.x, base.y, dir.x, dir.y, haftR * 0.4, 3.2 * dscale, Math.max(1.0, 0.9 * dscale), collarMetal.light, collarMetal.shadow);
    }
  }

  // -- decoration: ornament hung on the upper shaft ---------------------------
  if (deco === "ribbons") {
    const cloth = pick(r, RIBBONS);
    const opts = ribbonStyle(r, dscale);
    const nRib = r.range(2, 4);
    const rootO = tipColors.startOrtho - Math.round(1 * dscale);
    for (let i = 0; i < nRib; i++) {
      const side = (i - (nRib - 1) / 2) * 0.75;
      const dir = norm(-u.x + n.x * side, -u.y + n.y * side);
      pen.drawRibbon(rootO, pen.dimension - 1 - rootO, dir.x, dir.y, rf(r, 5, 8) * dscale, Math.max(1.6, 1.7 * dscale), cloth, opts);
    }
  } else if (deco === "pennant") {
    // A broad triangular banner pointing OUT from the upper shaft.
    const cloth = pick(r, RIBBONS);
    const rootDiag = tipStartDiag - rf(r, 2, 5) * dscale;
    const rp = diagToPosition(rootDiag, bounds);
    const dir = norm(n.x - u.x * 0.35, n.y - u.y * 0.35);
    pen.drawRibbon(rp.x, rp.y, dir.x, dir.y, rf(r, 7, 10) * dscale, rf(r, 3.2, 4.4) * dscale, cloth, { wave: 1.2 * dscale, waveLen: 7 * dscale, taper: true, twist: true });
  } else if (deco === "tassel") {
    // A hanging tassel: a small metal mount + a bundle of straight strands.
    const cloth = pick(r, RIBBONS);
    const rootO = tipColors.startOrtho - Math.round(1 * dscale);
    const rootX = rootO, rootY = pen.dimension - 1 - rootO;
    pen.drawRoundOrnamentHelper({ center: new Vector(rootX, rootY), radius: Math.max(1, 0.9 * dscale), colorLight: GOLD.light, colorDark: GOLD.shadow });
    const nStrand = 3;
    for (let i = 0; i < nStrand; i++) {
      const side = (i - (nStrand - 1) / 2) * 0.35;
      const dir = norm(-u.x * 0.4 + n.x * (1 + side), -u.y * 0.4 + n.y * (1 + side));
      pen.fillCone(rootX, rootY, dir.x, dir.y, 0.8 * dscale, rf(r, 3.5, 5) * dscale, Math.max(0.8, 0.7 * dscale), cloth.mid, cloth.shadow);
    }
  } else if (deco === "wrap") {
    const bands = r.range(2, 5);
    const dark = colorStr(colorDarken(WOOD.shadow, 0.2));
    for (let i = 0; i < bands; i++) {
      const diag = tipStartDiag * (0.2 + 0.55 * (i / Math.max(1, bands)));
      const c = diagToPosition(diag, bounds);
      drawBand(pen, bounds, n, c.x, c.y, haftR + 0.6 * dscale, dark);
    }
  } else if (deco === "gem") {
    const gm = pickGem(r);
    const gc = new Vector(tipColors.startOrtho + u.x * 2 * dscale, pen.dimension - 1 - tipColors.startOrtho + u.y * 2 * dscale);
    pen.drawRoundOrnamentHelper({ center: gc, radius: Math.max(1, 1 * dscale), colorLight: gm.light, colorDark: gm.shadow });
  } else if (deco === "rings") {
    // 2–3 bright metal rings girdling the shaft's middle.
    const nRing = r.float() < 0.5 ? 2 : 3;
    for (let i = 0; i < nRing; i++) {
      const diag = tipStartDiag * (0.35 + 0.18 * i);
      const c = diagToPosition(diag, bounds);
      drawCollar(pen, bounds, u, n, c.x, c.y, haftR + 0.9 * dscale, Math.max(0.7, 0.6 * dscale), collarMetal.light, collarMetal.shadow);
    }
  } else if (deco === "feathers") {
    // Paired fletching-feathers hanging off the socket: elongated soft cones
    // with a lighter inner stripe.
    const cloth = pick(r, RIBBONS);
    const rootO = tipColors.startOrtho - Math.round(0.5 * dscale);
    const rootX = rootO, rootY = pen.dimension - 1 - rootO;
    for (const sgn of [1, -1]) {
      const dir = norm(-u.x * 0.7 + n.x * sgn * 0.9, -u.y * 0.7 + n.y * sgn * 0.9);
      pen.fillCone(rootX, rootY, dir.x, dir.y, 1 * dscale, rf(r, 4.5, 6) * dscale, Math.max(1.3, 1.2 * dscale), cloth.light, cloth.shadow);
    }
  }

  // -- butt fitting ------------------------------------------------------------
  const accent = r.float() < 0.5 ? GOLD : pickPoleHead(r);
  if (butt === "cap") {
    const pr = Math.max(1, haftR + 0.4 * dscale);
    pen.drawRoundOrnamentHelper({ center: new Vector(Math.floor(pr), Math.ceil(bounds.h - pr - 1)), radius: Math.max(1, haftR * 0.85), colorLight: accent.light, colorDark: accent.shadow });
  } else if (butt === "spike") {
    pen.fillCone(0, bounds.h - 1, -u.x, -u.y, 0, rf(r, 3, 5) * dscale, Math.max(1, haftR * 0.9), accent.light, accent.shadow);
  } else if (butt === "ball") {
    const pr = Math.max(1.2, haftR + 0.3 * dscale);
    pen.drawRoundOrnamentHelper({ center: new Vector(Math.floor(pr) + 1, Math.ceil(bounds.h - pr - 2)), radius: pr, colorLight: accent.light, colorDark: accent.shadow });
  } else if (butt === "ring") {
    const rad = haftR + 1.4 * dscale;
    const c = new Vector(rad + 1, bounds.h - 1 - rad - 1);
    pen.drawRoundOrnamentHelper({ center: c, radius: rad, holeRadius: rad * 0.55, colorLight: accent.light, colorDark: accent.shadow });
  }

  pen.weather(r.floatLow() * 0.8);
  pen.addBorder();

  // Crystal shard glow, over the outline so it reads as light.
  if (cfg.crystal) {
    const gc = diagToPosition(tipStartDiag + headLen * 0.5, bounds);
    pen.drawGlow(new Vector(gc.x, gc.y), 3.4 * dscale, tipColors.tipColor);
  }
}

/** A metal collar hugging the shaft (perpendicular band, a couple px deep). */
function drawCollar(pen: Pen, bounds: Bounds, u: Vector, n: Vector, cx: number, cy: number, halfW: number, halfDeep: number, light: Color, dark: Color): void {
  const litStr = colorStr(light);
  const darkStr = colorStr(dark);
  for (let t = -halfW; t <= halfW; t += 0.5) {
    for (let uu = -halfDeep; uu <= halfDeep; uu += 0.5) {
      const x = Math.round(cx + n.x * t + u.x * uu);
      const y = Math.round(cy + n.y * t + u.y * uu);
      if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h) continue;
      pen.ctx.fillStyle = t > halfW * 0.35 ? darkStr : litStr;
      pen.drawPixel(x, y);
    }
  }
}

/** A thin dark leather band across the shaft (painted only over existing haft). */
function drawBand(pen: Pen, bounds: Bounds, n: Vector, cx: number, cy: number, halfW: number, colorStrDark: string): void {
  for (let t = -halfW; t <= halfW; t += 0.5) {
    const x = Math.round(cx + n.x * t);
    const y = Math.round(cy + n.y * t);
    if (x < 0 || y < 0 || x >= bounds.w || y >= bounds.h) continue;
    if (pen.ctx.getImageData(x, y, 1, 1).data[3]! === 0) continue;
    pen.ctx.fillStyle = colorStrDark;
    pen.drawPixel(x, y);
  }
}

// colorLerp is referenced by future decorations; keep the import warm.
void colorLerp;
