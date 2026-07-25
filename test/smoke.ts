/**
 * Headless smoke test: run each generator and assert it draws pixels without
 * throwing. Uses a minimal buffer-backed 2D context mock. Run: `bun test/smoke.ts`
 */
import { IconGenerator } from "../src/generator";
import type { IconClass } from "../src/types";

const DIM = 32;

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
  private buf = new Uint8ClampedArray(DIM * DIM * 4);
  private tx = 0;
  private ty = 0;

  translate(x: number, y: number) {
    this.tx += x;
    this.ty += y;
  }
  save() {}
  restore() {}

  fillRect(x: number, y: number, w: number, h: number) {
    const [r, g, b, a] = parseColor(this.fillStyle);
    for (let yy = Math.floor(y); yy < Math.floor(y) + Math.round(h); yy++) {
      for (let xx = Math.floor(x); xx < Math.floor(x) + Math.round(w); xx++) {
        const px = xx + this.tx;
        const py = yy + this.ty;
        if (px < 0 || py < 0 || px >= DIM || py >= DIM) continue;
        const i = (px + py * DIM) * 4;
        this.buf[i] = r;
        this.buf[i + 1] = g;
        this.buf[i + 2] = b;
        this.buf[i + 3] = a;
      }
    }
  }

  clearRect(x: number, y: number, w: number, h: number) {
    const x0 = Math.floor(Math.min(x, x + w));
    const x1 = Math.floor(Math.max(x, x + w));
    const y0 = Math.floor(Math.min(y, y + h));
    const y1 = Math.floor(Math.max(y, y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const px = xx + this.tx;
        const py = yy + this.ty;
        if (px < 0 || py < 0 || px >= DIM || py >= DIM) continue;
        const i = (px + py * DIM) * 4;
        this.buf[i] = this.buf[i + 1] = this.buf[i + 2] = this.buf[i + 3] = 0;
      }
    }
  }

  getImageData(x: number, y: number, w: number, h: number) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const px = x + xx;
        const py = y + yy;
        if (px < 0 || py < 0 || px >= DIM || py >= DIM) continue;
        const src = (px + py * DIM) * 4;
        const dst = (xx + yy * w) * 4;
        data[dst] = this.buf[src];
        data[dst + 1] = this.buf[src + 1];
        data[dst + 2] = this.buf[src + 2];
        data[dst + 3] = this.buf[src + 3];
      }
    }
    return { data, width: w, height: h };
  }

  putImageData(img: { data: Uint8ClampedArray; width: number; height: number }, x: number, y: number) {
    for (let yy = 0; yy < img.height; yy++) {
      for (let xx = 0; xx < img.width; xx++) {
        const px = x + xx;
        const py = y + yy;
        if (px < 0 || py < 0 || px >= DIM || py >= DIM) continue;
        const dst = (px + py * DIM) * 4;
        const src = (xx + yy * img.width) * 4;
        this.buf[dst] = img.data[src];
        this.buf[dst + 1] = img.data[src + 1];
        this.buf[dst + 2] = img.data[src + 2];
        this.buf[dst + 3] = img.data[src + 3];
      }
    }
  }

  opaquePixels(): number {
    let n = 0;
    for (let i = 3; i < this.buf.length; i += 4) if (this.buf[i] > 0) n++;
    return n;
  }
}

const classes: IconClass[] = ["blades", "spears", "axes"];
let ok = true;
for (const iconClass of classes) {
  // multiple seeds to exercise different random branches
  for (const seed of ["excalibur", "abc123", "zzz", "seed-4", "longbow-of-doom"]) {
    const ctx = new MockCtx();
    // deterministic double-run must be identical
    new IconGenerator(ctx as unknown as CanvasRenderingContext2D, DIM).generate({ seed, iconClass });
    const a = ctx.opaquePixels();

    const ctx2 = new MockCtx();
    new IconGenerator(ctx2 as unknown as CanvasRenderingContext2D, DIM).generate({ seed, iconClass });
    const b = ctx2.opaquePixels();

    const pass = a > 20 && a === b;
    if (!pass) ok = false;
    console.log(`${iconClass.padEnd(8)} "${seed}"  pixels=${a}  deterministic=${a === b} ${pass ? "OK" : "FAIL"}`);
  }
}

// meta-selector resolves deterministically
const c1 = new MockCtx();
const drawn1 = new IconGenerator(c1 as unknown as CanvasRenderingContext2D, DIM).generate({ seed: "meta", iconClass: "anyweapon" });
const c2 = new MockCtx();
const drawn2 = new IconGenerator(c2 as unknown as CanvasRenderingContext2D, DIM).generate({ seed: "meta", iconClass: "anyweapon" });
console.log(`anyweapon "meta" -> ${drawn1} (stable=${drawn1 === drawn2})`);
if (drawn1 !== drawn2 || (drawn1 !== "blades" && drawn1 !== "spears")) ok = false;

if (!ok) {
  console.error("SMOKE TEST FAILED");
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
