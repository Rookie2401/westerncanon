/**
 * Shared crop/threshold tool for sourcing real Heiberg-edition diagram images
 * (group B: floating-bodies, method, stomachion, liber-assumptorum,
 * sand-reckoner). Matches the pixel format of the existing hand-cropped
 * diagrams already bundled for Sphere & Cylinder / Measurement of a Circle /
 * Conoids & Spheroids / Plane Equilibrium: pure black ink on a transparent
 * background, produced by converting scan luminance directly to an alpha
 * channel (the scanned page's aged-paper background disappears; ink becomes
 * opaque black), so the app can use it as a CSS mask in its own accent
 * colour.
 *
 * Usage:
 *   npx tsx cropDiagram.ts <inputJpgPath> <x0> <y0> <x1> <y1> <outputPngPath> [threshold=200]
 *
 * x0,y0,x1,y1 are pixel coordinates in the INPUT image (full-resolution IIIF
 * leaf jpg) defining the crop rectangle (top-left, bottom-right). threshold
 * (0-255) is the luminance cutoff below which a pixel is treated as ink
 * (opaque); above it, transparent. Prints the output image's final
 * width/height on success (paste directly into group-b.ts).
 */
import sharp from 'sharp';

async function main() {
  const [inPath, x0s, y0s, x1s, y1s, outPath, thresholdS] = process.argv.slice(2);
  if (!inPath || !outPath) {
    console.error(
      'Usage: npx tsx cropDiagram.ts <inputJpgPath> <x0> <y0> <x1> <y1> <outputPngPath> [threshold=200]',
    );
    process.exit(1);
  }
  const x0 = Math.round(Number(x0s));
  const y0 = Math.round(Number(y0s));
  const x1 = Math.round(Number(x1s));
  const y1 = Math.round(Number(y1s));
  const threshold = thresholdS ? Number(thresholdS) : 200;
  const width = x1 - x0;
  const height = y1 - y0;
  if (width <= 0 || height <= 0) {
    console.error(`Bad crop rectangle: ${width}x${height}`);
    process.exit(1);
  }

  const cropped = sharp(inPath).extract({ left: x0, top: y0, width, height }).ensureAlpha();
  const { data, info } = await cropped.raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    // Ink (dark) -> opaque black. Paper/background (light) -> transparent.
    const alpha = luminance <= threshold ? Math.round(255 * (1 - luminance / threshold)) : 0;
    out[i] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = Math.max(0, Math.min(255, alpha));
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outPath);

  console.log(`OK ${outPath} ${info.width}x${info.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
