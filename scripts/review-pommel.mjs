import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { IconGenerator } from "../src/generator.ts";

const POMMELS = [
  "round", "gem", "faceted", "wheel", "ring", "trefoil",
  "acorn", "scentstopper", "spike", "flanged", "crown", "birdhead", "none",
];
const dim = 40;
const seeds = 4;
const scale = 3;
const pad = 4;
const cellW = dim + pad;
const sheet = createCanvas(cellW * seeds * scale, (dim + pad) * POMMELS.length * scale);
const sctx = sheet.getContext("2d");
sctx.imageSmoothingEnabled = false;
sctx.fillStyle = "#20222b";
sctx.fillRect(0, 0, sheet.width, sheet.height);

POMMELS.forEach((pommel, row) => {
  for (let s = 0; s < seeds; s++) {
    const tile = createCanvas(dim, dim);
    new IconGenerator(tile.getContext("2d"), dim, {}).generate({
      seed: `preview2-${pommel}-${s}`,
      iconClass: "blades",
      parts: { blades: { profile: "knight", guard: "none", pommel, twoHanded: false } },
    });
    const x = pad / 2 + s * cellW * scale;
    const y = pad / 2 + row * (dim + pad) * scale;
    sctx.drawImage(tile, x, y, dim * scale, dim * scale);
  }
});

writeFileSync(process.argv[2] ?? "review-pommel.png", sheet.toBuffer("image/png"));
console.log(POMMELS.join(", "));
