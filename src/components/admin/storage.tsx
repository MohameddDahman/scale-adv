"use client";

import { api } from "@convex/_generated/api";
import Link from "next/link";
import { cn } from "@/lib/format";
import { formatBytes } from "./media";
import { useAdminQuery } from "./session";
import { Skeleton } from "./ui";

type Usage = NonNullable<ReturnType<typeof useStorageUsage>>;

export function useStorageUsage() {
  return useAdminQuery(api.storage.usage, {});
}

const SEGMENTS = [
  { key: "images", label: "Images", color: "var(--viz-leads)" },
  { key: "other", label: "CVs & other files", color: "var(--viz-apps)" },
  { key: "videos", label: "Videos", color: "var(--viz-neutral)" },
] as const;

/**
 * How full the free plan's 1 GB of file storage is. The bar is split by
 * kind of file; a legend names each part, and the numbers are written out.
 */
export function StorageMeter({ usage, compact, href }: { usage?: Usage; compact?: boolean; href?: string }) {
  const fetched = useStorageUsage();
  const data = usage ?? fetched;
  if (!data) return <Skeleton className={compact ? "h-12" : "h-24"} />;

  const share = data.totalBytes / data.limitBytes;
  const percent = share > 0 && share < 0.01 ? "<1" : String(Math.round(share * 100));
  const level = share >= 0.9 ? "danger" : share >= 0.7 ? "warn" : null;
  // The compact meter shows one total, so it needs no legend; the full one splits by kind.
  const parts = compact
    ? [{ key: "total", label: "Used", color: "var(--viz-leads)", count: data.fileCount, bytes: data.totalBytes }].filter((p) => p.count > 0)
    : SEGMENTS.map((s) => ({ ...s, ...data[s.key] })).filter((p) => p.count > 0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[0.88rem] text-a-text">
          <span className="font-semibold tabular">{formatBytes(data.totalBytes)}</span>
          <span className="text-a-muted"> of 1 GB used · {percent}%</span>
        </p>
        {href ? (
          <Link href={href} className="text-[0.8rem] font-semibold text-signal-600 hover:underline dark:text-signal">
            Storage details
          </Link>
        ) : null}
      </div>
      <div
        className="mt-2 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-a-line"
        role="meter"
        aria-label="File storage used"
        aria-valuemin={0}
        aria-valuemax={data.limitBytes}
        aria-valuenow={data.totalBytes}
        aria-valuetext={`${formatBytes(data.totalBytes)} of 1 GB`}
      >
        {parts.map((p) => (
          <span
            key={p.key}
            className="h-full first:rounded-s-full"
            style={{ width: `${Math.max(0.6, (p.bytes / data.limitBytes) * 100)}%`, background: p.color }}
          />
        ))}
      </div>
      {!compact ? (
        <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[0.78rem] text-a-muted">
          {parts.map((p) => (
            <li key={p.key} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
              <span className="text-a-text">{p.label}</span>
              <span className="tabular">
                {formatBytes(p.bytes)} · {p.count} file{p.count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
          {parts.length === 0 ? <li>No files stored yet.</li> : null}
        </ul>
      ) : null}
      {level ? (
        <p className={cn("mt-2 text-[0.8rem] font-semibold", level === "danger" ? "text-a-danger" : "text-a-warn")}>
          {level === "danger"
            ? "Storage is almost full. Delete unused images and old CV files, or upgrade the Convex plan."
            : "Storage is filling up. Clearing unused images and old CV files frees space."}
        </p>
      ) : null}
    </div>
  );
}
