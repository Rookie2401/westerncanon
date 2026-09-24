#!/usr/bin/env node
import sharp from 'sharp';
const [, , inPath, outPath, leftS, topS, widthS, heightS, darkS, lightS, maskS] = process.argv;
if (!inPath || !outPath || leftS === undefined) { console.error('usage: cropTool.mjs <in.jpg> <out.png> <left> <top> <width> <height> [darkLum=150] [lightLum=222] [maskBoxesJson]'); process.exit(1); }
const left = parseInt(leftS, 10), top = parseInt(topS, 10), width = parseInt(widthS, 10), height = parseInt(heightS, 10);
const darkLum = darkS ? parseFloat(darkS) : 150;
const lightLum = lightS ? parseFloat(lightS) : 222;
const maskBoxes = maskS ? JSON.parse(maskS) : [];
async function main() {
  const img = sharp(inPath).rotate();
  const meta = await img.metadata();
  console.error(`source: ${meta.width}x${meta.height}`);
  const extracted = img.extract({ left, top, width, height }).ensureAlpha();
  const { data, info } = await extracted.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = (y * w + x) * channels;
    const r = data[si], g = data[si + 1], b = data[si + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let alpha;
    if (lum <= darkLum) alpha = 255; else if (lum >= lightLum) alpha = 0; else alpha = Math.round(((lightLum - lum) / (lightLum - darkLum)) * 255);
    for (const mb of maskBoxes) { if (x >= mb.x && x < mb.x + mb.w && y >= mb.y && y < mb.y + mb.h) { alpha = 0; break; } }
    const di = (y * w + x) * 4;
    out[di] = 0; out[di + 1] = 0; out[di + 2] = 0; out[di + 3] = alpha;
  }
  const composed = sharp(out, { raw: { width: w, height: h, channels: 4 } }).png();
  const noTrim = process.env.NOTRIM === '1';
  const trimmed = noTrim ? { data: await composed.toBuffer(), info: { width: w, height: h } } : await composed.trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  await sharp(trimmed.data).toFile(outPath);
  const previewPath = outPath.replace(/\.png$/, '.preview.png');
  await sharp(trimmed.data).flatten({ background: '#ffffff' }).toFile(previewPath);
  console.log(JSON.stringify({ width: trimmed.info.width, height: trimmed.info.height, outPath, previewPath }));
}
main().catch((e) => { console.error(e); process.exit(1); });
