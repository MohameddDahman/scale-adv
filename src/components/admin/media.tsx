"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { CheckCircle, FilmStrip, ImageSquare, UploadSimple } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import { uploadWithProgress } from "@/lib/convex-public";
import { cn } from "@/lib/format";
import { errorMessage, useAdminMutation, useAdminPaginatedQuery } from "./session";
import { Button, EmptyState, Modal, Segmented, Skeleton, useFeedback } from "./ui";

export type Uploaded = { storageId: Id<"_storage">; url: string | null; kind: "image" | "video" | "file"; mediaId: Id<"media"> };

/** Shrinks big photos to WebP before upload. Logos keep transparency; SVG/GIF pass through. */
export async function compressImage(file: File, maxSize = 2200, quality = 0.86): Promise<{ file: File; width?: number; height?: number }> {
  if (!file.type.startsWith("image/") || /svg|gif/.test(file.type)) return { file };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.size >= file.size) return { file, width: bitmap.width, height: bitmap.height };
    const name = file.name.replace(/\.[a-z0-9]+$/i, "") + ".webp";
    return { file: new File([blob], name, { type: "image/webp" }), width, height };
  } catch {
    return { file };
  }
}

export function useUploader() {
  const generate = useAdminMutation(api.media.generateUploadUrl);
  const create = useAdminMutation(api.media.create);
  const [progress, setProgress] = useState<number | null>(null);

  const upload = useCallback(
    async (input: File, opts: { compress?: boolean } = {}): Promise<Uploaded> => {
      setProgress(0);
      try {
        const prepared = opts.compress === false ? { file: input } : await compressImage(input);
        const url = await generate({});
        const storageId = (await uploadWithProgress(url, prepared.file, setProgress)) as Id<"_storage">;
        const created = await create({
          storageId,
          name: input.name,
          width: "width" in prepared ? prepared.width : undefined,
          height: "height" in prepared ? prepared.height : undefined,
        });
        return { storageId, url: created.url, kind: created.kind, mediaId: created._id };
      } finally {
        setProgress(null);
      }
    },
    [generate, create],
  );

  return { upload, progress, uploading: progress !== null };
}

export function formatBytes(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/* --------------------------- Media picker -------------------------- */

export function MediaPicker({
  open,
  onOpenChange,
  kind,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: "image" | "video";
  onPick: (item: { storageId: Id<"_storage">; url: string | null }) => void;
}) {
  const { results, status, loadMore } = useAdminPaginatedQuery(api.media.list, open ? { kind } : "skip", { initialNumItems: 30 });
  const { upload, progress } = useUploader();
  const { toast } = useFeedback();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={kind === "image" ? "Choose an image" : "Choose a video"}
      description="Pick something already uploaded, or upload a new file."
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
            accept={kind === "image" ? "image/*" : "video/*"}
            disabled={progress !== null}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const up = await upload(file, { compress: kind === "image" });
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
        <EmptyState
          icon={kind === "image" ? <ImageSquare className="size-6" aria-hidden /> : <FilmStrip className="size-6" aria-hidden />}
          title="Nothing uploaded yet"
          body="Use “Upload new” below."
        />
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
                    {m.url && m.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.alt ?? ""} className="size-full object-cover" loading="lazy" />
                    ) : m.url && m.kind === "video" ? (
                      <video src={m.url} className="size-full object-cover" muted preload="metadata" />
                    ) : null}
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

export function KindFilter({ value, onChange }: { value: "all" | "image" | "video" | "file"; onChange: (v: "all" | "image" | "video" | "file") => void }) {
  return (
    <Segmented
      label="File type"
      value={value}
      onChange={onChange}
      options={[
        { value: "all", label: "All" },
        { value: "image", label: "Images" },
        { value: "video", label: "Videos" },
        { value: "file", label: "Documents" },
      ]}
    />
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
