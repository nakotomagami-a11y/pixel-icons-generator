import type { Pen, BladeStyle, CrossguardParams, CrossguardResults, OrnamentParams } from "../pen";
import type { Rng } from "../rng";
import type { BladeProfile, BladeGuard as Guard, BladePommel as Pommel, BladeModification, BladeParts, Color } from "../types";
import { Vector, Bounds, diagToPosition } from "../math";
import { pickGem, pickCrystal, pickGuardAccent } from "../palette";
import { colorLerp, colorStr } from "../color";

/**
 * Mix-and-match sword: a blade profile, a guard, a grip and a pommel are each
 * picked (mostly) independently so the same generator yields knightly swords,
 * cleavers, rapiers and flamberges with a variety of hilts — the
 * "copy blades + handles and mix them" brief, done procedurally rather than
 * by copying the reference sheet's pixels.
 */

interface Profile {
  radius: [number, number]; // blade half-width range (base px)
  taper: number; // 0 = blunt tip, →1 = needle
  hilt: [number, number]; // grip length range (base px)
  wide?: boolean; // broad base → force a guard so it doesn't sit on the pommel
  barbed?: boolean; // thorn spikes down both sides of the blade
  guardPool?: Guard[]; // restrict the random guard pick to these (e.g. a rapier needs its ornate hand-guard)
  makeStyle?: (r: Rng) => BladeStyle;
}

const PROFILES: Record<BladeProfile, Profile> = {
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
  katana: { radius: [2, 2], taper: 0.14, hilt: [8, 12], makeStyle: () => ({ widthAmp: 0, fuller: true }) },
  dagger: { radius: [3, 3], taper: 0.3, hilt: [5, 7], makeStyle: () => ({ widthAmp: 0, clip: 0.22, singleEdge: true }) },
  barbed: { radius: [2, 3], taper: 0.2, hilt: [6, 9], barbed: true, makeStyle: () => ({ widthAmp: 0 }) },
};
const PROFILE_KEYS = Object.keys(PROFILES) as BladeProfile[];

const GUARDS: Guard[] = ["bar", "bar", "swept", "wings", "disc", "none"];
// Weighted so a random roll actually shows off the variety — historically
// wider styles (wheel/ring/flanged/crown) get the same weight as the plain
// round knob; "none" (bare capped grip) is kept as a rarer, deliberate look
// rather than the majority outcome it used to be.
const POMMELS: Pommel[] = [
  "round", "round", "gem", "faceted", "wheel", "ring", "trefoil",
  "acorn", "scentstopper", "spike", "flanged", "crown", "birdhead", "none",
];

// A base of one-off flourishes for the plain arming-sword shape — currently
// knight-only (see `BladeParts.modification`'s doc comment). "none" is
// weighted 2x so most random rolls stay a clean blade; the flourish is a
// deliberate pick, not the common case.
const MODIFICATIONS: BladeModification[] = ["none", "none", "serrated", "notched", "fullered", "riveted", "wavy"];

/** Merge a modification's style deltas onto the profile's base style. Only
 *  the shape-affecting knobs `drawBladeHelper` already understands — no new
 *  rendering primitives needed. `dscale` scales `serrate`/`serratePeriod`
 *  ourselves — unlike `waveLen` (scaled internally by `drawBladeHelper`),
 *  serrations are applied in raw render pixels, so left unscaled they shrink
 *  to invisible on larger icons. */
function applyModification(style: BladeStyle, mod: BladeModification, dscale: number): void {
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
      // Gentler than the dedicated `flamberge` profile's wave (0.22/8) — this
      // is a knight blade with a hint of ripple, not a full kris. `wave` is a
      // radian amplitude (scale-invariant by design); `waveLen` gets *dscale
      // internally, same as `flamberge`'s unscaled 8.
      style.wave = 0.16;
      style.waveLen = 7;
      break;
    case "riveted":
    case "none":
      break; // riveted is a post-draw stamp, see drawBlade
  }
}

