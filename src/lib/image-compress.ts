/**
 * Shrinks images in the browser before they are uploaded, so Convex only
 * ever stores small, web-ready files. Every upload in the dashboard (and
 * photos attached to job applications) goes through here.
 *
 * Each preset knows how the image is used on the site: a logo never needs
 * more than 512 px, a reel cover 1280 px, and so on. Quality steps down, then
 * the image shrinks, until the file fits the preset's size budget.
 */

export type ImagePreset = "logo" | "avatar" | "photo" | "poster" | "cover" | "library" | "share" | "document";

type PresetSpec = {
  /** Longest edge in pixels. Raster images are never enlarged. */
  maxEdge: number;
  /** Fit inside this box instead of using maxEdge (share images). */
  box?: { width: number; height: number };
  /** File size the encoder aims for. */
  targetBytes: number;
  quality: number;
  minQuality: number;
  /** jpeg for files that leave the website (share previews, CV photos). */
  format: "webp" | "jpeg";
  /** Shown under upload buttons. */
  note: string;
};

const KB = 1024;

export const IMAGE_PRESETS: Record<ImagePreset, PresetSpec> = {
  logo: { maxEdge: 512, targetBytes: 60 * KB, quality: 0.86, minQuality: 0.6, format: "webp", note: "Saved as WebP, up to 512 px (usually under 60 KB)." },
  avatar: { maxEdge: 320, targetBytes: 35 * KB, quality: 0.82, minQuality: 0.6, format: "webp", note: "Saved as WebP, up to 320 px (usually under 35 KB)." },
  photo: { maxEdge: 1000, targetBytes: 150 * KB, quality: 0.8, minQuality: 0.55, format: "webp", note: "Saved as WebP, up to 1000 px (usually under 150 KB)." },
  poster: { maxEdge: 1280, targetBytes: 180 * KB, quality: 0.8, minQuality: 0.55, format: "webp", note: "Saved as WebP, up to 720×1280 (usually under 180 KB)." },
  cover: { maxEdge: 1920, targetBytes: 320 * KB, quality: 0.8, minQuality: 0.55, format: "webp", note: "Saved as WebP, up to 1920 px (usually under 320 KB)." },
  library: { maxEdge: 1920, targetBytes: 350 * KB, quality: 0.8, minQuality: 0.55, format: "webp", note: "Saved as WebP, up to 1920 px (usually under 350 KB)." },
  share: {
    maxEdge: 1200,
    box: { width: 1200, height: 630 },
    targetBytes: 250 * KB,
    quality: 0.85,
    minQuality: 0.6,
    format: "jpeg",
    note: "Saved as JPEG, up to 1200×630 (under 250 KB so WhatsApp shows it).",
  },
  document: { maxEdge: 2200, targetBytes: 900 * KB, quality: 0.82, minQuality: 0.6, format: "jpeg", note: "Saved as JPEG, up to 2200 px." },
};

/** Larger originals are refused before decoding; phones can't hold them in memory. */
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

export class ImageCompressError extends Error {
  constructor(
    message: string,
    readonly code: "UNSUPPORTED" | "TOO_BIG" | "FAILED",
  ) {
    super(message);
    this.name = "ImageCompressError";
  }
}

export type CompressedImage = {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
};

type Source = { image: CanvasImageSource; width: number; height: number; vector: boolean; close: () => void };

