"use client";

import { api } from "@convex/_generated/api";
import { FilmStrip } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CloudinaryUsage } from "@/lib/cloudinary-server";
import { APP_STAGE, STAGE_ORDER, type AppStageKey } from "../format";
import { formatBytes, Thumb } from "../media";
import { errorMessage, useAdminFetch, useAdminMutation, useAdminQuery, useSession } from "../session";
import { StorageMeter, useStorageUsage } from "../storage";
import { Button, Field, PageHeader, Panel, Select, Skeleton, useFeedback } from "../ui";

export function StoragePage() {
  const { can } = useSession();
  const usage = useStorageUsage();

  return (
    <div>
      <PageHeader
        title="Storage"
        description="The free Convex plan includes 1 GB of stored files and 1 GB of file downloads a month. This page shows what's using the space and lets you clear what isn't needed."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Panel title="Files stored">
            <StorageMeter usage={usage} />
            {usage?.largest.length ? (
              <div className="mt-6">
                <h3 className="mb-2 text-[0.8rem] font-semibold text-a-muted">Largest files in the media library</h3>
                <ul className="divide-y divide-a-line rounded-[5px] border border-a-line">
                  {usage.largest.map((f) => (
                    <li key={f._id} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.82rem]">
                      <span className="min-w-0 truncate">{f.name}</span>
                      <span className="shrink-0 font-mono text-[0.75rem] tabular text-a-muted">{formatBytes(f.size)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>
          <VideoHosting />
          {can("media") ? <UnusedImages /> : null}
          {can("careers") ? <OldCvFiles /> : null}
        </div>

        <Panel title="What keeps storage small">
          <ul className="space-y-3 text-[0.82rem] leading-relaxed text-a-muted">
            <li>
              <span className="font-semibold text-a-text">Images are shrunk before upload.</span> Each one is resized for where it&apos;s used and
              saved as WebP. Logos are at most 512 px, and covers are at most 1920 px.
            </li>
            <li>
              <span className="font-semibold text-a-text">No duplicates.</span> Uploading an image that&apos;s already in the library reuses the
              existing copy.
            </li>
            <li>
              <span className="font-semibold text-a-text">Videos never touch Convex.</span> They&apos;re shrunk to 720p in the browser (a 30-second
              reel is about 5 MB) and go straight to Cloudinary. Videos that no reel uses any more are deleted there every night.
            </li>
            <li>
              <span className="font-semibold text-a-text">CVs are capped at 5 MB.</span> Photos of CVs are shrunk first.
            </li>
            <li>
              <span className="font-semibold text-a-text">Abandoned uploads are deleted.</span> Files that are never saved (for example, a CV from
              an application that wasn&apos;t sent) are removed after about two hours.
            </li>
            <li>
              <span className="font-semibold text-a-text">Visitors don&apos;t download from Convex.</span> The website shows cached, resized copies
              of images, which saves most of the monthly 1 GB of downloads for the dashboard.
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/** Cloudinary (videos): the free plan's 25 credits per 30 days, and what's using them. */
function VideoHosting() {
  const call = useAdminFetch();
  const { confirm, toast } = useFeedback();
  const [data, setData] = useState<CloudinaryUsage | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    call<CloudinaryUsage>("/api/cloudinary/usage")
      .then((r) => live && setData(r))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [call]);

  async function cleanUp() {
    const ok = await confirm({
      title: "Delete videos no reel uses?",
      body: "Deletes uploads that were never saved to a reel, and videos that were replaced or whose reel was deleted, once they're 6 hours old. This also runs on its own every night. It can't be undone.",
      confirmLabel: "Delete unused videos",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await call<{ removed: number }>("/api/cloudinary/cleanup", { method: "POST" });
      toast(r.removed ? `Deleted ${r.removed} unused video${r.removed === 1 ? "" : "s"}` : "No unused videos to delete");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const used = data && data.configured && !("error" in data) ? data : null;
  const share = used?.creditsUsed != null && used.creditsLimit ? used.creditsUsed / used.creditsLimit : null;
  const level = share === null ? null : share >= 0.9 ? "danger" : share >= 0.7 ? "warn" : null;

  return (
    <Panel
      title="Video hosting (Cloudinary)"
      description="Reels are shrunk to 720p before upload and stored on Cloudinary's free plan: 25 credits every 30 days, where 1 credit is about 1 GB stored or 1 GB watched."
      actions={
        used ? (
          <Button size="sm" variant="ghost" loading={busy} onClick={cleanUp}>
            Delete unused videos
          </Button>
        ) : null
      }
    >
      {failed ? (
        <p className="text-[0.84rem] text-a-muted">Couldn&apos;t reach Cloudinary right now. Try again later.</p>
      ) : data === null ? (
        <Skeleton className="h-16" />
      ) : !data.configured ? (
        <p className="text-[0.84rem] text-a-muted">
          Not connected yet. Once the Cloudinary keys are added in Vercel (see the README), usage shows here and reels can be uploaded.
        </p>
      ) : "error" in data ? (
        <p className="text-[0.84rem] text-a-danger">{data.error}</p>
      ) : (
        <div>
          {share !== null ? (
            <>
              <p className="text-[0.88rem] text-a-text">
                <span className="font-semibold tabular">{used!.creditsUsed!.toFixed(2)}</span>
                <span className="text-a-muted">
                  {" "}
                  of {used!.creditsLimit} credits used in the last 30 days · {Math.round(share * 100)}%
                </span>
              </p>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-a-line" role="meter" aria-label="Cloudinary credits used" aria-valuemin={0} aria-valuemax={used!.creditsLimit!} aria-valuenow={used!.creditsUsed!}>
                <span className="block h-full rounded-full" style={{ width: `${Math.max(0.6, Math.min(100, share * 100))}%`, background: "var(--viz-leads)" }} />
              </div>
            </>
          ) : null}
          <dl className="mt-4 grid grid-cols-3 gap-4 text-[0.82rem]">
            <div>
              <dt className="text-a-muted">Stored</dt>
              <dd className="font-semibold tabular text-a-text">{used!.storageBytes != null ? formatBytes(used!.storageBytes) : "—"}</dd>
            </div>
            <div>
              <dt className="text-a-muted">Watched (30 days)</dt>
              <dd className="font-semibold tabular text-a-text">{used!.bandwidthBytes != null ? formatBytes(used!.bandwidthBytes) : "—"}</dd>
            </div>
            <div>
              <dt className="text-a-muted">Processing</dt>
              <dd className="font-semibold tabular text-a-text">{used!.transformations ?? "—"}</dd>
            </div>
          </dl>
          {level ? (
            <p className={`mt-3 text-[0.8rem] font-semibold ${level === "danger" ? "text-a-danger" : "text-a-warn"}`}>
              {level === "danger"
                ? "Almost out of credits for this 30-day window. Videos may stop playing until older usage rolls off."
                : "Credits are filling up. Deleting reels you no longer show frees storage."}
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function UnusedImages() {
  const data = useAdminQuery(api.media.unused, {});
  const removeUnused = useAdminMutation(api.media.removeUnused, { refresh: true });
  const { confirm, toast } = useFeedback();
  const [busy, setBusy] = useState(false);

  async function deleteAll() {
    if (!data?.count) return;
    const ok = await confirm({
      title: `Delete ${data.count} unused image${data.count === 1 ? "" : "s"}?`,
      body: `They aren't shown anywhere on the website. This frees ${formatBytes(data.bytes)} and can't be undone.`,
      confirmLabel: "Delete images",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = await removeUnused({ ids: data.items.map((m) => m._id) });
      toast(`Deleted ${result.removed} image${result.removed === 1 ? "" : "s"} · freed ${formatBytes(result.bytes)}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Unused images"
      description="Images in the media library that aren't shown on the website."
      actions={
        data?.count ? (
          <Button size="sm" variant="danger" loading={busy} onClick={deleteAll}>
            Delete {data.count} unused
          </Button>
        ) : null
      }
    >
      {data === undefined ? (
        <Skeleton className="h-20" />
      ) : data.count === 0 ? (
        <p className="text-[0.84rem] text-a-muted">Every image in the library is in use.</p>
      ) : (
        <>
          <p className="mb-3 text-[0.84rem] text-a-text">
            {data.count} file{data.count === 1 ? "" : "s"} · <span className="tabular">{formatBytes(data.bytes)}</span>
          </p>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {data.items.slice(0, 16).map((m) => (
              <li key={m._id} className="relative aspect-square overflow-hidden rounded-[4px] border border-a-line bg-a-hover" title={`${m.name} · ${formatBytes(m.size)}`}>
                {m.url && m.kind === "image" ? (
                  <Thumb src={m.url} alt={m.name} sizes="96px" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-a-faint">
                    <FilmStrip className="size-5" aria-hidden />
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.8rem] text-a-muted">
            {data.count > 16 ? `And ${data.count - 16} more. ` : ""}
            <Link href="/admin/media?view=unused" className="font-semibold text-signal-600 hover:underline dark:text-signal">
              Review them in the media library
            </Link>
          </p>
        </>
      )}
    </Panel>
  );
}

const AGE_OPTIONS = [
  { days: 90, label: "3 months" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
];

function OldCvFiles() {
  const [stages, setStages] = useState<AppStageKey[]>(["rejected"]);
  const [days, setDays] = useState(180);
  const preview = useAdminQuery(api.applications.cvCleanupPreview, stages.length ? { olderThanDays: days, stages } : "skip");
  const purge = useAdminMutation(api.applications.purgeCvFiles);
  const { confirm, toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const ageLabel = AGE_OPTIONS.find((o) => o.days === days)?.label ?? `${days} days`;

  async function run() {
    if (!preview?.count) return;
    const ok = await confirm({
      title: `Delete ${preview.count} CV file${preview.count === 1 ? "" : "s"}?`,
      body: `Only the attached files are deleted (${formatBytes(preview.bytes)}). The applications stay, with contact details, answers, notes and history. This can't be undone.`,
      confirmLabel: "Delete CV files",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      let removed = 0;
      let bytes = 0;
      for (let round = 0; round < 20; round++) {
        const r = await purge({ olderThanDays: days, stages });
        removed += r.removed;
        bytes += r.bytes;
        if (!r.remaining || !r.removed) break;
      }
      toast(`Deleted ${removed} CV file${removed === 1 ? "" : "s"} · freed ${formatBytes(bytes)}`);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Old CV files"
      description="On a hiring site, CVs grow the fastest. Delete the files of applications you've finished with; the applications themselves stay."
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <fieldset>
          <legend className="mb-2 text-[0.8rem] font-semibold text-a-text">Applications in</legend>
          <div className="flex flex-wrap gap-2">
            {STAGE_ORDER.map((s) => {
              const checked = stages.includes(s);
              return (
                <label
                  key={s}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[4px] border border-a-line px-2.5 py-1.5 text-[0.8rem] hover:bg-a-hover"
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--color-signal)]"
                    checked={checked}
                    onChange={() => setStages(checked ? stages.filter((x) => x !== s) : [...stages, s])}
                  />
                  {APP_STAGE[s].label}
                </label>
              );
            })}
          </div>
        </fieldset>
        <Field label="Not updated for" htmlFor="cv-age">
          <Select id="cv-age" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36">
            {AGE_OPTIONS.map((o) => (
              <option key={o.days} value={o.days}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[5px] border border-a-line bg-a-raised px-4 py-3">
        <p className="text-[0.84rem] text-a-text" aria-live="polite">
          {!stages.length
            ? "Pick at least one stage."
            : preview === undefined
              ? "Counting…"
              : preview.count
                ? `${preview.count} CV file${preview.count === 1 ? "" : "s"} · ${formatBytes(preview.bytes)} · not updated for ${ageLabel}`
                : `No CV files match. Nothing in these stages has gone ${ageLabel} without an update.`}
        </p>
        <Button size="sm" variant="danger" disabled={!preview?.count} loading={busy} onClick={run}>
          Delete these CV files
        </Button>
      </div>
    </Panel>
  );
}