const pick = <T,>(r: Rng, arr: T[]): T => arr[Math.floor(r.float() * arr.length) % arr.length]!;
const rangeIncl = (r: Rng, lo: number, hi: number) => r.range(lo, hi + 1);
const norm = (x: number, y: number) => { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; };
const rotate = (v: { x: number; y: number }, a: number) => ({
  x: v.x * Math.cos(a) - v.y * Math.sin(a),
  y: v.x * Math.sin(a) + v.y * Math.cos(a),
});

/** Small diamond/rhombus mark — same light-to-dark falloff as
 *  `drawRoundOrnamentHelper` but Manhattan distance, so a faceted gem reads
 *  as a cut stone rather than a ball. Local to the blade pommel (not a `Pen`
 *  method) since it's the only caller. */
function drawFacetedGem(pen: Pen, center: Vector, radius: number, light: Color, dark: Color): void {
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

export function drawBlade(pen: Pen, parts?: BladeParts): void {
  pen.rng.checkpoint();
  const r = pen.rng;

  const bounds = new Bounds(0, 0, pen.dimension, pen.dimension);
  const dscale = bounds.h / 32;

  pen.clearCanvas();

  // A persisted skill config can name a profile that's since been removed or
  // renamed (e.g. an old "saber"/"estoc" pick) — fall back to a random pick
  // rather than crash on `PROFILES[undefined]`.
  const requestedProfile = parts?.profile && parts.profile in PROFILES ? parts.profile : undefined;
  const profileKey = requestedProfile ?? pick(r, PROFILE_KEYS);
  const prof = PROFILES[profileKey];
  const style = prof.makeStyle?.(r) ?? {};
  // ~12% of blades are an enchanted crystal (colour variety).
  if (r.float() < 0.12) style.metal = pickCrystal(r);
  // Modification is currently knight-only (see `BladeParts.modification`'s
  // doc comment) — other profiles already carry a strong shape identity of
  // their own, so a random pick still rolls even if a stale/foreign value is
  // set (e.g. leftover from switching Profile away from Knight in the UI).
  const modification: BladeModification =
    profileKey === "knight"
      ? (parts?.modification && MODIFICATIONS.includes(parts.modification) ? parts.modification : pick(r, MODIFICATIONS))
      : "none";
  applyModification(style, modification, dscale);
  let guard = parts?.guard ?? pick(r, prof.guardPool ?? GUARDS);
  // A broad blade's base overlaps the grip; without a crossguard it reads as a
  // slab sitting straight on the pommel. Force a real guard for wide profiles
  // — even over an explicit "none"/"disc" pick, since that's a rendering
  // artifact (slab-on-pommel), not a style choice worth honouring.
  if (prof.wide && (guard === "none" || guard === "disc")) guard = "bar";
  const pommel = parts?.pommel ?? pick(r, POMMELS);
  const twoHanded = parts?.twoHanded ?? r.float() < 0.22;

  const startRadius = Math.ceil(rangeIncl(r, prof.radius[0], prof.radius[1]) * dscale);
  const pommelLength = pommel === "none" ? 0 : Math.ceil((0.5 + r.floatLow() * 0.9) * dscale);
  const rawHiltLength =
    Math.ceil(rangeIncl(r, prof.hilt[0], prof.hilt[1]) * dscale) +
    (twoHanded ? Math.ceil(rangeIncl(r, 3, 6) * dscale) : 0);
  // Hard cap the grip at a fixed share of the blade's total reach (pommel to
  // tip) — a long profile hilt range stacked with the two-handed bonus could
  // otherwise eat up to half the icon as handle. The blade itself grows to
  // fill whatever's left of the canvas diagonal past pommel+hilt+guard (see
  // `drawBladeHelper`), so capping the grip directly guarantees it stays a
  // minor fraction of the whole weapon regardless of profile/two-handed roll.
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

  // Riveted modification: small round studs stamped down the blade's own
  // centerline, like a bolstered/laminated blade. Same anchor scheme as the
  // barbed thorns above (`o` walks the ortho diagonal from the blade's base).
  if (modification === "riveted") {
    const startO = blade.startOrtho + Math.round(3 * dscale);
    const endO = pen.dimension - Math.round(7 * dscale);
    const spacing = Math.max(4, Math.round(4.5 * dscale));
    const rivetRadius = Math.max(1, 0.9 * dscale);
    for (let o = startO; o < endO; o += spacing) {
      pen.drawRoundOrnamentHelper({ center: new Vector(o, pen.dimension - 1 - o), radius: rivetRadius });
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
  let guardColors: CrossguardResults | undefined;
  const w = blade.startRadius;
  if (guard === "bar" || guard === "swept" || guard === "wings") {
    // A crossguard is a THIN bar — thickness barely scales with blade width, or
    // thick + curved arms clump into a blob that reads as a ball at the base.
    const guardThick = Math.min(1.8, Math.max(1.2, w * 0.24));
    const cfg: CrossguardParams = {
      positionDiag: blade.startOrtho,
      halfLength: w * (1.4 + 0.7 * r.floatLow()) + 2, // ≥1.4× blade half-width
      thickness: guardThick,
    };
    if (guard === "swept") {
      // Gently curved-back quillons (not a tight curl).
      cfg.omegaChance = 0.35;
      cfg.omegaAmount = Math.PI / 9;
      cfg.halfLength = w * (1.6 + 0.8 * r.floatLow()) + 2;
    } else if (guard === "wings") {
      // A WIDE, mostly-straight crossguard — heavy curl spiralled into a blob.
      cfg.halfLength = w * (2.0 + 0.8 * r.floatLow()) + 2;
      cfg.omegaChance = 0.12;
      cfg.thickness = Math.min(2.0, guardThick + 0.3);
    }
    guardColors = pen.drawCrossguardHelper(cfg);
  } else if (guard === "disc") {
    // A small round disc/cup guard — a knob just past the grip, absolutely
    // capped so wide blades don't sprout a giant sphere at the base.
    const gp = diagToPosition(blade.startOrtho, bounds);
    pen.drawRoundOrnamentHelper({ center: new Vector(gp.x, gp.y), radius: Math.min(gripRadius + 2, Math.max(gripRadius + 1, w * 0.5)) });
  }

  // Pommel — historical hilt-cap shapes, not just a recoloured ball. Most
  // stay just under the (thin) grip radius so they never overpower the
  // handle; a few genuinely wider builds (wheel/ring/flanged/crown) are
  // allowed to overhang it a little, the same latitude the disc guard gets.
  if (pommel !== "none") {
    const pommelRadius = Math.max(1, gripRadius * 0.55);
    const wideRadius = Math.min(gripRadius + 1.2, pommelRadius * 2.2);
    // Halfway between the two — a knob body large enough that small
    // appendages (a cap band, a hooked beak, a fan of prongs) survive
    // `cleanSilhouette`'s orphan-pixel pruning and actually register at the
    // 40–60px the app renders at, without sprouting into "wide" territory.
    const midRadius = (pommelRadius + wideRadius) / 2;
    const center = new Vector(Math.floor(pommelRadius + 1), Math.ceil(bounds.h - pommelRadius - 2));
    const wideCenter = new Vector(Math.floor(wideRadius + 1), Math.ceil(bounds.h - wideRadius - 2));
    const midCenter = new Vector(Math.floor(midRadius + 1), Math.ceil(bounds.h - midRadius - 2));
    // Away from the blade, past the grip end — the axis any spike/prong/hook
    // on a pommel points along (same direction the barbed thorns use above).
    const back = { x: -Math.SQRT1_2, y: Math.SQRT1_2 };

    if (pommel === "gem" || pommel === "faceted") {
      const g = pickGem(r);
      if (pommel === "gem") {
        pen.drawRoundOrnamentHelper({ center, radius: pommelRadius, colorLight: g.light, colorDark: g.shadow });
      } else {
        // Same jewel colours as "gem" but a rhombus cut instead of a ball —
        // reads as a genuinely different setting, not just a recolour.
        drawFacetedGem(pen, center, pommelRadius * 1.3, g.light, g.shadow);
      }
    } else if (pommel === "round") {
      const p: OrnamentParams = { center, radius: pommelRadius };
      if (guardColors) {
        p.colorLight = guardColors.colorLight;
        p.colorDark = guardColors.colorDark;
      }
      pen.drawRoundOrnamentHelper(p);
    } else {
      // Every other style shares one metal accent — matching the guard's
      // metal when there is one, otherwise a fresh accent pick — across the
      // knob plus whatever prongs/flanges/hooks sit on it.
      const metal = guardColors ?? (() => { const a = pickGuardAccent(r); return { colorLight: a.light, colorDark: a.shadow }; })();
      const { colorLight: light, colorDark: dark } = metal;
      switch (pommel) {
        case "wheel":
          // Flat wide disc flush with the grip end — the classic arming-sword
          // "wheel pommel", clearly wider than tall.
          pen.drawRoundOrnamentHelper({ center: wideCenter, radius: wideRadius, radiusY: wideRadius * 0.6, colorLight: light, colorDark: dark });
          break;
        case "ring":
          // A visible loop through the pommel — the historic ring pommel.
          pen.drawRoundOrnamentHelper({ center: wideCenter, radius: wideRadius, holeRadius: wideRadius * 0.5, colorLight: light, colorDark: dark });
          break;
        case "trefoil": {
          // Three lobes clustered around the grip end — the Viking-age
          // trilobate pommel. Sized off `midRadius` and spaced past their own
          // radius so the cluster reads as three bumps, not one blob.
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
          // A rounded body with a contrasting cap band near the neck — the
          // historical acorn pommel. Bigger + a stronger offset than a plain
          // round knob so the two-tone cap survives at tiny render sizes.
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
          // A slim elongated capsule along the hilt axis — the Renaissance
          // rapier "scent-stopper" pommel.
          pen.drawRoundOrnamentHelper({ center, radius: pommelRadius * 0.75, radiusY: pommelRadius * 1.9, colorLight: light, colorDark: dark });
          break;
        case "spike":
          // A tapered cone jutting straight off the grip end — a military
          // spike pommel.
          pen.fillCone(center.x, center.y, back.x, back.y, 0, pommelRadius * 2.4, pommelRadius * 0.9, light, dark);
          break;
        case "flanged":
          // A small ball with radiating flanges — a miniature mace head
          // capping the grip.
          pen.drawRoundOrnamentHelper({ center: wideCenter, radius: wideRadius * 0.7, colorLight: light, colorDark: dark });
          for (let i = 0; i < 4; i++) {
            const d = rotate(back, (i / 4) * Math.PI * 2);
            pen.fillCone(wideCenter.x, wideCenter.y, d.x, d.y, wideRadius * 0.4, wideRadius * 0.85, wideRadius * 0.32, light, dark);
          }
          break;
        case "crown":
          // A small coronet — a ball with three points fanned toward the
          // grip end, like a ceremonial crown pommel. Longer, chunkier prongs
          // than a first pass so they clear `cleanSilhouette`'s pruning.
          pen.drawRoundOrnamentHelper({ center: midCenter, radius: midRadius * 0.8, colorLight: light, colorDark: dark });
          for (const a of [-0.6, 0, 0.6]) {
            const d = rotate(back, a);
            pen.fillCone(midCenter.x, midCenter.y, d.x, d.y, midRadius * 0.3, midRadius * 1.5, midRadius * 0.45, light, dark);
          }
          break;
        case "birdhead": {
          // An asymmetric hooked cap — the "bird-head" pommel seen on
          // sabers, curling to one side rather than sitting flush. A longer
          // hook than a plain round knob's radius so the curl actually reads.
          pen.drawRoundOrnamentHelper({ center: midCenter, radius: midRadius * 0.85, colorLight: light, colorDark: dark });
          const hook = rotate(back, 1.15);
          pen.fillCone(midCenter.x, midCenter.y, hook.x, hook.y, midRadius * 0.5, midRadius * 1.8, midRadius * 0.6, light, dark);
          break;
        }
      }
    }
  }

  pen.weather(r.floatLow()); // most blades lightly worn, a few battered
  pen.addBorder();
}
