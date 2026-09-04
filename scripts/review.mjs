import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { IconGenerator } from "../src/generator.ts";

const GUARDS = [
  "bar", "swept", "wings", "disc", "spiked", "hook", "hourglass",
  "langets", "sidering", "trilobe", "cup", "starburst", "knucklebow", "basket", "none",
];
const dim = 40; // real list-icon nativeDim
const seeds = 4;
const scale = 3;
const pad = 4;
const cellW = dim + pad;
const sheet = createCanvas(cellW * seeds * scale, (dim + pad) * GUARDS.length * scale);
const sctx = sheet.getContext("2d");
sctx.imageSmoothingEnabled = false;
sctx.fillStyle = "#20222b";
sctx.fillRect(0, 0, sheet.width, sheet.height);

GUARDS.forEach((guard, row) => {
  for (let s = 0; s < seeds; s++) {
    const tile = createCanvas(dim, dim);
    new IconGenerator(tile.getContext("2d"), dim, {}).generate({
      seed: `review2-${guard}-${s}`,
      iconClass: "blades",
      parts: { blades: { profile: "knight", guard, pommel: "none", twoHanded: false } },
    });
    const x = pad / 2 + s * cellW * scale;
    const y = pad / 2 + row * (dim + pad) * scale;
    sctx.drawImage(tile, x, y, dim * scale, dim * scale);
  }
});

writeFileSync(process.argv[2] ?? "review.png", sheet.toBuffer("image/png"));
console.log(GUARDS.join(", "));
