// Grid of every blade guard at real app render sizes (nativeDim 60).
// `bun scripts/preview-guards.mjs [out.png]`
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { IconGenerator } from "../src/generator.ts";

const GUARDS = [
  "bar", "swept", "wings", "disc", "spiked", "hook", "hourglass",
  "langets", "sidering", "trilobe", "cup", "starburst", "knucklebow", "basket", "none",
];
const dim = 60;
const cols = GUARDS.length;
const pad = 6;
const scale = 4;
const sheet = createCanvas((dim + pad) * cols * scale, (dim + pad) * scale);
const sctx = sheet.getContext("2d");
sctx.imageSmoothingEnabled = false;
sctx.fillStyle = "#20222b";
sctx.fillRect(0, 0, sheet.width, sheet.height);

GUARDS.forEach((guard, i) => {
  const tile = createCanvas(dim, dim);
  const tctx = tile.getContext("2d");
  new IconGenerator(tctx, dim, {}).generate({
    seed: `guard-${guard}`,
    iconClass: "blades",
    parts: { blades: { profile: "knight", guard, pommel: "none", twoHanded: false } },
  });
  const x = pad + i * (dim + pad);
  sctx.drawImage(tile, x * scale, pad * scale, dim * scale, dim * scale);
});

writeFileSync(process.argv[2] ?? "preview-guards.png", sheet.toBuffer("image/png"));
console.log(GUARDS.join(", "));
