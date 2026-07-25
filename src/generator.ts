/**
 * IconGenerator — faithful TypeScript port of Brian MacIntosh's Icon Machine
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
import type { Color, IconClass, IconClassSelector, IconConfig } from "./types";
import { Bounds, Vector, CorePoint, diagToPosition, floatLerp } from "./math";
import { colorDarken, colorLerp, colorLighten, colorStr, hsvToRgb } from "./color";
import { Rng, sfc32, xmur3 } from "./rng";

/** Subset of CanvasRenderingContext2D the generator relies on. */
export type Ctx2D = CanvasRenderingContext2D;

export interface IconOptions {
  /**
   * Outline color as [r, g, b], 0–255. The original uses pure black
   * ([0, 0, 0]); a dark desaturated tone (e.g. [26, 22, 34]) reads softer and
   * matches hand-drawn pixel-art outlines. Default: black.
   */
  border?: [number, number, number];
}

const ALL_CLASSES: IconClass[] = ["blades", "spears", "axes"];

export class IconGenerator {
  private ctx: Ctx2D;
  private dimension: number;
  private rng = new Rng();
  private translation = new Vector(0, 0);
  private border: [number, number, number];

  constructor(ctx: Ctx2D, dimension: number, options: IconOptions = {}) {
    this.ctx = ctx;
    this.dimension = dimension;
    this.border = options.border ?? [0, 0, 0];
  }

  /** Draw the configured icon into the context (at the current translation). */
  generate(config: IconConfig): IconClass {
    const seed = config.seed;

    // meta-rng resolves "any" / "anyweapon" to a concrete class deterministically
    const metaGen = xmur3(seed);
    const metaRandom = sfc32(metaGen(), metaGen(), metaGen(), metaGen());

    let drawClass: IconClass;
    const sel: IconClassSelector = config.iconClass;
    if (sel === "any" || sel === "anyweapon") {
      drawClass = ALL_CLASSES[Math.floor(ALL_CLASSES.length * metaRandom())]!;
    } else {
      drawClass = sel;
    }

    this.rng.seed(seed);
    switch (drawClass) {
      case "blades":
        this.drawRandomBlade();
        break;
      case "spears":
        this.drawRandomSpear();
        break;
      case "axes":
        this.drawRandomAxe();
        break;
    }
    return drawClass;
  }

  // -- low-level canvas ------------------------------------------------------

  private clearCanvas(): void {
    this.ctx.fillStyle = "rgba(0,0,0,1)";
    this.ctx.clearRect(0, 0, this.dimension, this.dimension);
  }

