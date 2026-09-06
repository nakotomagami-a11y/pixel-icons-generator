// Blazon preview: render every blazon across a few seeds and shapes so each
// material/texture can be eyeballed and refined one at a time.
// Run: `bun scripts/preview-blazons.mjs`
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { Pen } from "../src/pen.ts";
import { drawShield } from "../src/weapons/shield.ts";

const BLAZONS = ["planked", "riveted", "hammered", "brushed", "bone", "scaled", "leather", "weave", "verdigris", "crystal"];
const SHAPES = ["heater", "round", "kite", "tower"];
const cols = SHAPES.length * 2; // two seeds per shape
const rows = BLAZONS.length;
const nativeDim = 64;
const pad = 8;
const scale = 3;
const cell = nativeDim;
const labelW = 84;

const sheetW = labelW + cols * (cell + pad) + pad;
const sheetH = rows * (cell + pad) + pad;
const sheet = createCanvas(sheetW * scale, sheetH * scale);
const sctx = sheet.getContext("2d");
sctx.imageSmoothingEnabled = false;
sctx.fillStyle = "#20222b";
sctx.fillRect(0, 0, sheetW * scale, sheetH * scale);
sctx.fillStyle = "#cdd3df";
sctx.font = `${11 * scale}px sans-serif`;
sctx.textBaseline = "middle";

for (let row = 0; row < rows; row++) {
  const blazon = BLAZONS[row];
  const y = pad + row * (cell + pad);
  sctx.fillText(blazon, 6 * scale, (y + cell / 2) * scale);
  let col = 0;
  for (const shape of SHAPES) {
    for (let sdi = 0; sdi < 2; sdi++) {
      const tile = createCanvas(nativeDim, nativeDim);
      const tctx = tile.getContext("2d");
      const pen = new Pen(tctx, nativeDim, {});
      pen.rng.seed(`blazon-${blazon}-${shape}-${sdi}`);
      drawShield(pen, { blazon, shape });
      const x = labelW + pad + col * (cell + pad);
      sctx.drawImage(tile, x * scale, y * scale, cell * scale, cell * scale);
      col++;
    }
  }
}

writeFileSync("preview-blazons.png", sheet.toBuffer("image/png"));
console.log("wrote preview-blazons.png");
