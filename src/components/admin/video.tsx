"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CloudArrowUp, Trash, VideoCamera, X } from "@phosphor-icons/react";
import { ConvexError } from "convex/values";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatBytes, UploadProgress, useUploader } from "./media";

/** The encoder (Mediabunny) is only downloaded when someone actually uploads a video. */
const loadCompressor = () => import("@/lib/video-compress");
import { errorMessage, useAdminAction } from "./session";
import { Button, Input, useFeedback } from "./ui";

const invalid = (message: string) => new ConvexError({ code: "INVALID_FILE", message });

type CloudinaryResult = { secure_url: string; public_id: string; bytes: number; duration?: number; width?: number; height?: number };
type Stage = { step: "compress" | "upload" | "cover"; progress: number | null };

function postToCloudinary(url: string, fields: Record<string, string>, file: File, onProgress: (p: number) => void, signal: AbortSignal) {
  return new Promise<CloudinaryResult>((resolve, reject) => {
    const form = new FormData();
    for (const [k, val] of Object.entries(fields)) form.append(k, val);
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: (CloudinaryResult & { error?: { message?: string } }) | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.secure_url) resolve(body);
      else reject(invalid(body?.error?.message ? `Cloudinary: ${body.error.message}` : `The upload failed (${xhr.status}). Try again.`));
    };
    xhr.onerror = () => reject(invalid("The upload failed. Check the connection and try again."));
    xhr.onabort = () => reject(invalid("Upload cancelled."));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}

/**
 * Shrink in the browser, then upload straight to Cloudinary with a
 * signature from Convex. Falls back to Cloudinary compressing on upload when
 * this browser can't encode video.
 */
export function useVideoUploader() {
  const sign = useAdminAction(api.cloudinary.signUpload);
  const [stage, setStage] = useState<Stage | null>(null);
  const controller = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv|3gp)$/i.test(file.name)) {
        throw invalid("Choose a video file (MP4 or MOV).");
      }
      const ctrl = new AbortController();
      controller.current = ctrl;
      setStage({ step: "compress", progress: 0 });
      try {
        let compressed: File | null = null;
        let serverCompression = false;
        const { compressVideo, VideoCompressError } = await loadCompressor();
        try {
          compressed = (await compressVideo(file, (p) => setStage({ step: "compress", progress: p }), ctrl.signal)).file;
        } catch (error) {
          if (error instanceof VideoCompressError && error.code !== "UNSUPPORTED") throw invalid(error.message);
          serverCompression = true; // This browser can't do it; Cloudinary shrinks it on upload instead.
        }
        const toSend = compressed ?? file;
        setStage({ step: "upload", progress: 0 });
        const signed = await sign({ bytes: toSend.size, serverCompression });
        const result = await postToCloudinary(signed.uploadUrl, signed.fields, toSend, (p) => setStage({ step: "upload", progress: p }), ctrl.signal);
        return { result, originalBytes: file.size, compressed };
      } catch (error) {
        setStage(null);
        throw error;
      } finally {
        controller.current = null;
      }
    },
    [sign],
  );

  return { upload, stage, setStage, cancel: () => controller.current?.abort() };
}

export type ReelVideo = { videoUrl?: string; videoPublicId?: string; videoBytes?: number; videoDuration?: number };

const isPlayable = (url?: string) => !!url && (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) || /res\.cloudinary\.com\/[^/]+\/video\/upload\//i.test(url));
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/**
 * The reel editor's video field: upload (shrunk first, stored on Cloudinary)
 * or paste a link. When the reel has no cover yet, a frame from the video
 * becomes the cover.
 */