export async function compressImage(input: File, preset: ImagePreset): Promise<CompressedImage> {
  const spec = IMAGE_PRESETS[preset];
  if (input.size > MAX_SOURCE_BYTES) {
    throw new ImageCompressError("This image is over 40 MB. Export a smaller copy (JPG or PNG) and try again.", "TOO_BIG");
  }
  const source = await decode(input, spec);
  try {
    let { width, height } = fitSize(source, spec);
    let quality = spec.quality;
    let result: { blob: Blob; type: string } | null = null;

    for (let attempt = 0; attempt < 14; attempt++) {
      const canvas = render(source, width, height, spec.format === "jpeg");
      result = await encode(canvas, spec.format, quality);
      if (result.blob.size <= spec.targetBytes) break;
      if (result.type !== "image/png" && quality > spec.minQuality + 0.001) {
        quality = Math.max(spec.minQuality, quality - 0.08);
        continue;
      }
      if (Math.max(width, height) <= 160) break;
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
    }
    if (!result) throw new ImageCompressError("This image couldn't be converted. Try a JPG or PNG.", "FAILED");

    const ext = result.type === "image/jpeg" ? "jpg" : result.type === "image/png" ? "png" : "webp";
    const base = input.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120) || "image";
    return {
      file: new File([result.blob], `${base}.${ext}`, { type: result.type }),
      width,
      height,
      originalBytes: input.size,
    };
  } finally {
    source.close();
  }
}

/* ------------------------------------------------------------------ */

function fitSize(source: Source, spec: PresetSpec) {
  const limitW = spec.box?.width ?? spec.maxEdge;
  const limitH = spec.box?.height ?? spec.maxEdge;
  const fit = spec.box ? Math.min(limitW / source.width, limitH / source.height) : spec.maxEdge / Math.max(source.width, source.height);
  // Vector art (SVG) is drawn at the full preset size; photos are never enlarged.
  const scale = source.vector ? fit : Math.min(1, fit);
  return { width: Math.max(1, Math.round(source.width * scale)), height: Math.max(1, Math.round(source.height * scale)) };
}

async function decode(file: File, spec: PresetSpec): Promise<Source> {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (!isSvg && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, vector: false, close: () => bitmap.close() };
    } catch {
      // Fall through: Safari decodes some formats (HEIC) only through <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    if (isSvg && (!width || !height)) {
      const ratio = await svgRatio(file);
      width = spec.maxEdge;
      height = Math.max(1, Math.round(spec.maxEdge / ratio));
    }
    if (!width || !height) throw new Error("empty");
    return { image: img, width, height, vector: isSvg, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    const heic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
    throw new ImageCompressError(
      heic
        ? "iPhone HEIC photos can't be converted in this browser. Export the photo as JPG (or set the camera to “Most Compatible”) and upload again."
        : "This file isn't an image this browser can open. Use JPG, PNG, WebP or SVG.",
      "UNSUPPORTED",
    );
  }
}

async function svgRatio(file: File) {
  const text = await file.text();
  const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
  const w = box ? Number(box[1]) : 1;
  const h = box ? Number(box[2]) : 1;
  return w > 0 && h > 0 ? w / h : 1;
}

/** Draws with repeated halving so large photos stay sharp when shrunk a lot. */
function render(source: Source, width: number, height: number, opaque: boolean): HTMLCanvasElement {
  let current: CanvasImageSource = source.image;
  let cw = source.width;
  let ch = source.height;
  if (!source.vector) {
    while (cw / 2 >= width && ch / 2 >= height) {
      const half = document.createElement("canvas");
      half.width = Math.round(cw / 2);
      half.height = Math.round(ch / 2);
      const hctx = half.getContext("2d");
      if (!hctx) break;
      hctx.imageSmoothingQuality = "high";
      hctx.drawImage(current, 0, 0, half.width, half.height);
      current = half;
      cw = half.width;
      ch = half.height;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageCompressError("This browser couldn't process the image.", "FAILED");
  if (opaque) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, 0, 0, width, height);
  return canvas;
}

let webpSupport: boolean | null = null;
function canEncodeWebp() {
  if (webpSupport === null) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpSupport;
}

function hasTransparency(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

async function encode(canvas: HTMLCanvasElement, format: "webp" | "jpeg", quality: number) {
  // Browsers that can't write WebP (older Safari) get JPEG, or PNG when the
  // image has see-through parts such as a logo.
  const type = format === "jpeg" ? "image/jpeg" : canEncodeWebp() ? "image/webp" : hasTransparency(canvas) ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new ImageCompressError("This image is too large for the browser to convert. Try a smaller copy.", "FAILED");
  return { blob, type: blob.type || type };
}
