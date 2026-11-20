/**
 * Shrinks reels in the browser before they're uploaded to Cloudinary.
 *
 * Phone exports are usually 1080p or 4K at 15–50 Mbps: a 30-second reel can
 * be 60–200 MB. Re-encoded here to H.264 at most 720×1280 (or 1280×720), about
 * 1.3 Mbps and 30 fps, the same reel is around 5 MB, still sharp on a phone
 * screen. Cloudinary then stores the small file and does no processing, which
 * keeps the free plan's credits for storage and views.
 *
 * Uses WebCodecs through Mediabunny, so it runs on the computer's video
 * hardware. Browsers without it fall back to Cloudinary compressing on upload.
 */
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  canEncodeAudio,
  canEncodeVideo,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
} from "mediabunny";

export const VIDEO_TARGET = {
  longEdge: 1280,
  shortEdge: 720,
  /** Video bits per second at full 720×1280; smaller frames get proportionally less. */
  bitrate: 1_300_000,
  audioBitrate: 96_000,
  maxFps: 30,
} as const;

/** Reels longer than this are refused: they cost storage and nobody watches them on the site. */
export const MAX_VIDEO_SECONDS = 180;

export class VideoCompressError extends Error {
  constructor(
    message: string,
    /** UNSUPPORTED: this browser can't do it (fall back to Cloudinary). The others are final. */
    readonly code: "UNSUPPORTED" | "TOO_LONG" | "NO_VIDEO" | "CANCELLED",
  ) {
    super(message);
    this.name = "VideoCompressError";
  }
}

export type CompressedVideo = {
  file: File;
  width: number;
  height: number;
  duration: number;
  originalBytes: number;
  /** False when the original was already small enough and is uploaded as it is. */
  reencoded: boolean;
};

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

export async function compressVideo(
  source: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<CompressedVideo> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") {
    throw new VideoCompressError("This browser can't compress video.", "UNSUPPORTED");
  }
  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new VideoCompressError("This file doesn't contain a video.", "NO_VIDEO");
    const duration = await input.computeDuration();
    if (duration > MAX_VIDEO_SECONDS) {
      throw new VideoCompressError(`Reels can be up to ${MAX_VIDEO_SECONDS / 60} minutes long. Trim this one and try again.`, "TOO_LONG");
    }

    const w = track.displayWidth;
    const h = track.displayHeight;
    const scale = Math.min(1, VIDEO_TARGET.longEdge / Math.max(w, h), VIDEO_TARGET.shortEdge / Math.min(w, h));
    const width = even(w * scale);
    const height = even(h * scale);
    const bitrate = Math.round(VIDEO_TARGET.bitrate * Math.min(1, (width * height) / (720 * 1280)));
    const stats = await track.computePacketStats(150).catch(() => null);
    const fps = stats?.averagePacketRate ?? 30;

    // Already small (an earlier export at 720p)? Upload it untouched rather than lose quality re-encoding it.
    const sourceBitrate = (source.size * 8) / Math.max(duration, 0.1);
    if (scale === 1 && fps <= VIDEO_TARGET.maxFps + 1 && sourceBitrate <= bitrate * 1.3 && source.type === "video/mp4") {
      return { file: source, width: w, height: h, duration, originalBytes: source.size, reencoded: false };
    }

    // An explicit bitrate (a bare number would be read as a 0–1 quality level).
    const videoQuality = new Quality({ bitrate, bitrateMode: "variable" });
    if (!(await canEncodeVideo("avc", { width, height, quality: videoQuality }))) {
      throw new VideoCompressError("This browser can't encode H.264 video.", "UNSUPPORTED");
    }
    const audioQuality = new Quality({ bitrate: VIDEO_TARGET.audioBitrate });
    const aacEncodable = await canEncodeAudio("aac", { quality: audioQuality }).catch(() => false);

    const encode = async (quality: Quality, progress: (p: number) => void, hardwareAcceleration?: "prefer-software") => {
      const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
      const conversion = await Conversion.init({
        input,
        output,
        tracks: "primary",
        video: {
          width,
          height,
          fit: "contain",
          codec: "avc",
          quality,
          frameRate: fps > VIDEO_TARGET.maxFps + 1 ? VIDEO_TARGET.maxFps : undefined,
          forceTranscode: true,
          hardwareAcceleration,
        },
        // AAC at 96 kbps when the browser can encode it; otherwise the original AAC track is copied as it is.
        audio: aacEncodable ? { codec: "aac", quality: audioQuality } : { codec: "aac" },
      });
      // Never drop the sound or the picture silently: let Cloudinary handle the file instead.
      const lost = conversion.discardedTracks.find((d) => d.reason !== "discarded_by_user" && d.reason !== "max_track_count_reached");
      if (!conversion.isValid || lost) throw new VideoCompressError("This browser can't convert this video's format.", "UNSUPPORTED");
      conversion.onProgress = (p) => progress(p);
      const abort = () => void conversion.cancel();
      signal?.addEventListener("abort", abort, { once: true });
      try {
        await conversion.execute();
      } catch (error) {
        if (signal?.aborted) throw new VideoCompressError("Cancelled.", "CANCELLED");
        throw new VideoCompressError(error instanceof Error ? error.message : "Compression failed.", "UNSUPPORTED");
      } finally {
        signal?.removeEventListener("abort", abort);
      }
      const buffer = output.target.buffer;
      if (!buffer) throw new VideoCompressError("Compression produced no file.", "UNSUPPORTED");
      return buffer;
    };

    // Variable bitrate on the video hardware is fast and looks best. Hardware encoders can blow past the
    // budget on very busy footage, so then a software constant-bitrate pass caps it.
    let buffer = await encode(videoQuality, (p) => onProgress?.(p * 0.6));
    const budget = ((bitrate + VIDEO_TARGET.audioBitrate) / 8) * duration;
    if (buffer.byteLength > budget * 1.6) {
      const capped = await encode(new Quality({ bitrate, bitrateMode: "constant" }), (p) => onProgress?.(0.6 + p * 0.4), "prefer-software").catch(
        () => null,
      );
      if (capped && capped.byteLength < buffer.byteLength) buffer = capped;
    }
    onProgress?.(1);
    const name = `${source.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 100) || "reel"}.mp4`;
    const file = new File([buffer], name, { type: "video/mp4" });
    // Rare: a source that was already tightly encoded. Keep whichever is smaller (when the original is an MP4).
    if (file.size >= source.size && source.type === "video/mp4") {
      return { file: source, width: w, height: h, duration, originalBytes: source.size, reencoded: false };
    }
    return { file, width, height, duration, originalBytes: source.size, reencoded: true };
  } finally {
    input.dispose?.();
  }
}

/**
 * Grabs a still from a (compressed, H.264) video to use as the reel's cover.
 * Returns a JPEG; the image uploader then shrinks it to the poster preset.
 */
export async function captureFrame(video: File, at = 1): Promise<File | null> {
  const url = URL.createObjectURL(video);
  const el = document.createElement("video");
  el.muted = true;
  el.playsInline = true;
  el.preload = "auto";
  el.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      el.onloadedmetadata = () => resolve();
      el.onerror = () => reject(new Error("unreadable"));
    });
    el.currentTime = Math.min(at, Math.max(0, (el.duration || 1) * 0.25));
    await new Promise<void>((resolve, reject) => {
      el.onseeked = () => resolve();
      el.onerror = () => reject(new Error("unreadable"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width) return null;
    ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    return blob ? new File([blob], "cover.jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  } finally {
    el.removeAttribute("src");
    el.load();
    URL.revokeObjectURL(url);
  }
}