  private drawPixel(x: number, y: number): void {
    this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  /** Add a 1px black outline around the current drawing. */
  private addBorder(): void {
    const width = this.dimension;
    const height = this.dimension;
    const ox = this.translation.x;
    const oy = this.translation.y;

    const readData = this.ctx.getImageData(ox, oy, width, height);
    const mutableData = this.ctx.getImageData(ox, oy, width, height);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const pixelStart = (x + y * width) * 4;
        if (readData.data[pixelStart + 3] === 0 || x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          const nx = (x - 1 + y * width) * 4;
          const ny = (x + (y - 1) * width) * 4;
          const px = (x + 1 + y * width) * 4;
          const py = (x + (y + 1) * width) * 4;
          if (
            (x > 0 && readData.data[nx + 3]! > 0) ||
            (x < width - 1 && readData.data[px + 3]! > 0) ||
            (y > 0 && readData.data[ny + 3]! > 0) ||
            (y < height - 1 && readData.data[py + 3]! > 0)
          ) {
            mutableData.data[pixelStart + 0] = this.border[0];
            mutableData.data[pixelStart + 1] = this.border[1];
            mutableData.data[pixelStart + 2] = this.border[2];
            mutableData.data[pixelStart + 3] = 255;
          }
        }
      }
    }
    this.ctx.putImageData(mutableData, ox, oy);
  }

  // -- blade -----------------------------------------------------------------

  private drawRandomBlade(): void {
    this.rng.checkpoint();
    const r = this.rng;

    const bounds = new Bounds(0, 0, this.dimension, this.dimension);
    const dscale = bounds.h / 32;

    this.clearCanvas();

    const pommelLength = Math.ceil(r.floatLow() * 2 * dscale);
    const hiltLength = Math.ceil(r.range(6, 11) * dscale);
    const xguardWidth = Math.ceil(r.range(1, 4) * dscale);

    const bladeResults = this.drawBladeHelper({
      startDiag: pommelLength + hiltLength + xguardWidth,
      taperFactor: r.floatLow(),
      startRadius: Math.ceil(r.range(2, 4) * dscale),
    });

    const hiltStartDiag = Math.floor(pommelLength * Math.sqrt(2));
    this.drawGripHelper({
      startDiag: hiltStartDiag,
      lengthDiag: Math.floor(bladeResults.startOrtho - hiltStartDiag),
      maxRadius: bladeResults.startRadius,
      fractionalRadiusAllowed: false,
    });

    const crossguardResults = this.drawCrossguardHelper({
      positionDiag: bladeResults.startOrtho,
      halfLength: bladeResults.startRadius * (1 + 2 * r.floatLow()) + 1,
    });

    const pommelRadius = (pommelLength * Math.sqrt(2)) / 2;
    this.drawRoundOrnamentHelper({
      center: new Vector(Math.floor(pommelRadius + 1), Math.ceil(bounds.h - pommelRadius - 2)),
      radius: pommelRadius,
      colorLight: crossguardResults.colorLight,
      colorDark: crossguardResults.colorDark,
    });

    this.addBorder();
  }

  // -- spear -----------------------------------------------------------------

  private drawRandomSpear(): void {
    this.rng.checkpoint();
    const r = this.rng;

    const bounds = new Bounds(0, 0, this.dimension, this.dimension);
    const canvasDiag = Math.sqrt(bounds.w * bounds.w + bounds.h * bounds.h);
    const dscale = bounds.h / 32;

    this.clearCanvas();

    const gripLengthMin = 8;
    const tipLength = Math.ceil(r.range(10, 20) * dscale);
    const tipStartDiag = canvasDiag - tipLength;
    const gripStartDiag = Math.ceil(r.range(0, tipStartDiag - gripLengthMin));
    const gripLength = Math.ceil(r.range(gripLengthMin, tipStartDiag - gripStartDiag) * dscale);

    const tipResults = this.drawBladeHelper({
      startDiag: tipStartDiag,
      taperFactor: r.float() * 0.5 + 0.5,
      startRadius: Math.ceil(r.range(1, 2) * dscale),
    });

    const haftParams: HaftParams = {
      startDiag: 0,
      lengthDiag: tipStartDiag,
      maxRadius: tipResults.startRadius * 2,
      fractionalRadiusAllowed: true,
    };
    if (r.float() > 0.95) haftParams.color = tipResults.hiltColor;
    const haftResults = this.drawHaftHelper(haftParams);

    if (r.float() > 0.65) {
      this.drawGripHelper({
        startDiag: gripStartDiag,
        lengthDiag: gripLength / Math.sqrt(2),
        minRadius: haftResults.radius,
        maxRadius: haftResults.radius,
        fractionalRadiusAllowed: true,
      });
    }

    let crossguardResults: CrossguardResults | undefined;
    if (r.float() > 0.4) {
      crossguardResults = this.drawCrossguardHelper({
        positionDiag: tipResults.startOrtho,
        halfLength: tipResults.startRadius * (1 + 8 * r.floatExtreme()) + 4,
        omegaChance: 0.4,
        omegaAmount: Math.PI / 10,
        thickness: r.rangeFloat(1, 2),
      });
    }

    // ribbons: original loops but the body is a TODO — kept for RNG parity.
    const ribbonCount = r.rangeLow(0, 4);
    for (let i = 0; i < ribbonCount; i++) {
      // no-op (matches source)
    }

    if (r.float() > 0.4) {
      const pommelRadius = Math.ceil((0.5 + r.floatLow() * 0.5) * dscale);
      const pommelParams: OrnamentParams = {
        center: new Vector(Math.floor(pommelRadius), Math.ceil(bounds.h - pommelRadius - 1)),
        radius: pommelRadius,
      };
      if (crossguardResults && r.float() > 0.5) {
        pommelParams.colorLight = crossguardResults.colorLight;
        pommelParams.colorDark = crossguardResults.colorDark;
      } else {
        pommelParams.colorLight = hsvToRgb({ h: r.range(0, 360), s: r.float(), v: r.rangeFloat(0, 1) });
      }
      // erase haft that might go below pommel
      this.ctx.clearRect(-1, bounds.h, pommelRadius + 1, -(pommelRadius + 1));
      this.drawRoundOrnamentHelper(pommelParams);
    }

    if (r.float() > 0.55) {
      const deviceRadius = Math.ceil((0.5 + r.floatLow() * 1.5) * dscale);
      const deviceParams: OrnamentParams = {
        center: diagToPosition(haftParams.startDiag + haftParams.lengthDiag - Math.floor(deviceRadius / 2), bounds),
        radius: deviceRadius,
      };
      if (crossguardResults && r.float() > 0.4) {
        deviceParams.colorLight = crossguardResults.colorLight;
        deviceParams.colorDark = crossguardResults.colorDark;
      } else {
        deviceParams.colorLight = hsvToRgb({ h: r.range(0, 360), s: r.float(), v: r.rangeFloat(0, 1) });
      }
      this.drawRoundOrnamentHelper(deviceParams);
    }

    this.addBorder();
  }

  // -- axe -------------------------------------------------------------------
  // Not part of the original Icon Machine. A haft along the bottom-left→top-right
  // diagonal with a procedural axe head (a half-elliptical "bit") flaring off one
  // or both sides near the top, plus an optional back spike.

  private drawRandomAxe(): void {
    this.rng.checkpoint();
    const r = this.rng;

    const bounds = new Bounds(0, 0, this.dimension, this.dimension);
    const dscale = bounds.h / 32;
    const canvasDiag = Math.sqrt(bounds.w * bounds.w + bounds.h * bounds.h);

    this.clearCanvas();

    // Haft runs the full diagonal, its top end sitting a little short of the corner
    // so the head has room.
    const headDiag = canvasDiag - Math.ceil(r.range(5, 9) * dscale);
    this.drawHaftHelper({
      startDiag: 0,
      lengthDiag: headDiag,
      maxRadius: Math.max(1, r.range(1, 2)),
      fractionalRadiusAllowed: true,
    });

    // Head anchor: on the haft, a touch below its top so the bit hugs the shaft.
    const anchorDiag = headDiag - Math.floor(r.range(1, 4) * dscale);
    const anchor = diagToPosition(anchorDiag, bounds);

    // Frame aligned with the haft: u = forward (toward top-right), n = outward (top-left).
    const u = new Vector(1, -1).normalize();
    const n = new Vector(-1, -1).normalize();

    // Bit dimensions.
    const halfLen = r.rangeFloat(6, 10) * dscale; // extent along the haft
    const bitDepth = r.rangeFloat(7, 11) * dscale; // how far the bit flares out
    const doubleBit = r.float() > 0.55; // symmetric head both sides
    const backSpike = !doubleBit && r.float() > 0.5; // small poll spike opposite the bit

    // Metal colors (desaturated, like the crossguard helper).
    const light = hsvToRgb({ h: r.range(0, 360), s: r.floatLow() * 0.35, v: r.rangeFloat(0.72, 1) });
    const dark = colorDarken(light, 0.62);

    // Optional slight forward sweep of the cutting edge for a bearded-axe look.
    const sweep = r.rangeFloat(-0.25, 0.25);

    // Axe-bit membership. In the (s = along haft, d = outward) frame the bit is a
    // fan that flares from a narrow neck at the haft to a wide, convex cutting edge:
    //   - sides:  |s| <= width(d),  width grows with d  →  neck → wide edge
    //   - edge:   d <= edgeMax(s),  a shallow arc        →  convex cutting edge
    const wNeck = Math.max(1, 1.6 * dscale);
    const drawBit = (sign: number) => {
      for (let x = 0; x < bounds.w; x++) {
        for (let y = 0; y < bounds.h; y++) {
          const px = x - anchor.x;
          const py = y - anchor.y;
          const s = px * u.x + py * u.y + sweep * ((px * n.x + py * n.y) * sign);
          const d = (px * n.x + py * n.y) * sign;
          if (d < 0 || d > bitDepth) continue;
          const flare = d / bitDepth; // 0 at neck, 1 at edge
          const width = wNeck + (halfLen - wNeck) * Math.pow(flare, 0.6);
          if (Math.abs(s) > width) continue;
          const tEdge = Math.min(1, Math.abs(s) / halfLen);
          const edgeMax = bitDepth * (0.8 + 0.2 * (1 - tEdge * tEdge)); // convex bulge mid
          if (d > edgeMax) continue;
          // Shade: brighter toward the cutting edge (large flare).
          const shade = Math.min(1, 0.18 + flare * 0.82) * (1 - Math.abs(s) / (halfLen + 1) * 0.25);
          this.ctx.fillStyle = colorStr(colorLerp(dark, light, shade));
          this.drawPixel(x, y);
        }
      }
    };

    drawBit(1);
    if (doubleBit) drawBit(-1);

    // Back spike (poll) for single-bit battle axes: a short wedge opposite the bit.
    if (backSpike) {
      const spikeLen = r.rangeFloat(3, 6) * dscale;
      const spikeHalf = r.rangeFloat(1.5, 3) * dscale;
      for (let x = 0; x < bounds.w; x++) {
        for (let y = 0; y < bounds.h; y++) {
          const px = x - anchor.x;
          const py = y - anchor.y;
          const s = px * u.x + py * u.y;
          const d = -(px * n.x + py * n.y); // opposite side
          if (d < 0 || d > spikeLen) continue;
          const w = spikeHalf * (1 - d / spikeLen);
          if (Math.abs(s) > w) continue;
          this.ctx.fillStyle = colorStr(colorLerp(dark, light, 0.5));
          this.drawPixel(x, y);
        }
      }
    }

    // Pommel/end cap at the base of the haft.
    if (r.float() > 0.5) {
      const pommelRadius = Math.ceil((0.5 + r.floatLow() * 0.6) * dscale);
      this.drawRoundOrnamentHelper({
        center: new Vector(Math.floor(pommelRadius), Math.ceil(bounds.h - pommelRadius - 1)),
        radius: pommelRadius,
        colorLight: hsvToRgb({ h: r.range(35, 45), s: r.float() * 0.6, v: r.rangeFloat(0.5, 0.9) }),
      });
    }

    this.addBorder();
  }

  // -- blade helper ----------------------------------------------------------

  private drawBladeHelper(params: BladeParams): BladeResults {
    this.rng.checkpoint();
    const r = this.rng;

    const bounds = new Bounds(0, 0, this.dimension, this.dimension);
    const bounds1 = new Bounds(1, 1, bounds.w - 2, bounds.h - 2);
    const dscale = bounds.h / 32;

    const minimumBladeWidth = 1;
    const bladeSampleStepSize = Math.sqrt(2);
    const bladeEdgeWidth = 1;
    const bladeCoreEdgeExcludeWidth = 1;
    const bladeJogChance = 0.04;
    const bladeJogChanceLeadIn = Math.ceil(12 * dscale);
    const bladeJogAmount = Math.PI / 4;
    const bladeOmegaChance = 0.02;
    const bladeOmegaAmount = Math.PI / 32;
    const bladeMaxOmega = Math.PI / 32;

    const bladeWidthCosineAmp = Math.ceil(Math.max(0, r.floatLow() * 1.2 - 0.2) * 2 * dscale);
    const bladeWidthCosineWavelength = Math.ceil(r.range(3 * Math.max(1, bladeWidthCosineAmp), 12) * dscale);
    const bladeWidthCosineOffset = r.rangeFloat(0, Math.PI * 2);

    const bladeWiggleAmp = ((Math.max(0, r.float() * 8 - 7) * Math.PI) / 4) * dscale;
    const bladeWiggleWavelength = Math.ceil(r.rangeFloat(6, 18) * dscale);

    const bladeCorePoints: CorePoint[] = [];
    const bladeStartOrtho = Math.floor(params.startDiag / Math.sqrt(2));
    const currentPoint = new Vector(bladeStartOrtho, bounds.h - 1 - bladeStartOrtho);
    let currentDist = 0;
    const currentWidthL = params.startRadius;
    const currentWidthR = params.startRadius + r.range(-1, 2);
    const velocity = new Vector();
    const velocityScaled = new Vector();
    let angle = -Math.PI / 4;
    let omega = 0;
    do {
      const bladeWidthCosine = bladeWidthCosineAmp * Math.cos(bladeWidthCosineOffset + currentDist / bladeWidthCosineWavelength);
      const useAngle = angle + bladeWiggleAmp * Math.sin((Math.PI * 2 * currentDist) / bladeWiggleWavelength);
      velocity.set(Math.cos(useAngle), Math.sin(useAngle));

      const newPoint = new CorePoint(currentPoint);
      newPoint.widthL = Math.max(1, currentWidthL + bladeWidthCosine);
      newPoint.widthR = Math.max(1, currentWidthR + bladeWidthCosine);
      newPoint.normal = new Vector(-velocity.y, velocity.x).normalize();
      newPoint.forward = new Vector(velocity).normalize();
      newPoint.dist = currentDist;
      bladeCorePoints.push(newPoint);

      if (r.float() <= bladeJogChance * Math.min(1, currentDist / bladeJogChanceLeadIn)) {
        angle += r.rangeFloat(-bladeJogAmount, bladeJogAmount);
      }
      if (r.float() <= bladeOmegaChance) {
        omega += r.rangeFloat(-bladeOmegaAmount, bladeOmegaAmount);
        omega = Math.sign(omega) * Math.min(bladeMaxOmega, Math.abs(omega));
      }

      velocityScaled.set(velocity).multiplyScalar(bladeSampleStepSize);
      currentPoint.addVector(velocityScaled);
      currentDist += bladeSampleStepSize;
      angle += omega * bladeSampleStepSize;
    } while (bounds1.contains(currentPoint));

    for (const p of bladeCorePoints) {
      p.normalizedDist = p.dist! / currentDist;
      const invTaperFactor = 1 - params.taperFactor;
      const taper = p.normalizedDist <= invTaperFactor ? 1 : (1 - p.normalizedDist) / params.taperFactor;
      p.widthL! *= taper;
      p.widthR! *= taper;
    }

    const colorBladeLinearTip = hsvToRgb({
      h: r.rangeFloat(0, 360),
      s: r.float() < 0.3 ? r.floatExtreme() * 0.6 : 0,
      v: r.rangeFloat(0.75, 1),
    });
    const colorBladeLinearHilt = r.randomize(colorDarken(colorBladeLinearTip, 0.7), 16);
    const bladeEdgeLighten = 0.5;
    const bladeRightDarken = 0.5;

    for (let x = 0; x < bounds.w; x++) {
      for (let y = 0; y < bounds.h; y++) {
        const first = bladeCorePoints[0]!;
        const behind = first.forward.dotProduct(x - first.x, y - first.y);
        if (behind < 0) continue;

        let coreDistanceNorm = Infinity;
        let bestPoint: CorePoint | null = null;
        for (const cp of bladeCorePoints) {
          const dp = cp.normal!.dotProduct(x - cp.x, y - cp.y);
          const useWidth = dp < 0 ? cp.widthL! : cp.widthR!;
          const distanceNorm = cp.distanceTo(x, y) / useWidth;
          if (distanceNorm < coreDistanceNorm) {
            coreDistanceNorm = distanceNorm;
            bestPoint = cp;
          }
        }
        if (bestPoint == null) continue;

        const dp = bestPoint.normal!.dotProduct(x - bestPoint.x + 0.5, y - bestPoint.y + 0.5);
        const useWidth = dp < 0 ? bestPoint.widthL! : bestPoint.widthR!;
        const coreDistance = bestPoint.distanceTo(x, y);
        if (coreDistance <= useWidth || coreDistance <= minimumBladeWidth) {
          let color = colorLerp(colorBladeLinearHilt, colorBladeLinearTip, bestPoint.normalizedDist!);
          const edgeColor = colorLighten(color, bladeEdgeLighten);
          const darkColor = colorDarken(color, bladeRightDarken);
          const nonEdgeColor = dp > 0 ? darkColor : color;
          if (useWidth > bladeCoreEdgeExcludeWidth) {
            const edgeWidthMin = useWidth - bladeEdgeWidth;
            let edgeAmount = (coreDistance - edgeWidthMin) / bladeEdgeWidth;
            edgeAmount = 1 - (1 - edgeAmount) * (1 - edgeAmount);
            color = colorLerp(nonEdgeColor, edgeColor, edgeAmount);
          }
          this.ctx.fillStyle = colorStr(color);
          this.drawPixel(x, y);
        }
      }
    }

    return {
      startDiag: params.startDiag,
      startOrtho: bladeStartOrtho,
      startRadius: params.startRadius,
      hiltColor: colorBladeLinearHilt,
      tipColor: colorBladeLinearTip,
    };
  }

  // -- crossguard helper -----------------------------------------------------

  private drawCrossguardHelper(params: CrossguardParams): CrossguardResults {
    this.rng.checkpoint();
    const r = this.rng;

    const bounds = new Bounds(0, 0, this.dimension, this.dimension);

    const xguardColorLight = hsvToRgb({ h: r.range(0, 360), s: r.floatLow() * 0.5, v: r.rangeFloat(0.7, 1) });
    const xguardColorDark = colorDarken(xguardColorLight, 0.6);
    const xguardSymmetry = r.float() < 0.3 ? 0 : 1;
    const xguardThickness = params.thickness ?? r.rangeFloatHigh(1, 2.5);
    const xguardBottomTaper = r.float();
    const xguardTopTaper = floatLerp(r.float(), xguardBottomTaper, r.floatExtreme());
    const xguardOmegaChance = params.omegaChance ?? 0.3;
    const xguardOmegaAmount = params.omegaAmount ?? Math.PI / 8;
    // `^` is bitwise XOR here (not power) — faithful to the original source.
    const xguardMaxOmega = ((0 + (xguardThickness - 1)) ^ 2) * (Math.PI / 7);
    const xguardOmegaCooldown = 3;
    const xguardSampleStepSize = Math.sqrt(2);

    const start = new Vector(params.positionDiag, bounds.h - 1 - params.positionDiag);
    const currentPoint: [Vector, Vector] = [start, new Vector(start)];
    const xguardControlPoints: [CorePoint[], CorePoint[]] = [[], []];
    const xguardAngle: [number, number] = [(-Math.PI * 3) / 4, Math.PI / 4];
    const xguardOmega: [number, number] = [0, 0];
    const xguardOmegaCoolTimer: [number, number] = [0, 0];
    const deltaStep = xguardSampleStepSize / Math.sqrt(2);

    for (let progress = 0; progress <= params.halfLength; progress += xguardSampleStepSize) {
      for (const side of [0, 1] as const) {
        const newPoint = new CorePoint(currentPoint[side]);
        if (side === 1) {
          const symmetricPoint = new Vector(bounds.h - 1 - currentPoint[0].y, bounds.w - 1 - currentPoint[0].x);
          newPoint.lerpTo(symmetricPoint, xguardSymmetry);
        }
        newPoint.widthT = xguardThickness / 2;
        newPoint.widthB = xguardThickness / 2;
        const vel = new Vector(Math.cos(xguardAngle[side]), Math.sin(xguardAngle[side]));
        newPoint.normal = new Vector(vel.y, -vel.x).multiplyScalar(side * 2 - 1);
        newPoint.dist = progress;
        xguardControlPoints[side].push(newPoint);
      }
      for (const side of [0, 1] as const) {
        const vel = new Vector(Math.cos(xguardAngle[side]), Math.sin(xguardAngle[side]));
        xguardOmegaCoolTimer[side] -= xguardSampleStepSize;
        if (xguardOmegaCoolTimer[side] <= 0 && r.float() < xguardOmegaChance) {
          xguardOmegaCoolTimer[side] = xguardOmegaCooldown;
          xguardOmega[side] += r.rangeFloatExtreme(-xguardOmegaAmount, xguardOmegaAmount);
          xguardOmega[side] = Math.sign(xguardOmega[side]) * Math.min(xguardMaxOmega, Math.abs(xguardOmega[side]));
        }
        const step = new Vector(vel).multiplyScalar(xguardSampleStepSize);
        currentPoint[side].addVector(step);
        xguardAngle[side] += xguardOmega[side] * deltaStep;
      }
    }

    for (const side of [0, 1] as const) {
      for (const cp of xguardControlPoints[side]) {
        cp.normalizedDist = cp.dist / params.halfLength;
        cp.widthT *= Math.min(1, (1 - cp.normalizedDist) / xguardTopTaper);
        cp.widthB *= Math.min(1, (1 - cp.normalizedDist) / xguardBottomTaper);
      }
    }

    for (let x = 0; x < bounds.w; x++) {
      for (let y = 0; y < bounds.h; y++) {
        let coreDistanceSq = Infinity;
        let bestPoint: CorePoint | null = null;
        for (const side of [0, 1] as const) {
          for (const cp of xguardControlPoints[side]) {
            const distanceSq = cp.distanceToSq(x, y);
            if (distanceSq < coreDistanceSq) {
              coreDistanceSq = distanceSq;
              bestPoint = cp;
            }
          }
        }
        if (bestPoint == null) continue;
        const dp = bestPoint.normal!.dotProduct(x - bestPoint.x, y - bestPoint.y);
        const useWidth = dp < 0 ? bestPoint.widthB! : bestPoint.widthT!;
        const coreDistance = Math.sqrt(coreDistanceSq);
        if (coreDistance <= useWidth) {
          const distFromTop = dp < 0 ? bestPoint.widthT! + coreDistance : bestPoint.widthT! - coreDistance;
          const darkAmt = distFromTop / (bestPoint.widthB! + bestPoint.widthT!);
          this.ctx.fillStyle = colorStr(colorLerp(xguardColorLight, xguardColorDark, darkAmt));
          this.drawPixel(x, y);
        }
      }
    }

    return { colorLight: xguardColorLight, colorDark: xguardColorDark };
  }

  // -- grip / haft / rod -----------------------------------------------------

  private drawGripHelper(params: GripParams): void {
    this.rng.checkpoint();
    const r = this.rng;

    const bounds = new Bounds(0, 0, this.dimension, this.dimension);
    const dscale = bounds.h / 32;

    const minRadius = params.minRadius ? params.minRadius : 1;
    const maxRadius = params.maxRadius;
    const hiltRadius = params.fractionalRadiusAllowed
      ? 0.5 * Math.ceil(r.range(minRadius * 2, maxRadius * 2) * dscale)
      : Math.ceil(r.range(minRadius, maxRadius) * dscale);

    const hiltWavelength = Math.max(2, Math.ceil(r.range(3, 6) * dscale));
    const hiltColorLight = hsvToRgb({ h: r.range(0, 360), s: r.float(), v: r.rangeFloat(0.7, 1) });
    const hiltColorDark = colorDarken(hiltColorLight, 1);

    this.drawRodHelper({
      radius: hiltRadius,
      startDiag: params.startDiag,
      lengthDiag: params.lengthDiag * Math.sqrt(2),
      colorFunc: (l) => {
        const gripWave = Math.abs(Math.cos((Math.PI * 2 * l) / hiltWavelength));
        return colorLerp(hiltColorDark, hiltColorLight, gripWave);
      },
    });
  }

  private drawHaftHelper(params: HaftParams): { radius: number } {
    this.rng.checkpoint();
    const r = this.rng;

    const bounds = new Bounds(0, 0, this.dimension, this.dimension);
    const dscale = bounds.h / 32;

    const minRadius = params.minRadius ? params.minRadius : 1;
    const maxRadius = params.maxRadius;
    const haftRadius = params.fractionalRadiusAllowed
      ? 0.5 * Math.ceil(r.range(minRadius * 2, maxRadius * 2) * dscale)
      : Math.ceil(r.range(minRadius, maxRadius) * dscale);

    const haftColor = params.color ?? hsvToRgb({ h: r.range(35, 45), s: r.float(), v: r.rangeFloat(0.5, 0.95) });

    this.drawRodHelper({
      radius: haftRadius,
      startDiag: params.startDiag,
      lengthDiag: params.lengthDiag,
      colorFunc: () => haftColor,
    });

    return { radius: haftRadius };
  }

  private drawRodHelper(params: RodParams): void {
    const radius = Math.max(1, params.radius);
    const bounds = new Bounds(0, 0, this.dimension, this.dimension);
    const radSteps = radius / 0.5;

    const startAxis = Math.ceil(params.startDiag / Math.sqrt(2));
    const lengthAxis = params.lengthDiag / Math.sqrt(2);
    for (let l = 0; l < lengthAxis; l += 0.5) {
      const al = startAxis + l;
      const core = new Vector(al, bounds.h - 1 - al);
      const fractionalStep = al % 1 !== 0;
      let left: number;
      let right: number;
      if (!fractionalStep) {
        left = -Math.floor((radSteps - 2) / 4);
        right = Math.floor((radSteps - 1) / 4);
      } else {
        core.x = Math.floor(core.x);
        core.y = Math.floor(core.y);
        left = -Math.floor((radSteps - 3) / 4);
        right = Math.floor((radSteps - 0) / 4);
      }

      const sliceColor = params.colorFunc(l);
      for (let h = left; h <= right; h++) {
        let darkenAmt: number;
        if (left === right) {
          darkenAmt = fractionalStep ? 0 : 1;
        } else {
          darkenAmt = (h - left) / (right - left);
        }
        darkenAmt *= 0.3;
        this.ctx.fillStyle = colorStr(colorDarken(sliceColor, darkenAmt));
        this.drawPixel(core.x + h, core.y + h);
      }
    }
  }

  // -- round ornament --------------------------------------------------------

  private drawRoundOrnamentHelper(params: OrnamentParams): void {
    this.rng.checkpoint();
    const r = this.rng;

    const pommelColorLight = params.colorLight ?? hsvToRgb({ h: r.range(0, 360), s: r.floatLow() * 0.5, v: r.rangeFloat(0.7, 1) });
    const pommelColorDark = params.colorDark ?? colorDarken(pommelColorLight, 0.6);
    const pommelRadius = params.radius;
    const shadowCenter = new Vector(0.5, 1).normalize().multiplyScalar(pommelRadius).addVector(params.center);
    const highlightCenter = new Vector(-1, -1).normalize().multiplyScalar(pommelRadius * 0.7).addVector(params.center);
    for (let x = Math.floor(params.center.x - pommelRadius); x <= Math.ceil(params.center.x + pommelRadius); x++) {
      for (let y = Math.floor(params.center.y - pommelRadius); y <= Math.ceil(params.center.y + pommelRadius); y++) {
        const radius = params.center.distanceTo(x, y);
        if (radius <= pommelRadius) {
          const shadowDist = shadowCenter.distanceTo(x, y);
          const highlightDist = highlightCenter.distanceTo(x, y);
          const darkAmt = 1 - Math.min(1, (0.8 * shadowDist) / pommelRadius);
          const lightAmt = 1 - Math.min(1, highlightDist / pommelRadius);
          this.ctx.fillStyle = colorStr(colorLighten(colorLerp(pommelColorLight, pommelColorDark, darkAmt), lightAmt));
          this.drawPixel(x, y);
        }
      }
    }
  }
}

