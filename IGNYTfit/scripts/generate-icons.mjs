/**
 * Rasterises the brand mark into the PNG sizes the web manifest, Apple touch
 * icon and legacy favicon need.
 *
 * Run with `npm run icons` after changing `public/logo-mark.svg`. The outputs
 * are committed, so this is not part of the build — CI never needs `sharp`.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = await readFile(path.join(root, "public", "logo-mark.svg"));

/** [output path relative to repo root, pixel size] */
const targets = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["src/app/apple-icon.png", 180],
  ["src/app/icon1.png", 48],
];

for (const [target, size] of targets) {
  const png = await sharp(source, { density: 512 })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(root, target), png);
  console.log(`wrote ${target} (${size}×${size}, ${png.length} bytes)`);
}
