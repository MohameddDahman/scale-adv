"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Copy, FileText, FilmStrip, Images, Trash, UploadSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/format";
import { relativeTime } from "../format";
import { formatBytes, Thumb, UploadProgress, useUploader, type Uploaded } from "../media";
import { errorMessage, useAdminMutation, useAdminPaginatedQuery, useAdminQuery } from "../session";
import { StorageMeter } from "../storage";
import { Badge, Button, EmptyState, IconButton, Input, LoadingRows, PageHeader, Panel, Segmented, useFeedback } from "../ui";

type Item = {
  _id: Id<"media">;
  name: string;
  kind: "image" | "video" | "file";
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  url: string | null;
  _creationTime: number;
  usedIn?: { label: string; href: string }[];
};

export function MediaPage() {
  const params = useSearchParams();
  const router = useRouter();
  const view: "all" | "unused" = params.get("view") === "unused" ? "unused" : "all";
  const all = useAdminPaginatedQuery(api.media.list, view === "all" ? {} : "skip", { initialNumItems: 40 });
  const unused = useAdminQuery(api.media.unused, {});
  const { upload, progress } = useUploader();
  const remove = useAdminMutation(api.media.remove, { refresh: true });
  const removeUnused = useAdminMutation(api.media.removeUnused, { refresh: true });
  const rename = useAdminMutation(api.media.update);
  const { toast, confirm } = useFeedback();
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<{ done: number; total: number } | null>(null);
  const [clearing, setClearing] = useState(false);

  async function uploadAll(files: FileList | File[]) {
    const list = [...files];
    if (!list.length) return;
    setQueue({ done: 0, total: list.length });
    const done: Uploaded[] = [];
    for (const [i, file] of list.entries()) {
      try {
        done.push(await upload(file, "library"));
      } catch (e) {
        toast(`${file.name}: ${errorMessage(e, "upload failed")}`, "error");
      }
      setQueue({ done: i + 1, total: list.length });
    }
    setQueue(null);
    if (done.length) {
      const stored = done.filter((u) => !u.reused).reduce((s, u) => s + u.size, 0);
      const picked = done.reduce((s, u) => s + u.originalBytes, 0);
      toast(`${done.length} image${done.length === 1 ? "" : "s"} uploaded · ${formatBytes(stored)} stored (from ${formatBytes(picked)})`);
    }
  }

  async function deleteItem(m: Item) {
    const used = m.usedIn ?? [];
    const ok = await confirm({
      title: `Delete ${m.name}?`,
      body: used.length
        ? `It's used in ${used.map((u) => u.label).join(", ")}. It will be removed from there too.`
        : "It isn't shown anywhere on the website.",
      confirmLabel: "Delete file",
      tone: "danger",
    });
    if (ok) remove({ id: m._id }).then(() => toast("File deleted")).catch((e) => toast(errorMessage(e), "error"));
  }

  async function clearUnused() {
    if (!unused?.count) return;
    const ok = await confirm({
      title: `Delete ${unused.count} unused image${unused.count === 1 ? "" : "s"}?`,
      body: `They aren't shown anywhere on the website. This frees ${formatBytes(unused.bytes)} and can't be undone.`,
      confirmLabel: "Delete images",
      tone: "danger",
    });
    if (!ok) return;
    setClearing(true);
    try {
      const r = await removeUnused({ ids: unused.items.map((m) => m._id) });
      toast(`Deleted ${r.removed} image${r.removed === 1 ? "" : "s"} · freed ${formatBytes(r.bytes)}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setClearing(false);
    }
  }

  const items: Item[] = view === "all" ? all.results : (unused?.items ?? []);
  const loading = view === "all" ? all.status === "LoadingFirstPage" : unused === undefined;

  return (
    <div>
      <PageHeader
        title="Media library"
        description="Images uploaded from the dashboard. Each one is resized for the web and saved as WebP before it's uploaded, so it takes as little space as possible."
        actions={
          <label className="inline-flex">
            <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[4px] bg-signal px-3.5 text-[0.85rem] font-semibold text-ink-950 hover:bg-signal-300">
              <UploadSimple className="size-4" aria-hidden /> Upload images
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              disabled={!!queue}
              onChange={(e) => e.target.files && uploadAll(e.target.files).then(() => (e.target.value = ""))}
            />
          </label>
        }
      />

      <Panel className="mb-6">
        <StorageMeter compact href="/admin/storage" />
      </Panel>

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
            <Segmented
              label="Show"
              value={view}
              onChange={(v) => router.replace(v === "unused" ? "/admin/media?view=unused" : "/admin/media")}
              options={[
                { value: "all", label: "All" },
                { value: "unused", label: "Not used", count: unused?.count },
              ]}
            />
            {view === "unused" && unused?.count ? (
              <Button size="sm" variant="danger" loading={clearing} onClick={clearUnused}>
                Delete all unused · {formatBytes(unused.bytes)}
              </Button>
            ) : null}
            <p className="ms-auto text-[0.78rem] text-a-faint">{dragging ? "Drop to upload" : "Tip: drag images anywhere in this box to upload."}</p>
          </div>
          {queue ? (
            <div className="mt-3">
              <p className="mb-1 text-[0.78rem] text-a-muted">
                Uploading {Math.min(queue.done + 1, queue.total)} of {queue.total}
              </p>
              <UploadProgress progress={progress} />
            </div>
          ) : null}
        </div>

        {loading ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          view === "all" ? (
            <EmptyState icon={<Images className="size-6" aria-hidden />} title="No images yet" body="Upload logos, reel covers and photos here, then pick them anywhere in the dashboard." />
          ) : (
            <EmptyState icon={<Images className="size-6" aria-hidden />} title="Nothing unused" body="Every image in the library is shown somewhere on the website." />
          )
        ) : (
          <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
            {items.map((m) => (
              <li key={m._id} className="group overflow-hidden rounded-[6px] border border-a-line">
                <div className="relative aspect-square bg-a-hover">
                  {m.url && m.kind === "image" ? (
                    <Thumb src={m.url} alt={m.alt ?? ""} sizes="(min-width: 1536px) 15vw, (min-width: 1024px) 18vw, 45vw" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-a-faint">
                      {m.kind === "video" ? <FilmStrip className="size-8" aria-hidden /> : <FileText className="size-8" aria-hidden />}
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
                    <IconButton label={`Delete ${m.name}`} tone="danger" className="bg-a-surface/90 shadow" onClick={() => deleteItem(m)}>
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
                      if (name && name !== m.name) rename({ id: m._id, name, alt: m.alt }).catch((err) => toast(errorMessage(err), "error"));
                    }}
                  />
                  <p className="px-1 text-[0.7rem] text-a-faint">
                    {formatBytes(m.size)}
                    {m.width ? ` · ${m.width}×${m.height}` : ""} · {relativeTime(m._creationTime)}
                  </p>
                  <div className="mt-1 px-1">
                    {view === "unused" || (m.usedIn && m.usedIn.length === 0) ? (
                      <Badge tone="warn">Not used</Badge>
                    ) : m.usedIn?.length ? (
                      <Link href={m.usedIn[0].href} className="block truncate text-[0.7rem] text-a-muted hover:text-a-text hover:underline" title={m.usedIn.map((u) => u.label).join("\n")}>
                        {m.usedIn[0].label}
                        {m.usedIn.length > 1 ? ` +${m.usedIn.length - 1}` : ""}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {view === "all" && (all.status === "CanLoadMore" || all.status === "LoadingMore") ? (
          <div className="flex justify-center border-t border-a-line p-3">
            <Button size="sm" onClick={() => all.loadMore(40)} loading={all.status === "LoadingMore"}>
              Load more
            </Button>
          </div>
        ) : null}
        {view === "unused" && unused && unused.count > unused.items.length ? (
          <p className="border-t border-a-line p-3 text-center text-[0.78rem] text-a-muted">
            Showing {unused.items.length} of {unused.count}. Delete these to see the rest.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
