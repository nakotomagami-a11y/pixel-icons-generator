/**
 * Render the same seeds at several native resolutions, each upscaled to the
 * same display size, to compare edge smoothness. `bun test/compare.ts out.png`
 */
import { IconGenerator, type IconOptions } from "../src/generator";
import type { IconClass } from "../src/types";

const SOFT: [number, number, number] = [26, 22, 34];
// column variants: [label, native dim, options]
const VARIANTS: { label: string; dim: number; opts?: IconOptions }[] = [
  { label: "32 black (current)", dim: 32 },
  { label: "48 soft", dim: 48, opts: { border: SOFT } },
  { label: "64 soft", dim: 64, opts: { border: SOFT } },
];
const DISPLAY = 120; // final on-screen size we upscale each to (nearest-neighbor)
const PAD = 8;
const seeds = ["Orchestra/a-evolve", "anthropics/pdf", "abc123", "longbow", "excalibur"];
const classes: IconClass[] = ["blades", "spears"];

function parseColor(s: string): [number, number, number, number] {
  if (s === "white") return [255, 255, 255, 255];
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 255];
  const p = m[1].split(",").map((v) => parseFloat(v.trim()));
  return [p[0], p[1], p[2], p[3] === undefined ? 255 : Math.round(p[3] * 255)];
}

function render(dim: number, seed: string, cls: IconClass, opts?: IconOptions): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(dim * dim * 4);
  let tx = 0, ty = 0;
  let fillStyle = "black";
  const ctx = {
    set fillStyle(v: string) { fillStyle = v; },
    get fillStyle() { return fillStyle; },
    globalCompositeOperation: "source-over",
    translate(x: number, y: number) { tx += x; ty += y; },
    save() {}, restore() {},
    fillRect(x: number, y: number, w: number, h: number) {
      const [r, g, b, a] = parseColor(fillStyle);
      for (let yy = Math.floor(y); yy < Math.floor(y) + Math.round(h); yy++)
        for (let xx = Math.floor(x); xx < Math.floor(x) + Math.round(w); xx++) {
          const px = xx + tx, py = yy + ty;
          if (px < 0 || py < 0 || px >= dim || py >= dim) continue;
          const i = (px + py * dim) * 4;
          buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
        }
    },
    clearRect(x: number, y: number, w: number, h: number) {
      const x0 = Math.floor(Math.min(x, x + w)), x1 = Math.floor(Math.max(x, x + w));
      const y0 = Math.floor(Math.min(y, y + h)), y1 = Math.floor(Math.max(y, y + h));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const px = xx + tx, py = yy + ty;
        if (px < 0 || py < 0 || px >= dim || py >= dim) continue;
        const i = (px + py * dim) * 4; buf[i] = buf[i+1] = buf[i+2] = buf[i+3] = 0;
      }
    },
    getImageData(x: number, y: number, w: number, h: number) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const px = x + xx, py = y + yy;
        if (px < 0 || py < 0 || px >= dim || py >= dim) continue;
        const s = (px + py * dim) * 4, d = (xx + yy * w) * 4;
        data[d]=buf[s];data[d+1]=buf[s+1];data[d+2]=buf[s+2];data[d+3]=buf[s+3];
      }
      return { data, width: w, height: h };
    },
    putImageData(img: { data: Uint8ClampedArray; width: number; height: number }, x: number, y: number) {
      for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
        const px = x + xx, py = y + yy;
        if (px < 0 || py < 0 || px >= dim || py >= dim) continue;
        const d = (px + py * dim) * 4, s = (xx + yy * img.width) * 4;
        buf[d]=img.data[s];buf[d+1]=img.data[s+1];buf[d+2]=img.data[s+2];buf[d+3]=img.data[s+3];
      }
    },
  };
  new IconGenerator(ctx as unknown as CanvasRenderingContext2D, dim, opts).generate({ seed, iconClass: cls });
  return buf;
}

const rows = seeds.length * classes.length;
const cols = VARIANTS.length;
const cell = DISPLAY + PAD;
const W = cols * cell + PAD;
const H = rows * cell + PAD;
const out = new Uint8ClampedArray(W * H * 4);
for (let i = 0; i < W * H; i++) { out[i*4]=24; out[i*4+1]=26; out[i*4+2]=32; out[i*4+3]=255; }

let row = 0;
for (const seed of seeds) for (const cls of classes) {
  VARIANTS.forEach((v, col) => {
    const dim = v.dim;
    const buf = render(dim, seed, cls, v.opts);
    const scale = DISPLAY / dim; // nearest-neighbor upscale
    const ox = PAD + col * cell, oy = PAD + row * cell;
    for (let y = 0; y < DISPLAY; y++) for (let x = 0; x < DISPLAY; x++) {
      const sx = Math.floor(x / scale), sy = Math.floor(y / scale);
      const si = (sx + sy * dim) * 4;
      if (buf[si + 3] === 0) continue;
      const di = (ox + x + (oy + y) * W) * 4;
      out[di]=buf[si];out[di+1]=buf[si+1];out[di+2]=buf[si+2];out[di+3]=255;
    }
  });
  row++;
}

const sharp = (await import("sharp")).default;
const outPath = process.argv[2] || "assets/compare.png";
await sharp(Buffer.from(out.buffer), { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPath);
console.log(`wrote ${outPath} (${W}x${H}) — columns: ${VARIANTS.map((v) => v.label).join(" | ")}`);
