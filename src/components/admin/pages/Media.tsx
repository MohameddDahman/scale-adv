"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Copy, FileText, Images, Trash, UploadSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/format";
import { relativeTime } from "../format";
import { formatBytes, KindFilter, UploadProgress, useUploader } from "../media";
import { errorMessage, useAdminMutation, useAdminPaginatedQuery } from "../session";
import { Button, EmptyState, IconButton, Input, LoadingRows, PageHeader, Panel, useFeedback } from "../ui";

export function MediaPage() {
  const [kind, setKind] = useState<"all" | "image" | "video" | "file">("all");
  const { results, status, loadMore } = useAdminPaginatedQuery(api.media.list, { kind: kind === "all" ? undefined : kind }, { initialNumItems: 40 });
  const { upload, progress } = useUploader();
  const remove = useAdminMutation(api.media.remove, { refresh: true });
  const rename = useAdminMutation(api.media.update);
  const { toast, confirm } = useFeedback();
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<{ done: number; total: number } | null>(null);

  async function uploadAll(files: FileList | File[]) {
    const list = [...files];
    if (!list.length) return;
    setQueue({ done: 0, total: list.length });
    for (const [i, file] of list.entries()) {
      try {
        await upload(file, { compress: file.type.startsWith("image/") });
      } catch (e) {
        toast(`${file.name}: ${errorMessage(e, "upload failed")}`, "error");
      }
      setQueue({ done: i + 1, total: list.length });
    }
    setQueue(null);
    toast(list.length === 1 ? "Uploaded" : `${list.length} files uploaded`);
  }

  return (
    <div>
      <PageHeader
        title="Media library"
        description="Every image and video uploaded from the dashboard. Photos are converted to WebP automatically to keep the site fast."
        actions={
          <label className="inline-flex">
            <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[4px] bg-signal px-3.5 text-[0.85rem] font-semibold text-ink-950 hover:bg-signal-300">
              <UploadSimple className="size-4" aria-hidden /> Upload files
            </span>
            <input type="file" multiple accept="image/*,video/*" className="sr-only" onChange={(e) => e.target.files && uploadAll(e.target.files).then(() => (e.target.value = ""))} />
          </label>
        }
      />
      <Panel padded={false}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void uploadAll(e.dataTransfer.files);
          }}
          className={cn("border-b border-a-line p-3 transition-colors", dragging && "bg-a-accent-soft")}
        >
          <div className="flex flex-wrap items-center gap-3">
            <KindFilter value={kind} onChange={setKind} />
            <p className="ms-auto text-[0.78rem] text-a-faint">{dragging ? "Drop to upload" : "Tip: drag files anywhere in this box to upload."}</p>
          </div>
          {queue ? (
            <div className="mt-3">
              <p className="mb-1 text-[0.78rem] text-a-muted">
                Uploading {queue.done + 1} of {queue.total}
              </p>
              <UploadProgress progress={progress} />
            </div>
          ) : null}
        </div>

        {status === "LoadingFirstPage" ? (
          <LoadingRows />
        ) : results.length === 0 ? (
          <EmptyState icon={<Images className="size-6" aria-hidden />} title="No files yet" body="Upload logos, reel covers, videos and photos here, then pick them anywhere in the dashboard." />
        ) : (
          <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
            {results.map((m) => (
              <li key={m._id} className="group overflow-hidden rounded-[6px] border border-a-line">
                <div className="relative aspect-square bg-a-hover">
                  {m.url && m.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.alt ?? ""} className="absolute inset-0 size-full object-cover" loading="lazy" />
                  ) : m.url && m.kind === "video" ? (
                    <video src={m.url} className="absolute inset-0 size-full object-cover" muted preload="metadata" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-a-faint">
                      <FileText className="size-8" aria-hidden />
                    </span>
                  )}
                  <div className="absolute end-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <IconButton
                      label="Copy link"
                      className="bg-a-surface/90 shadow"
                      onClick={async () => {
                        if (!m.url) return;
                        await navigator.clipboard.writeText(m.url);
                        toast("Link copied");
                      }}
                    >
                      <Copy className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Delete ${m.name}`}
                      tone="danger"
                      className="bg-a-surface/90 shadow"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Delete ${m.name}?`,
                          body: "If it's used on the website (a logo, a reel cover), it will disappear there too.",
                          confirmLabel: "Delete file",
                          tone: "danger",
                        });
                        if (ok) remove({ id: m._id as Id<"media"> }).then(() => toast("File deleted")).catch((e) => toast(errorMessage(e), "error"));
                      }}
                    >
                      <Trash className="size-4" aria-hidden />
                    </IconButton>
                  </div>
                </div>
                <div className="p-2">
                  <Input
                    aria-label="File name"
                    defaultValue={m.name}
                    className="!h-7 border-transparent px-1 text-[0.78rem] hover:border-a-line focus:border-signal"
                    onBlur={(e) => {
                      const name = e.target.value.trim();
                      if (name && name !== m.name) rename({ id: m._id as Id<"media">, name, alt: m.alt }).catch((err) => toast(errorMessage(err), "error"));
                    }}
                  />
                  <p className="px-1 text-[0.7rem] text-a-faint">
                    {formatBytes(m.size)}
                    {m.width ? ` · ${m.width}×${m.height}` : ""} · {relativeTime(m._creationTime)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {status === "CanLoadMore" || status === "LoadingMore" ? (
          <div className="flex justify-center border-t border-a-line p-3">
            <Button size="sm" onClick={() => loadMore(40)} loading={status === "LoadingMore"}>
              Load more
            </Button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
