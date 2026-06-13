/**
 * Generates PWA launcher icons from public/favicon.png.
 * - "any" icons: slight inset so launchers do not crop the artwork.
 * - "maskable" icon: logo in the center safe zone (Android adaptive icons).
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'public/favicon.png');
const outDir = path.join(root, 'public');

/** Matches favicon / theme (dark) — keeps icon look consistent on home screen. */
const BACKGROUND = { r: 0, g: 0, b: 0, alpha: 1 };

async function writeSquareIcon({ size, innerScale, filename }) {
  const inner = Math.round(size * innerScale);
  const logo = await sharp(sourcePath)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const offset = Math.round((size - inner) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toFile(path.join(outDir, filename));

  console.log(`Wrote public/${filename} (${size}×${size}, inner ${innerScale * 100}%)`);
}

async function main() {
  await writeSquareIcon({ size: 192, innerScale: 0.9, filename: 'pwa-192.png' });
  await writeSquareIcon({ size: 512, innerScale: 0.9, filename: 'pwa-512.png' });
  // Maskable safe zone ≈ central 80% circle → keep artwork around 70% of canvas.
  await writeSquareIcon({ size: 512, innerScale: 0.7, filename: 'pwa-maskable-512.png' });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
