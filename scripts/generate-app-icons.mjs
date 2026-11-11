/**
 * Generate the OptiStance app icon set.
 *
 * The project has no image toolchain available (no ImageMagick, no rsvg, no
 * Python), so the icons are rasterised here with a small dependency-free PNG
 * encoder built on Node's zlib. That keeps icon generation reproducible on any
 * machine that can run `npm run build`, which is the whole point.
 *
 * Design: a violet gradient plate with a white cheer figure in a high-V and a
 * stance leg -- the app's core gesture. The mark is defined once in a 0..100
 * space and reused for every variant, so all densities stay consistent.
 *
 * Outputs:
 *   - Android legacy icons        mipmap-<density>/ic_launcher.png (+ _round)
 *   - Android adaptive foreground mipmap-<density>/ic_launcher_foreground.png
 *   - PWA / web icons             public/icons/...
 *
 * Run: node scripts/generate-app-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

/** Encode RGBA bytes (width * height * 4) as a PNG buffer. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type (0 = None).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** The cheer figure, in a 0..100 box. */
const FIGURE = {
  head: { cx: 50, cy: 24, r: 7.6 },
  limbs: [
    { a: [50, 32.5], b: [50, 57], w: 6.6 }, // torso
    { a: [50, 37.5], b: [23.5, 11], w: 6.0 }, // left arm, high V
    { a: [50, 37.5], b: [76.5, 11], w: 6.0 }, // right arm, high V
    { a: [50, 57], b: [32.5, 87], w: 6.6 }, // stance leg
    { a: [50, 57], b: [71, 77.5], w: 6.0 }, // lifted leg
  ],
};

const distToSegment = (px, py, [ax, ay], [bx, by]) => {
  const vx = bx - ax;
  const vy = by - ay;
  const lenSq = vx * vx + vy * vy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / lenSq));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
};

function inFigure(x, y) {
  const { cx, cy, r } = FIGURE.head;
  if (Math.hypot(x - cx, y - cy) <= r) return true;
  return FIGURE.limbs.some(({ a, b, w }) => distToSegment(x, y, a, b) <= w / 2);
}

const inRoundedRect = (x, y, size, radius) => {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
};

const inCircle = (x, y, size) => Math.hypot(x - size / 2, y - size / 2) <= size / 2;

// ---------------------------------------------------------------------------
// Paint
// ---------------------------------------------------------------------------

const BRAND = {
  light: [167, 139, 250], // #a78bfa
  mid: [124, 58, 237], // #7c3aed
  dark: [76, 29, 149], // #4c1d95
};

const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/** Diagonal violet gradient across the plate. */
function gradientAt(t) {
  return t < 0.5 ? mix(BRAND.light, BRAND.mid, t * 2) : mix(BRAND.mid, BRAND.dark, (t - 0.5) * 2);
}

/**
 * Rasterise one icon variant.
 *
 * @param {number} size          output edge length in px
 * @param {object} opts
 * @param {'rounded'|'circle'|'square'|'none'} opts.plate  background shape
 * @param {number} opts.inset     plate inset as a fraction of the canvas
 * @param {number} opts.markScale figure size as a fraction of the canvas
 * @param {boolean} opts.markOnly transparent plate, figure only
 * @param {number} opts.samples   supersampling factor per axis
 */
