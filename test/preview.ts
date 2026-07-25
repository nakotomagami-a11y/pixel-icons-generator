/**
 * Render a preview sheet of generated icons to PNG. Run with the monorepo's
 * sharp available: `bun test/preview.ts <out.png>`
 */
import { IconGenerator } from "../src/generator";
import type { IconClass } from "../src/types";

const DIM = 32;
const SCALE = 6;
const COLS = 8;
const PAD = 4;

function parseColor(s: string): [number, number, number, number] {
  if (s === "white") return [255, 255, 255, 255];
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 255];
  const p = m[1].split(",").map((v) => parseFloat(v.trim()));
  return [p[0], p[1], p[2], p[3] === undefined ? 255 : Math.round(p[3] * 255)];
}

class MockCtx {
  fillStyle = "black";
  globalCompositeOperation = "source-over";
  buf = new Uint8ClampedArray(DIM * DIM * 4);
  private tx = 0;
  private ty = 0;
  translate(x: number, y: number) { this.tx += x; this.ty += y; }
  save() {}
  restore() {}
  fillRect(x: number, y: number, w: number, h: number) {
    const [r, g, b, a] = parseColor(this.fillStyle);
    for (let yy = Math.floor(y); yy < Math.floor(y) + Math.round(h); yy++)
      for (let xx = Math.floor(x); xx < Math.floor(x) + Math.round(w); xx++) {
        const px = xx + this.tx, py = yy + this.ty;
        if (px < 0 || py < 0 || px >= DIM || py >= DIM) continue;
        const i = (px + py * DIM) * 4;
        this.buf[i] = r; this.buf[i + 1] = g; this.buf[i + 2] = b; this.buf[i + 3] = a;
      }
  }
  clearRect(x: number, y: number, w: number, h: number) {
    const x0 = Math.floor(Math.min(x, x + w)), x1 = Math.floor(Math.max(x, x + w));
    const y0 = Math.floor(Math.min(y, y + h)), y1 = Math.floor(Math.max(y, y + h));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const px = xx + this.tx, py = yy + this.ty;
      if (px < 0 || py < 0 || px >= DIM || py >= DIM) continue;
      const i = (px + py * DIM) * 4;
      this.buf[i] = this.buf[i + 1] = this.buf[i + 2] = this.buf[i + 3] = 0;
    }
  }
  getImageData(x: number, y: number, w: number, h: number) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const px = x + xx, py = y + yy;
      if (px < 0 || py < 0 || px >= DIM || py >= DIM) continue;
      const s = (px + py * DIM) * 4, d = (xx + yy * w) * 4;
      data[d] = this.buf[s]; data[d + 1] = this.buf[s + 1]; data[d + 2] = this.buf[s + 2]; data[d + 3] = this.buf[s + 3];
    }
    return { data, width: w, height: h };
  }
  putImageData(img: { data: Uint8ClampedArray; width: number; height: number }, x: number, y: number) {
    for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
      const px = x + xx, py = y + yy;
      if (px < 0 || py < 0 || px >= DIM || py >= DIM) continue;
      const d = (px + py * DIM) * 4, s = (xx + yy * img.width) * 4;
      this.buf[d] = img.data[s]; this.buf[d + 1] = img.data[s + 1]; this.buf[d + 2] = img.data[s + 2]; this.buf[d + 3] = img.data[s + 3];
    }
  }
}

const specs: { cls: IconClass; n: number }[] = [
  { cls: "blades", n: COLS },
  { cls: "spears", n: COLS },
  { cls: "potions", n: COLS },
];

const cell = DIM * SCALE + PAD;
const rows = specs.length;
const W = COLS * cell + PAD;
const H = rows * cell + PAD;
const out = new Uint8ClampedArray(W * H * 4);
// dark background
for (let i = 0; i < W * H; i++) { out[i * 4] = 24; out[i * 4 + 1] = 26; out[i * 4 + 2] = 32; out[i * 4 + 3] = 255; }

specs.forEach((spec, row) => {
  for (let col = 0; col < spec.n; col++) {
    const ctx = new MockCtx();
    new IconGenerator(ctx as unknown as CanvasRenderingContext2D, DIM).generate({ seed: `${spec.cls}-${col}`, iconClass: spec.cls });
    const ox = PAD + col * cell;
    const oy = PAD + row * cell;
    for (let y = 0; y < DIM; y++) for (let x = 0; x < DIM; x++) {
      const si = (x + y * DIM) * 4;
      const a = ctx.buf[si + 3];
      if (a === 0) continue;
      for (let sy = 0; sy < SCALE; sy++) for (let sx = 0; sx < SCALE; sx++) {
        const px = ox + x * SCALE + sx, py = oy + y * SCALE + sy;
        const di = (px + py * W) * 4;
        out[di] = ctx.buf[si]; out[di + 1] = ctx.buf[si + 1]; out[di + 2] = ctx.buf[si + 2]; out[di + 3] = 255;
      }
    }
  }
});

const sharp = (await import("sharp")).default;
const outPath = process.argv[2] || "assets/preview.png";
await sharp(Buffer.from(out.buffer), { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPath);
console.log(`wrote ${outPath} (${W}x${H})`);