export function ReelVideoField({
  value,
  needsCover,
  onChange,
  onCover,
}: {
  value: ReelVideo;
  needsCover: boolean;
  onChange: (next: ReelVideo) => void;
  onCover: (storageId: Id<"_storage">) => void;
}) {
  const checkStatus = useAdminAction(api.cloudinary.status);
  const { upload, stage, setStage, cancel } = useVideoUploader();
  const images = useUploader();
  const { toast } = useFeedback();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<{ from: number; to: number } | null>(null);
  const uploaded = !!value.videoPublicId;

  useEffect(() => {
    let live = true;
    checkStatus({})
      .then((r) => live && setConfigured(r.configured))
      .catch(() => live && setConfigured(false));
    return () => {
      live = false;
    };
  }, [checkStatus]);

  async function onFile(file: File) {
    try {
      const { result, originalBytes, compressed } = await upload(file);
      onChange({ videoUrl: result.secure_url, videoPublicId: result.public_id, videoBytes: result.bytes, videoDuration: result.duration });
      setSaved({ from: originalBytes, to: result.bytes });
      if (needsCover) {
        setStage({ step: "cover", progress: null });
        const { captureFrame } = await loadCompressor();
        const frame = await captureFrame(compressed ?? file);
        if (frame) {
          const cover = await images.upload(frame, "poster").catch(() => null);
          if (cover) onCover(cover.storageId);
        }
      }
      toast(`Video uploaded · ${formatBytes(result.bytes)}${originalBytes > result.bytes * 1.2 ? ` (shrunk from ${formatBytes(originalBytes)})` : ""}`);
    } catch (error) {
      toast(errorMessage(error, "The upload failed. Try again."), "error");
    } finally {
      setStage(null);
    }
  }

  const busy = stage !== null;
  const label =
    stage?.step === "compress"
      ? `Shrinking for the web… ${Math.round((stage.progress ?? 0) * 100)}%`
      : stage?.step === "upload"
        ? `Uploading to Cloudinary… ${Math.round((stage.progress ?? 0) * 100)}%`
        : stage?.step === "cover"
          ? "Making a cover from the video…"
          : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-[5px] border border-a-line bg-a-hover">
          {isPlayable(value.videoUrl) ? (
            <video key={value.videoUrl} src={value.videoUrl} className="absolute inset-0 size-full object-cover" muted controls preload="metadata" playsInline />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-a-faint">
              <VideoCamera className="size-7" aria-hidden />
            </span>
          )}
        </div>
        <div className="min-w-56 flex-1 space-y-2">
          {configured === false ? (
            <p className="rounded-[5px] border border-a-line bg-a-raised px-3 py-2.5 text-[0.8rem] text-a-muted">
              Video uploads aren&apos;t connected yet: the Cloudinary keys need to be added (see the README). Until then, paste a link below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex">
                <span
                  className={`inline-flex h-8 items-center gap-2 rounded-[4px] border border-a-line-strong bg-a-surface px-3 text-[0.8rem] font-semibold ${busy || configured === null ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-a-hover"}`}
                >
                  <CloudArrowUp className="size-4" aria-hidden />
                  {uploaded ? "Replace video" : "Upload video"}
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/*"
                  className="sr-only"
                  disabled={busy || configured === null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void onFile(file);
                  }}
                />
              </label>
              {busy && stage?.step !== "cover" ? (
                <Button size="sm" variant="ghost" icon={<X className="size-4" aria-hidden />} onClick={cancel}>
                  Cancel
                </Button>
              ) : null}
              {value.videoUrl && !busy ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-a-danger"
                  icon={<Trash className="size-4" aria-hidden />}
                  onClick={() => onChange({ videoUrl: undefined, videoPublicId: undefined, videoBytes: undefined, videoDuration: undefined })}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          )}
          {label ? (
            <div aria-live="polite">
              <p className="text-[0.78rem] text-a-muted">{label}</p>
              <UploadProgress progress={stage?.progress ?? 0.04} className="mt-1" />
            </div>
          ) : null}
          {uploaded ? (
            <p className="text-[0.78rem] text-a-muted">
              On Cloudinary{value.videoBytes ? ` · ${formatBytes(value.videoBytes)}` : ""}
              {value.videoDuration ? ` · ${clock(value.videoDuration)}` : ""}
              {saved && saved.from > saved.to * 1.2 ? ` · shrunk from ${formatBytes(saved.from)}` : ""}
            </p>
          ) : null}
          <p className="text-[0.72rem] text-a-faint">
            Videos are shrunk to 720p before upload (a 30-second reel is about 5 MB), so the free Cloudinary plan lasts. Up to 3 minutes.
          </p>
        </div>
      </div>

      {!uploaded ? (
        <div>
          <label htmlFor="reel-video-link" className="mb-1.5 block text-[0.8rem] font-semibold text-a-text">
            …or paste a link
          </label>
          <Input
            id="reel-video-link"
            dir="ltr"
            placeholder="https://youtube.com/shorts/… or https://instagram.com/reel/…"
            value={value.videoUrl ?? ""}
            onChange={(e) => onChange({ ...value, videoUrl: e.target.value || undefined, videoPublicId: undefined, videoBytes: undefined, videoDuration: undefined })}
          />
          <p className="mt-1 text-[0.72rem] text-a-faint">YouTube links play inside the site. Instagram and TikTok links open the post.</p>
        </div>
      ) : null}
    </div>
  );
}