function renderIcon(size, { plate = 'rounded', inset = 0, markScale = 0.62, markOnly = false, samples = 3 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const plateSize = size * (1 - inset * 2);
  const radius = plateSize * 0.2237; // iOS-style squircle approximation
  const markEdge = size * markScale;
  const markOffset = (size - markEdge) / 2;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let plateHits = 0;
      let markHits = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = px + (sx + 0.5) / samples;
          const y = py + (sy + 0.5) / samples;

          // Plate hit test, in plate-local coordinates.
          if (markOnly) {
            plateHits += 1;
          } else {
            const lx = (x - inset * size) / (plateSize / plateSize) - 0; // plate-local px
            const localX = x - inset * size;
            const localY = y - inset * size;
            void lx;
            const inside =
              plate === 'circle'
                ? inCircle(localX, localY, plateSize)
                : plate === 'square'
                  ? localX >= 0 && localY >= 0 && localX <= plateSize && localY <= plateSize
                  : inRoundedRect(localX, localY, plateSize, radius);
            if (inside) plateHits += 1;
          }

          // Figure hit test: map the canvas into the 0..100 figure space.
          const fx = ((x - markOffset) / markEdge) * 100;
          const fy = ((y - markOffset) / markEdge) * 100;
          if (inFigure(fx, fy)) markHits += 1;
        }
      }

      const total = samples * samples;
      const plateCov = plateHits / total;
      const markCov = markHits / total;

      // Diagonal gradient parameter for this pixel.
      const t = Math.min(1, Math.max(0, (px / size) * 0.35 + (py / size) * 0.65));
      const base = gradientAt(t);
      const white = [255, 255, 255];

      // Composite the white figure over the gradient, then apply plate alpha.
      const r = Math.round(base[0] + (white[0] - base[0]) * markCov);
      const g = Math.round(base[1] + (white[1] - base[1]) * markCov);
      const b = Math.round(base[2] + (white[2] - base[2]) * markCov);

      const offset = (py * size + px) * 4;
      if (markOnly) {
        rgba[offset] = 255;
        rgba[offset + 1] = 255;
        rgba[offset + 2] = 255;
        rgba[offset + 3] = Math.round(markCov * 255);
      } else {
        rgba[offset] = r;
        rgba[offset + 1] = g;
        rgba[offset + 2] = b;
        rgba[offset + 3] = Math.round(plateCov * 255);
      }
    }
  }

  return encodePng(size, size, rgba);
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

/** Android density bucket -> legacy launcher icon edge in px. */
const ANDROID = [
  ['mdpi', 48],
  ['hdpi', 72],
  ['xhdpi', 96],
  ['xxhdpi', 144],
  ['xxxhdpi', 192],
];

/** Android density bucket -> adaptive foreground edge in px (108dp). */
const ANDROID_FOREGROUND = [
  ['mdpi', 108],
  ['hdpi', 162],
  ['xhdpi', 216],
  ['xxhdpi', 324],
  ['xxxhdpi', 432],
];

const written = [];

const emit = (relPath, buffer) => {
  const target = resolve(ROOT, relPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  written.push(`${relPath} (${buffer.length} bytes)`);
};

for (const [density, edge] of ANDROID) {
  const base = `android/app/src/main/res/mipmap-${density}`;
  emit(`${base}/ic_launcher.png`, renderIcon(edge, { plate: 'rounded', markScale: 0.66 }));
  emit(`${base}/ic_launcher_round.png`, renderIcon(edge, { plate: 'circle', markScale: 0.6 }));
}

for (const [density, edge] of ANDROID_FOREGROUND) {
  // Adaptive foregrounds are 108dp with only the centre ~66dp guaranteed
  // visible, so the mark is kept small and the plate is transparent.
  emit(`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`, renderIcon(edge, { markOnly: true, markScale: 0.58 }));
}

emit('public/icons/icon-192.png', renderIcon(192, { plate: 'rounded', markScale: 0.66 }));
emit('public/icons/icon-512.png', renderIcon(512, { plate: 'rounded', markScale: 0.66 }));
// Maskable icons get cropped to a circle by some launchers, so the mark is
// pulled into the safe zone and the plate bleeds to every edge.
emit('public/icons/icon-maskable-512.png', renderIcon(512, { plate: 'square', markScale: 0.5 }));
// iOS does not round apple-touch-icons itself and dislikes transparency.
emit('public/icons/apple-touch-icon-180.png', renderIcon(180, { plate: 'square', markScale: 0.62 }));
emit('public/favicon-32.png', renderIcon(32, { plate: 'rounded', markScale: 0.68, samples: 4 }));

console.log('Wrote app icons:');
for (const line of written) console.log('  ' + line);
