"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CheckCircle, ImageSquare, UploadSimple } from "@phosphor-icons/react";
import { ConvexError } from "convex/values";
import Image from "next/image";
import { useCallback, useState } from "react";
import { uploadWithProgress } from "@/lib/convex-public";
import { cn } from "@/lib/format";
import { compressImage, ImageCompressError, type ImagePreset } from "@/lib/image-compress";
import { canOptimize } from "@/lib/image-url";
import { errorMessage, useAdminMutation, useAdminPaginatedQuery } from "./session";
import { Button, EmptyState, Modal, Skeleton, useFeedback } from "./ui";

export type Uploaded = {
  storageId: Id<"_storage">;
  url: string | null;
  mediaId: Id<"media">;
  /** Stored size after compression. */
  size: number;
  /** Size of the file that was picked. */
  originalBytes: number;
  /** The same image was already in the library, so that copy was reused. */
  reused: boolean;
};

const invalid = (message: string) => new ConvexError({ code: "INVALID_FILE", message });

export const VIDEO_NOT_STORED =
  "Video files aren't stored in the dashboard. Upload the video to Cloudinary, YouTube or Instagram, then paste its link in the reel.";

/**
 * Uploads an image to the library. Every image is shrunk to its preset
 * (src/lib/image-compress.ts) before it leaves the browser, and Convex
 * refuses anything that skipped this step.
 */
export function useUploader() {
  const generate = useAdminMutation(api.media.generateUploadUrl);
  const create = useAdminMutation(api.media.create);
  const [progress, setProgress] = useState<number | null>(null);

  const upload = useCallback(
    async (input: File, preset: ImagePreset = "library"): Promise<Uploaded> => {
      if (input.type.startsWith("video/")) throw invalid(VIDEO_NOT_STORED);
      if (!input.type.startsWith("image/") && !/\.(svg|hei[cf])$/i.test(input.name)) {
        throw invalid("Only images can be uploaded here (JPG, PNG, WebP or SVG).");
      }
      setProgress(0);
      try {
        const prepared = await compressImage(input, preset);
        const url = await generate({});
        const storageId = (await uploadWithProgress(url, prepared.file, setProgress)) as Id<"_storage">;
        const created = await create({ storageId, name: prepared.file.name, width: prepared.width, height: prepared.height });
        if (!created.ok) throw invalid(created.message);
        return {
          storageId: created.storageId,
          url: created.url,
          mediaId: created._id,
          size: created.size,
          originalBytes: prepared.originalBytes,
          reused: created.reused,
        };
      } catch (error) {
        if (error instanceof ImageCompressError) throw invalid(error.message);
        throw error;
      } finally {
        setProgress(null);
      }
    },
    [generate, create],
  );

  return { upload, progress, uploading: progress !== null };
}

/** Toast text after an upload, so people see what compression saved. */
export function uploadedMessage(up: Uploaded) {
  if (up.reused) return "Already in the library, so that copy was used (no extra space).";
  if (up.originalBytes > up.size * 1.2) return `Uploaded · ${formatBytes(up.size)} (shrunk from ${formatBytes(up.originalBytes)})`;
  return `Uploaded · ${formatBytes(up.size)}`;
}

export function formatBytes(n: number) {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/**
 * Dashboard thumbnails. Convex files go through Next's image optimizer, so
 * browsing the library loads small cached copies instead of the originals.
 */
export function Thumb({ src, alt = "", sizes, className }: { src: string; alt?: string; sizes: string; className?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} unoptimized={!canOptimize(src)} className={cn("object-cover", className)} />;
}

/* --------------------------- Media picker -------------------------- */

export function MediaPicker({
  open,
  onOpenChange,
  preset = "library",
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preset?: ImagePreset;
  onPick: (item: { storageId: Id<"_storage">; url: string | null }) => void;
}) {
  const { results, status, loadMore } = useAdminPaginatedQuery(api.media.list, open ? { kind: "image" } : "skip", { initialNumItems: 30 });
  const { upload, progress } = useUploader();
  const { toast } = useFeedback();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Choose an image"
      description="Pick something already uploaded, or upload a new image."
      size="xl"
      footer={
        <label className="me-auto inline-flex">
          <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[4px] bg-signal px-3.5 text-[0.85rem] font-semibold text-ink-950 hover:bg-signal-300">
            <UploadSimple className="size-4" aria-hidden />
            {progress !== null ? `Uploading ${Math.round(progress * 100)}%` : "Upload new"}
          </span>
          <input
            type="file"
            className="sr-only"
            accept="image/*"
            disabled={progress !== null}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const up = await upload(file, preset);
                toast(uploadedMessage(up));
                onPick({ storageId: up.storageId, url: up.url });
                onOpenChange(false);
              } catch (err) {
                toast(errorMessage(err, "Upload failed. Try again."), "error");
              }
            }}
          />
        </label>
      }
    >
      {status === "LoadingFirstPage" ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState icon={<ImageSquare className="size-6" aria-hidden />} title="Nothing uploaded yet" body="Use “Upload new” below." />
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {results.map((m) => (
              <li key={m._id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick({ storageId: m.storageId, url: m.url });
                    onOpenChange(false);
                  }}
                  className="group block w-full cursor-pointer text-start"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-[4px] border border-a-line bg-a-hover">
                    {m.url ? <Thumb src={m.url} alt={m.alt ?? ""} sizes="160px" /> : null}
                    <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <CheckCircle className="size-7 text-white" weight="fill" aria-hidden />
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[0.72rem] text-a-muted">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
          {status === "CanLoadMore" ? (
            <div className="mt-5 flex justify-center">
              <Button onClick={() => loadMore(30)}>Load more</Button>
            </div>
          ) : null}
        </>
      )}
    </Modal>
  );
}

export function UploadProgress({ progress, className }: { progress: number | null; className?: string }) {
  if (progress === null) return null;
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-a-line", className)} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-signal transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
    </div>
  );
}
