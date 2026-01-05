import { useCallback } from 'react';
import PropTypes from 'prop-types';
import ImageUploader from '../ImageUploader/ImageUploader.jsx';

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function posterizeImageData(imageData, levelsPerChannel) {
  const levels = Math.max(2, Math.min(32, Math.floor(levelsPerChannel)));
  const step = 255 / (levels - 1);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i + 1] = Math.round(d[i + 1] / step) * step;
    d[i + 2] = Math.round(d[i + 2] / step) * step;
    // alpha unchanged
  }
}

function sobelEdgesMask(srcImageData, width, height, threshold01) {
  const src = srcImageData.data;
  const gray = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = src[idx] / 255;
      const g = src[idx + 1] / 255;
      const b = src[idx + 2] / 255;
      // Luma
      gray[y * width + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  const out = new Uint8ClampedArray(width * height);
  const t = clamp01(threshold01);

  const gxK = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const gyK = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const v = gray[(y + ky) * width + (x + kx)];
          gx += v * gxK[ky + 1][kx + 1];
          gy += v * gyK[ky + 1][kx + 1];
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy);
      out[y * width + x] = mag > t ? 255 : 0;
    }
  }

  return out;
}

function dilateMask(mask, width, height, radiusPx) {
  const r = Math.max(1, Math.min(8, Math.floor(radiusPx)));
  let src = mask;
  let dst = new Uint8ClampedArray(mask.length);

  for (let iter = 0; iter < r; iter += 1) {
    dst.fill(0);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const idx = y * width + x;
        if (src[idx] === 255) {
          dst[idx] = 255;
          dst[idx - 1] = 255;
          dst[idx + 1] = 255;
          dst[idx - width] = 255;
          dst[idx + width] = 255;
        }
      }
    }
    src = dst;
    dst = new Uint8ClampedArray(mask.length);
  }

  return src;
}

function rgbToHex(r, g, b) {
  const to = (n) => {
    const v = Math.max(0, Math.min(255, Math.round(n)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case rr:
      h = (gg - bb) / d + (gg < bb ? 6 : 0);
      break;
    case gg:
      h = (bb - rr) / d + 2;
      break;
    default:
      h = (rr - gg) / d + 4;
      break;
  }
  h /= 6;
  return { h, s, l };
}

async function dominantColorFromDataUrl(rawDataUrl) {
  const img = new Image();
  img.decoding = 'async';

  const loaded = new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });
  img.src = rawDataUrl;
  await loaded;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return '';

  // Small sample for speed.
  const sw = 48;
  const sh = 48;
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  if (!ctx) return '';
  ctx.drawImage(img, 0, 0, sw, sh);

  const data = ctx.getImageData(0, 0, sw, sh).data;
  // Quantized histogram (RGB buckets), biased toward saturated midtones.
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const { s, l } = rgbToHsl(r, g, b);

    // Ignore near-gray and extreme dark/light pixels.
    if (s < 0.18) continue;
    if (l < 0.12 || l > 0.92) continue;

    const qr = Math.floor(r / 16);
    const qg = Math.floor(g / 16);
    const qb = Math.floor(b / 16);
    const key = `${qr},${qg},${qb}`;
    const weight = 1 + s * 2;
    buckets.set(key, (buckets.get(key) || 0) + weight);
  }

  // Fallback: average if histogram too sparse.
  if (buckets.size === 0) {
    let rr = 0;
    let gg = 0;
    let bb = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      rr += data[i];
      gg += data[i + 1];
      bb += data[i + 2];
      n += 1;
    }
    if (!n) return '';
    return rgbToHex(rr / n, gg / n, bb / n);
  }

  let bestKey = null;
  let bestScore = -1;
  for (const [k, score] of buckets.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestKey = k;
    }
  }

  if (!bestKey) return '';
  const [qr, qg, qb] = bestKey.split(',').map((x) => parseInt(x, 10));
  // Use bucket center.
  return rgbToHex(qr * 16 + 8, qg * 16 + 8, qb * 16 + 8);
}

async function toonifyDataUrl(rawDataUrl, opts) {
  const {
    maxDim = 384,
    saturation = 1.5,
    contrast = 1.08,
    posterizeLevels = 6,
    edgeThreshold = 0.22,
    inkThickness = 2,
  } = opts || {};

  const img = new Image();
  img.decoding = 'async';

  const loaded = new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });

  img.src = rawDataUrl;
  await loaded;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return rawDataUrl;

  const scale = Math.min(1, maxDim / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  if (!ctx) return rawDataUrl;

  // Base draw with boosted saturation/contrast.
  ctx.filter = `saturate(${saturation}) contrast(${contrast})`;
  ctx.drawImage(img, 0, 0, tw, th);
  ctx.filter = 'none';

  // Posterize.
  const base = ctx.getImageData(0, 0, tw, th);
  posterizeImageData(base, posterizeLevels);

  // Edge detection on the posterized base.
  const edges = sobelEdgesMask(base, tw, th, edgeThreshold);
  const thick = dilateMask(edges, tw, th, inkThickness);

  // Put posterized base back.
  ctx.putImageData(base, 0, 0);

  // Draw ink outline over.
  const ink = ctx.createImageData(tw, th);
  const id = ink.data;
  for (let i = 0; i < thick.length; i += 1) {
    const a = thick[i];
    if (a) {
      const p = i * 4;
      id[p] = 0;
      id[p + 1] = 0;
      id[p + 2] = 0;
      id[p + 3] = 255;
    }
  }

  // Multiply-ish: draw black lines on top.
  ctx.globalCompositeOperation = 'source-over';
  ctx.putImageData(ink, 0, 0);

  // Export (JPEG keeps size down; outline still readable at 384px).
  return canvas.toDataURL('image/jpeg', 0.88);
}

export default function UploadManager({ label = 'Upload:', onAvatarDataUrl, onAvatar }) {
  const handleDataUrl = useCallback(
    async (rawDataUrl) => {
      let dominantColor = '';
      try {
        dominantColor = await dominantColorFromDataUrl(rawDataUrl);
        const processed = await toonifyDataUrl(rawDataUrl, {
          maxDim: 384,
          saturation: 1.55,
          contrast: 1.1,
          posterizeLevels: 6,
          edgeThreshold: 0.22,
          inkThickness: 2,
        });
        if (typeof onAvatar === 'function') onAvatar({ dataUrl: processed, dominantColor });
        if (typeof onAvatarDataUrl === 'function') onAvatarDataUrl(processed);
      } catch {
        if (typeof onAvatar === 'function') onAvatar({ dataUrl: rawDataUrl, dominantColor });
        if (typeof onAvatarDataUrl === 'function') onAvatarDataUrl(rawDataUrl);
      }
    },
    [onAvatarDataUrl, onAvatar]
  );

  return <ImageUploader label={label} onDataUrl={handleDataUrl} />;
}

UploadManager.propTypes = {
  label: PropTypes.string,
  onAvatarDataUrl: PropTypes.func,
  onAvatar: PropTypes.func,
};