// -- helper param/result shapes ----------------------------------------------

interface BladeParams {
  startDiag: number;
  taperFactor: number;
  startRadius: number;
}
interface BladeResults {
  startDiag: number;
  startOrtho: number;
  startRadius: number;
  hiltColor: Color;
  tipColor: Color;
}
interface CrossguardParams {
  positionDiag: number;
  halfLength: number;
  omegaChance?: number;
  omegaAmount?: number;
  thickness?: number;
}
interface CrossguardResults {
  colorLight: Color;
  colorDark: Color;
}
interface GripParams {
  startDiag: number;
  lengthDiag: number;
  minRadius?: number;
  maxRadius: number;
  fractionalRadiusAllowed?: boolean;
}
interface HaftParams {
  startDiag: number;
  lengthDiag: number;
  minRadius?: number;
  maxRadius: number;
  fractionalRadiusAllowed?: boolean;
  color?: Color;
}
interface RodParams {
  radius: number;
  startDiag: number;
  lengthDiag: number;
  colorFunc: (l: number) => Color;
}
interface OrnamentParams {
  center: Vector;
  radius: number;
  colorLight?: Color;
  colorDark?: Color;
}

/**
 * Convenience one-shot: draw an icon into a fresh context.
 * Returns the concrete class that was drawn (useful when `iconClass` was a
 * meta-selector like "anyweapon").
 */
export function generateIcon(
  ctx: Ctx2D,
  dimension: number,
  config: IconConfig,
  options?: IconOptions,
): IconClass {
  return new IconGenerator(ctx, dimension, options).generate(config);
}
