import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePNG(width, height, drawFn) {
  // RGBA buffer: width * height * 4
  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }

  // Scanlines with filter byte 0
  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLen);

  for (let y = 0; y < height; y++) {
    rawData[y * scanlineLen] = 0; // Filter: None
    pixels.copy(rawData, y * scanlineLen + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = writeChunk('IHDR', ihdr);
  const idatChunk = writeChunk('IDAT', deflated);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Distance to rounded rectangle
function distToRoundRect(x, y, rx, ry, rw, rh, r) {
  const cx = Math.max(rx + r, Math.min(x, rx + rw - r));
  const cy = Math.max(ry + r, Math.min(y, ry + rh - r));
  const dx = x - cx;
  const dy = y - cy;
  return Math.sqrt(dx * dx + dy * dy) - r;
}

// Generate Standard App Icon (with rounded corners)
function drawStandardIcon(x, y, w, h) {
  const normX = x / w;
  const normY = y / h;

  // Background rounded squircle / square
  const cornerRadius = w * 0.22;
  const pad = w * 0.04;
  const dist = distToRoundRect(x, y, pad, pad, w - pad * 2, h - pad * 2, cornerRadius);

  if (dist > 1) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Smooth antialiased boundary
  const alphaOuter = dist <= 0 ? 1 : Math.max(0, 1 - dist);

  // Vibrant Blue Gradient background (#2563eb to #1d4ed8)
  const bgR = Math.round(37 - 8 * normY);
  const bgG = Math.round(99 - 21 * normY);
  const bgB = Math.round(235 - 19 * normY);

  // Drawing elements inside icon:
  // White notebook sheet
  const sheetPadX = w * 0.22;
  const sheetPadY = h * 0.22;
  const sheetW = w * 0.56;
  const sheetH = h * 0.58;
  const sheetCorner = w * 0.08;
  const sheetDist = distToRoundRect(x, y, sheetPadX, sheetPadY, sheetW, sheetH, sheetCorner);

  if (sheetDist <= 0) {
    // Ruled lines on sheet
    const relY = (y - sheetPadY) / sheetH;
    const relX = (x - sheetPadX) / sheetW;

    // Header strip on sheet (blue accent)
    if (relY < 0.22) {
      return [239, 246, 255, Math.round(255 * alphaOuter)];
    }

    // Ruled notebook lines
    const lineY1 = Math.abs(relY - 0.42) * sheetH;
    const lineY2 = Math.abs(relY - 0.62) * sheetH;
    const lineY3 = Math.abs(relY - 0.80) * sheetH;

    if (relX > 0.18 && relX < 0.82 && (lineY1 < w * 0.016 || lineY2 < w * 0.016 || lineY3 < w * 0.016)) {
      return [203, 213, 225, Math.round(255 * alphaOuter)];
    }

    // Left red margin
    const marginDist = Math.abs(relX - 0.22) * sheetW;
    if (marginDist < w * 0.012) {
      return [248, 113, 113, Math.round(255 * alphaOuter)];
    }

    // Sheet body white
    return [255, 255, 255, Math.round(255 * alphaOuter)];
  }

  // Pencil / Stylus symbol (slanted in bottom right)
  const penX = (normX - 0.65) * w;
  const penY = (normY - 0.65) * h;
  const rotX = (penX + penY) * 0.7071;
  const rotY = (-penX + penY) * 0.7071;

  if (Math.abs(rotY) < w * 0.065 && rotX > -w * 0.18 && rotX < w * 0.24) {
    // Stylus body golden amber / cyan accent
    return [245, 158, 11, Math.round(255 * alphaOuter)];
  }

  return [bgR, bgG, bgB, Math.round(255 * alphaOuter)];
}

// Generate Maskable App Icon (full bleed background, center 60% safe area for Android adaptive icons)
function drawMaskableIcon(x, y, w, h) {
  const normX = x / w;
  const normY = y / h;

  // Vibrant Blue Gradient full bleed
  let r = Math.round(37 - 8 * normY);
  let g = Math.round(99 - 21 * normY);
  let b = Math.round(235 - 19 * normY);

  // Inner notebook sheet strictly inside the 70% safe zone
  const sheetPadX = w * 0.26;
  const sheetPadY = h * 0.26;
  const sheetW = w * 0.48;
  const sheetH = h * 0.50;
  const sheetCorner = w * 0.07;
  const sheetDist = distToRoundRect(x, y, sheetPadX, sheetPadY, sheetW, sheetH, sheetCorner);

  if (sheetDist <= 0) {
    const relY = (y - sheetPadY) / sheetH;
    const relX = (x - sheetPadX) / sheetW;

    if (relY < 0.22) {
      return [239, 246, 255, 255];
    }

    const lineY1 = Math.abs(relY - 0.42) * sheetH;
    const lineY2 = Math.abs(relY - 0.62) * sheetH;
    const lineY3 = Math.abs(relY - 0.80) * sheetH;

    if (relX > 0.18 && relX < 0.82 && (lineY1 < w * 0.016 || lineY2 < w * 0.016 || lineY3 < w * 0.016)) {
      return [203, 213, 225, 255];
    }

    const marginDist = Math.abs(relX - 0.22) * sheetW;
    if (marginDist < w * 0.012) {
      return [248, 113, 113, 255];
    }

    return [255, 255, 255, 255];
  }

  // Pen accent in safe zone
  const penX = (normX - 0.62) * w;
  const penY = (normY - 0.62) * h;
  const rotX = (penX + penY) * 0.7071;
  const rotY = (-penX + penY) * 0.7071;

  if (Math.abs(rotY) < w * 0.055 && rotX > -w * 0.14 && rotX < w * 0.18) {
    return [245, 158, 11, 255];
  }

  return [r, g, b, 255];
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating 192x192 icon...');
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), generatePNG(192, 192, drawStandardIcon));

console.log('Generating 512x512 icon...');
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), generatePNG(512, 512, drawStandardIcon));

console.log('Generating 512x512 maskable icon...');
fs.writeFileSync(path.join(outDir, 'pwa-512x512-maskable.png'), generatePNG(512, 512, drawMaskableIcon));

console.log('Generating 180x180 apple touch icon...');
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generatePNG(180, 180, drawStandardIcon));

console.log('Icons generated successfully!');
