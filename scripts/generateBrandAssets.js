/* Generate the logo + favicon set from the source artwork. */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC_ICON = '/Users/ender/Downloads/logo.png';
const SRC_WORDMARK = '/Users/ender/Downloads/logo_with_text.png';
const OUT_DIR = process.argv[2];
const SCRATCH = path.dirname(process.argv[1]);

const BG_MIN = 235; // min(r,g,b) at/above this is background
const BG_FULL = 248; // ...and at/above this it is fully transparent

async function knockOutWhite(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const out = Buffer.from(data);

  const minc = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const o = i * C;
    minc[i] = Math.min(data[o], data[o + 1], data[o + 2]);
  }

  // Flood fill the background from the borders so interior white stays opaque.
  const bg = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    const i = y * W + x;
    if (!bg[i] && minc[i] >= BG_MIN) { bg[i] = 1; stack.push(i); }
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % W, y = (i - x) / W;
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }

  // Graded alpha keeps anti-aliased edges soft instead of jagged.
  for (let i = 0; i < W * H; i++) {
    if (!bg[i]) continue;
    const a = minc[i] >= BG_FULL
      ? 0
      : Math.round(((BG_FULL - minc[i]) / (BG_FULL - BG_MIN)) * 255);
    out[i * C + 3] = Math.max(0, Math.min(255, a));
  }
  return { data: out, W, H, C };
}

function bbox({ data, W, H, C }) {
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * C + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// Square canvas with the mark centred and a small margin.
async function square(trimmed, box, size, { flattenWhite = false, margin = 0.04 } = {}) {
  const inner = Math.round(size * (1 - margin * 2));
  const scale = Math.min(inner / box.width, inner / box.height);
  const w = Math.max(1, Math.round(box.width * scale));
  const h = Math.max(1, Math.round(box.height * scale));
  const resized = await sharp(trimmed).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).toBuffer();

  let img = sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: resized, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) }]);

  if (flattenWhite) img = sharp(await img.png().toBuffer()).flatten({ background: '#ffffff' });
  // Quantise the larger icons; the tiny ones are already small and stay lossless.
  const png = size >= 128
    ? { compressionLevel: 9, palette: true, quality: 92, effort: 10 }
    : { compressionLevel: 9 };
  return img.png(png).toBuffer();
}

// Vista-style ICO with embedded PNGs.
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.buf.length;
  });
  return Buffer.concat([header, dir, ...entries.map(e => e.buf)]);
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = t => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}

// The "Hub" half of the wordmark is near-black navy; lift dark pixels so the
// wordmark stays legible on the dark theme's near-black sidebar.
function lightenForDark(data, W, H, C, fromX) {
  const out = Buffer.from(data);
  for (let y = 0; y < H; y++) {
    for (let x = fromX; x < W; x++) {
      const o = (y * W + x) * C;
      if (data[o + 3] === 0) continue;
      const [h, s, l] = rgbToHsl(data[o], data[o + 1], data[o + 2]);
      if (l >= 0.35) continue;
      const nl = 0.72 + (l / 0.35) * 0.12; // 0.72 -> 0.84, keeps some shading
      const [r, g, b] = hslToRgb(h, Math.min(s, 0.45), nl);
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
    }
  }
  return out;
}

(async () => {
  fs.mkdirSync(path.join(OUT_DIR, 'favicons'), { recursive: true });

  /* ---------- icon mark -> favicons ---------- */
  const icon = await knockOutWhite(SRC_ICON);
  const iconBox = bbox(icon);
  console.log('icon trim box', JSON.stringify(iconBox));
  const iconTrimmed = await sharp(icon.data, { raw: { width: icon.W, height: icon.H, channels: icon.C } })
    .extract(iconBox).png().toBuffer();

  const fav = path.join(OUT_DIR, 'favicons');
  const jobs = [
    ['favicon-16x16.png', 16, {}],
    ['favicon-32x32.png', 32, {}],
    ['android-chrome-192x192.png', 192, {}],
    ['android-chrome-512x512.png', 512, {}],
    ['apple-touch-icon.png', 180, { flattenWhite: true, margin: 0.08 }],
    ['mstile-150x150.png', 150, { flattenWhite: true, margin: 0.08 }],
  ];
  for (const [name, size, opts] of jobs) {
    fs.writeFileSync(path.join(fav, name), await square(iconTrimmed, iconBox, size, opts));
    console.log('wrote favicons/' + name);
  }
  const ico = buildIco(await Promise.all([16, 32, 48, 64].map(async size => ({
    size, buf: await square(iconTrimmed, iconBox, size, {})
  }))));
  fs.writeFileSync(path.join(fav, 'favicon.ico'), ico);
  console.log('wrote favicons/favicon.ico', ico.length, 'bytes');

  // Square icon for in-app use (collapsed sidebar), 4x the rendered size.
  fs.writeFileSync(path.join(OUT_DIR, 'logo-icon.png'), await square(iconTrimmed, iconBox, 128, {}));
  console.log('wrote logo-icon.png');

  /* ---------- wordmark -> sidebar / header ---------- */
  const { data: wData, info: wInfo } = await sharp(SRC_WORDMARK).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const w = { data: wData, W: wInfo.width, H: wInfo.height, C: wInfo.channels };
  const wBox = bbox(w);
  console.log('wordmark trim box', JSON.stringify(wBox));

  const OUT_W = 480; // ~3.5x the largest rendered size
  const outH = Math.round((wBox.height / wBox.width) * OUT_W);
  const variants = [
    ['logo-wordmark.png', w.data],
    ['logo-wordmark-dark.png', lightenForDark(w.data, w.W, w.H, w.C, 850)],
  ];
  for (const [name, buf] of variants) {
    await sharp(buf, { raw: { width: w.W, height: w.H, channels: w.C } })
      .extract(wBox)
      .resize(OUT_W, outH, { kernel: 'lanczos3' })
      .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
      .toFile(path.join(OUT_DIR, name));
    console.log('wrote', name, OUT_W + 'x' + outH);
  }

  /* ---------- previews ---------- */
  for (const [name, bg] of [['light', '#ffffff'], ['dark', '#1B1B1C']]) {
    const wm = name === 'dark' ? 'logo-wordmark-dark.png' : 'logo-wordmark.png';
    const wmBuf = await sharp(path.join(OUT_DIR, wm)).resize({ width: 320 }).toBuffer();
    const meta = await sharp(wmBuf).metadata();
    await sharp({ create: { width: 400, height: meta.height + 80, channels: 4, background: bg } })
      .composite([{ input: wmBuf, left: 40, top: 40 }])
      .png().toFile(path.join(SCRATCH, `preview-wordmark-${name}.png`));
  }
  fs.writeFileSync(path.join(SCRATCH, 'preview-icon-32.png'), await square(iconTrimmed, iconBox, 32, {}));
  fs.writeFileSync(path.join(SCRATCH, 'preview-icon-16.png'), await square(iconTrimmed, iconBox, 16, {}));
  console.log('wrote previews to', SCRATCH);
})();
