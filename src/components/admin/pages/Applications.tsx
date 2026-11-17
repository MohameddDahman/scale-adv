"use client";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  ArrowLeft,
  ArrowSquareOut,
  DownloadSimple,
  EnvelopeSimple,
  FileText,
  IdentificationCard,
  Kanban as KanbanIcon,
  Paperclip,
  Phone,
  Rows,
  Trash,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { useConvex } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { Kanban } from "../Kanban";
import { formatBytes } from "../media";
import { APP_STAGE, dateTime, downloadCsv, relativeTime, shortDate, STAGE_ORDER, todayStamp, whatsappHref, type AppStageKey } from "../format";
import { errorMessage, useAdminMutation, useAdminPaginatedQuery, useAdminQuery, useSession } from "../session";
import { Timeline } from "../Timeline";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  LoadingRows,
  PageHeader,
  Panel,
  SearchInput,
  Segmented,
  Select,
  StarRating,
  TagInput,
  useFeedback,
} from "../ui";

type App = Doc<"applications">;

export function ApplicationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view") === "board" ? "board" : "table";
  const stage = (params.get("stage") as AppStageKey | null) ?? null;
  const jobId = (params.get("job") as Id<"jobs"> | null) ?? null;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const jobs = useAdminQuery(api.jobs.options, {});
  const counts = useAdminQuery(api.applications.counts, { jobId: jobId ?? undefined });
  const update = useAdminMutation(api.applications.update);
  const updateMany = useAdminMutation(api.applications.updateMany);
  const remove = useAdminMutation(api.applications.remove);
  const markSeen = useAdminMutation(api.dashboard.markSeen);
  const { toast, confirm } = useFeedback();
  const convex = useConvex();
  const { token } = useSession();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    markSeen({ area: "applications" }).catch(() => undefined);
  }, [markSeen]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Everyone who applied through the careers page, by role and stage."
        actions={
          <>
            <Segmented
              label="View"
              value={view}
              onChange={(v) => setParam("view", v === "board" ? "board" : null)}
              options={[
                { value: "table", label: <span className="inline-flex items-center gap-1.5"><Rows className="size-4" aria-hidden />List</span> },
                { value: "board", label: <span className="inline-flex items-center gap-1.5"><KanbanIcon className="size-4" aria-hidden />Board</span> },
              ]}
            />
            <Button
              icon={<DownloadSimple className="size-4" aria-hidden />}
              loading={exporting}
              onClick={async () => {
                if (!token) return;
                setExporting(true);
                try {
                  const rows = await convex.query(api.applications.exportAll, { token, jobId: jobId ?? undefined, stage: stage ?? undefined });
                  if (!rows.length) toast("Nothing to export yet.", "info");
                  else downloadCsv(`scale-applications-${todayStamp()}.csv`, rows);
                } catch (e) {
                  toast(errorMessage(e), "error");
                } finally {
                  setExporting(false);
                }
              }}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by role" className="w-64" value={jobId ?? ""} onChange={(e) => setParam("job", e.target.value || null)}>
          <option value="">All roles + open applications</option>
          {(jobs ?? []).map((j) => (
            <option key={j._id} value={j._id}>
              {j.title}
              {j.status !== "open" ? ` (${j.status})` : ""}
            </option>
          ))}
        </Select>
        {view === "table" ? <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, phone" className="w-full max-w-xs" /> : null}
      </div>

      {view === "board" ? (
        <AppsBoard
          jobId={jobId}
          onMove={(id, to) =>
            update({ id: id as Id<"applications">, stage: to as AppStageKey })
              .then(() => toast(`Moved to ${APP_STAGE[to as AppStageKey].label}`))
              .catch((e) => toast(errorMessage(e), "error"))
          }
          onOpen={(id) => router.push(`/admin/applications/${id}`)}
        />
      ) : (
        <Panel padded={false}>
          <div className="border-b border-a-line p-3">
            <Segmented
              label="Stage"
              value={stage ?? "all"}
              onChange={(v) => setParam("stage", v === "all" ? null : v)}
              options={[{ value: "all", label: "All", count: counts?.all }, ...STAGE_ORDER.map((s) => ({ value: s, label: APP_STAGE[s].label, count: counts?.[s] }))]}
            />
          </div>
          {selected.size ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-a-line bg-a-accent-soft px-4 py-2 text-[0.84rem]">
              <span className="font-semibold">{selected.size} selected</span>
              <Select
                aria-label="Move selected to"
                className="!h-8 w-52"
                value=""
                onChange={async (e) => {
                  const to = e.target.value as AppStageKey;
                  if (!to) return;
                  await updateMany({ ids: [...selected] as Id<"applications">[], stage: to }).catch((err) => toast(errorMessage(err), "error"));
                  toast(`Moved ${selected.size} to ${APP_STAGE[to].label}`);
                  setSelected(new Set());
                }}
              >
                <option value="">Move to…</option>
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {APP_STAGE[s].label}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="ghost"
                className="text-a-danger"
                icon={<Trash className="size-4" aria-hidden />}
                onClick={async () => {
                  if (!(await confirm({ title: `Delete ${selected.size} application${selected.size > 1 ? "s" : ""}?`, body: "Their CVs are deleted too. This can't be undone.", confirmLabel: "Delete", tone: "danger" }))) return;
                  await remove({ ids: [...selected] as Id<"applications">[] }).catch((err) => toast(errorMessage(err), "error"));
                  toast("Deleted");
                  setSelected(new Set());
                }}
              >
                Delete
              </Button>
              <button type="button" className="ms-auto cursor-pointer text-[0.8rem] font-semibold text-a-muted hover:text-a-text" onClick={() => setSelected(new Set())}>
                Clear selection
              </button>
            </div>
          ) : null}
          <AppsTable jobId={jobId} stage={stage} search={search} selected={selected} setSelected={setSelected} />
        </Panel>
      )}
    </div>
  );
}

function AppsTable({
  jobId,
  stage,
  search,
  selected,
  setSelected,
}: {
  jobId: Id<"jobs"> | null;
  stage: AppStageKey | null;
  search: string;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
}) {
  const router = useRouter();
  const { results, status, loadMore } = useAdminPaginatedQuery(
    api.applications.list,
    { jobId: jobId ?? undefined, stage: stage ?? undefined, search: search || undefined },
    { initialNumItems: 25 },
  );
  if (status === "LoadingFirstPage") return <LoadingRows />;
  if (!results.length) {
    return (
      <EmptyState
        icon={<IdentificationCard className="size-6" aria-hidden />}
        title={search || stage || jobId ? "No applications match" : "No applications yet"}
        body={search || stage || jobId ? "Try another filter." : "Applications from the careers page land here."}
      />
    );
  }
  const all = results.every((r) => selected.has(r._id));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[52rem] text-[0.84rem]">
        <thead className="border-b border-a-line bg-a-raised text-[0.75rem] text-a-muted">
          <tr>
            <th scope="col" className="w-10 px-3 py-2.5">
              <input type="checkbox" aria-label="Select all on this page" checked={all} onChange={() => setSelected(all ? new Set() : new Set(results.map((r) => r._id)))} className="size-4 accent-[var(--color-signal)]" />
            </th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Applicant</th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Role</th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Stage</th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Rating</th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Files</th>
            <th scope="col" className="px-3 py-2.5 text-end font-semibold">Applied</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-a-line">
          {results.map((a) => (
            <tr key={a._id} className={cn("cursor-pointer hover:bg-a-hover", selected.has(a._id) && "bg-a-accent-soft")} onClick={() => router.push(`/admin/applications/${a._id}`)}>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" aria-label={`Select ${a.name}`} checked={selected.has(a._id)} onChange={() => toggle(a._id)} className="size-4 accent-[var(--color-signal)]" />
              </td>
              <td className="px-3 py-2.5">
                <Link href={`/admin/applications/${a._id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                  {a.name}
                </Link>
                <span className="block text-[0.76rem] text-a-muted">{a.email}</span>
              </td>
              <td className="px-3 py-2.5 text-a-muted">{a.jobTitle}</td>
              <td className="px-3 py-2.5">
                <Badge tone={APP_STAGE[a.stage].tone} dot>
                  {APP_STAGE[a.stage].label}
                </Badge>
              </td>
              <td className="px-3 py-2.5">
                <StarRating value={a.rating ?? null} size={14} />
              </td>
              <td className="px-3 py-2.5 text-a-muted">
                <span className="inline-flex items-center gap-2">
                  {a.cv ? <Paperclip className="size-4" aria-label="Has CV" /> : null}
                  {a.portfolioUrl ? <ArrowSquareOut className="size-4" aria-label="Has portfolio link" /> : null}
                </span>
              </td>
              <td className="px-3 py-2.5 text-end text-a-muted" title={dateTime(a._creationTime)}>
                {relativeTime(a._creationTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {status === "CanLoadMore" || status === "LoadingMore" ? (
        <div className="flex justify-center border-t border-a-line p-3">
          <Button size="sm" onClick={() => loadMore(25)} loading={status === "LoadingMore"}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function AppsBoard({ jobId, onMove, onOpen }: { jobId: Id<"jobs"> | null; onMove: (id: string, to: string) => void; onOpen: (id: string) => void }) {
  const board = useAdminQuery(api.applications.board, { jobId: jobId ?? undefined });
  if (!board) return <LoadingRows />;
  return (
    <Kanban
      columns={STAGE_ORDER.map((s) => ({ key: s, label: APP_STAGE[s].label, tone: APP_STAGE[s].tone, items: board[s] }))}
      onMove={onMove}
      onOpen={(item) => onOpen(item._id)}
      renderCard={(a: App) => (
        <div>
          <p className="truncate text-[0.85rem] font-semibold">{a.name}</p>
          <p className="truncate text-[0.76rem] text-a-muted">{a.jobTitle}</p>
          <div className="mt-2 flex items-center justify-between">
            <StarRating value={a.rating ?? null} size={12} />
            <span className="text-[0.7rem] text-a-faint">{relativeTime(a._creationTime)}</span>
          </div>
        </div>
      )}
    />
  );
}

/* ------------------------------ Detail ------------------------------ */

export function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const data = useAdminQuery(api.applications.get, { id: id as Id<"applications"> });
  const update = useAdminMutation(api.applications.update);
  const remove = useAdminMutation(api.applications.remove);
  const { toast, confirm } = useFeedback();
  const router = useRouter();

  if (data === undefined) return <LoadingRows rows={10} />;
  if (data === null) {
    return (
      <Panel>
        <EmptyState title="This application was deleted" action={<Button onClick={() => router.push("/admin/applications")}>Back to applications</Button>} />
      </Panel>
    );
  }
  const a = data.application;
  const patch = (p: { stage?: AppStageKey; rating?: number | null; tags?: string[] }) => update({ id: a._id, ...p }).catch((e) => toast(errorMessage(e), "error"));
  const isPdf = a.cvType === "application/pdf";
  const isImage = a.cvType?.startsWith("image/");

  return (
    <div>
      <Link href="/admin/applications" className="mb-4 inline-flex items-center gap-2 text-[0.84rem] font-semibold text-a-muted hover:text-a-text">
        <ArrowLeft className="size-4" aria-hidden /> Applications
      </Link>
      <PageHeader
        title={a.name}
        description={
          <>
            Applied for{" "}
            {data.job ? (
              <Link href={`/admin/jobs/${data.job._id}`} className="font-semibold text-a-text hover:underline">
                {a.jobTitle}
              </Link>
            ) : (
              <span className="font-semibold text-a-text">{a.jobTitle}</span>
            )}{" "}
            · {dateTime(a._creationTime)} · {a.locale === "ar" ? "applied in Arabic" : "applied in English"}
          </>
        }
        actions={
          <>
            <Button
              variant="ghost"
              className="text-a-danger"
              icon={<Trash className="size-4" aria-hidden />}
              onClick={async () => {
                if (!(await confirm({ title: `Delete ${a.name}'s application?`, body: "The CV file is deleted too.", confirmLabel: "Delete", tone: "danger" }))) return;
                await remove({ ids: [a._id] });
                toast("Application deleted");
                router.push("/admin/applications");
              }}
            >
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-6">
          <Panel>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Stage" htmlFor="stage">
                <Select id="stage" value={a.stage} onChange={(e) => patch({ stage: e.target.value as AppStageKey })}>
                  {STAGE_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {APP_STAGE[s].label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Your rating">
                <StarRating value={a.rating ?? null} onChange={(v) => patch({ rating: v })} size={22} />
              </Field>
              <Field label="Tags">
                <TagInput value={a.tags} onChange={(tags) => patch({ tags })} placeholder="e.g. strong-portfolio" />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={whatsappHref(a.phone, `Hi ${a.name.split(" ")[0]}, this is SCALE ADV about your application for ${a.jobTitle}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#25d366] px-3.5 text-[0.84rem] font-semibold text-[#0b3d1f] hover:opacity-90">
                <WhatsappLogo className="size-4" weight="fill" aria-hidden /> WhatsApp
              </a>
              <a href={`mailto:${a.email}?subject=${encodeURIComponent(`Your application — ${a.jobTitle}`)}`} className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-a-line-strong px-3.5 text-[0.84rem] font-semibold hover:bg-a-hover">
                <EnvelopeSimple className="size-4" aria-hidden /> Email
              </a>
              <a href={`tel:${a.phone}`} className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-a-line-strong px-3.5 text-[0.84rem] font-semibold hover:bg-a-hover">
                <Phone className="size-4" aria-hidden /> Call
              </a>
            </div>
          </Panel>

          <Panel title="Profile">
            <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-3 text-[0.86rem]">
              <Row label="Email">{a.email}</Row>
              <Row label="Phone"><span dir="ltr">{a.phone}</span></Row>
              {a.city ? <Row label="City">{a.city}</Row> : null}
              {a.experience ? <Row label="Experience">{a.experience}</Row> : null}
              {a.portfolioUrl ? (
                <Row label="Portfolio">
                  <a href={a.portfolioUrl} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-signal-600 hover:underline dark:text-signal">
                    {a.portfolioUrl.replace(/^https?:\/\//, "")}
                  </a>
                </Row>
              ) : null}
              {a.profileUrl ? (
                <Row label="Profile">
                  <a href={a.profileUrl} target="_blank" rel="noopener noreferrer" className="break-all text-signal-600 hover:underline dark:text-signal">
                    {a.profileUrl.replace(/^https?:\/\//, "")}
                  </a>
                </Row>
              ) : null}
              {a.expectedSalary ? <Row label="Expected pay">{a.expectedSalary} EGP / month</Row> : null}
              {a.startDate ? <Row label="Can start">{a.startDate}</Row> : null}
            </dl>
          </Panel>

          {a.answers.length || a.coverNote ? (
            <Panel title="Answers">
              <div className="space-y-5">
                {a.answers.map((x) => (
                  <div key={x.questionId}>
                    <p className="text-[0.8rem] font-semibold text-a-muted">{x.label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[0.9rem] leading-relaxed" dir="auto">
                      {/^https?:\/\//.test(x.value) ? (
                        <a href={x.value} target="_blank" rel="noopener noreferrer" className="break-all text-signal-600 hover:underline dark:text-signal">
                          {x.value}
                        </a>
                      ) : (
                        x.value
                      )}
                    </p>
                  </div>
                ))}
                {a.coverNote ? (
                  <div>
                    <p className="text-[0.8rem] font-semibold text-a-muted">Why SCALE?</p>
                    <p className="mt-1 whitespace-pre-wrap text-[0.9rem] leading-relaxed" dir="auto">
                      {a.coverNote}
                    </p>
                  </div>
                ) : null}
              </div>
            </Panel>
          ) : null}

          <Panel
            title="CV"
            actions={
              data.cvUrl ? (
                <a href={data.cvUrl} target="_blank" rel="noopener noreferrer" download={a.cvName} className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-a-line-strong px-3 text-[0.8rem] font-semibold hover:bg-a-hover">
                  <DownloadSimple className="size-4" aria-hidden /> Download
                </a>
              ) : null
            }
          >
            {data.cvUrl ? (
              <div>
                <p className="mb-3 flex items-center gap-2 text-[0.82rem] text-a-muted">
                  <FileText className="size-4" aria-hidden />
                  {a.cvName ?? "CV"} {a.cvSize ? `· ${formatBytes(a.cvSize)}` : ""}
                </p>
                {isPdf ? (
                  <iframe src={data.cvUrl} title={`${a.name} CV`} className="h-[70vh] w-full rounded-[4px] border border-a-line bg-white" />
                ) : isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.cvUrl} alt={`${a.name} CV`} className="max-h-[70vh] rounded-[4px] border border-a-line" />
                ) : (
                  <p className="text-[0.84rem] text-a-muted">Word documents can’t be previewed here. Download to open it.</p>
                )}
              </div>
            ) : a.cvRemovedAt ? (
              <p className="text-[0.84rem] text-a-muted">
                The CV file ({a.cvName ?? "CV"}
                {a.cvSize ? `, ${formatBytes(a.cvSize)}` : ""}) was deleted on {shortDate(a.cvRemovedAt)} to free up storage. Everything else in the
                application is kept.
              </p>
            ) : (
              <p className="text-[0.84rem] text-a-muted">No CV attached{a.portfolioUrl ? " — they shared a portfolio link instead." : "."}</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Notes & history">
            <Timeline entity="application" entityId={a._id} notes={data.notes} />
          </Panel>
          {data.otherApplications.length ? (
            <Panel title="Also applied for">
              <ul className="divide-y divide-a-line">
                {data.otherApplications.map((o) => (
                  <li key={o._id}>
                    <Link href={`/admin/applications/${o._id}`} className="flex items-center justify-between gap-3 py-2 hover:underline">
                      <span className="min-w-0 truncate">{o.jobTitle}</span>
                      <Badge tone={APP_STAGE[o.stage].tone}>{APP_STAGE[o.stage].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-a-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}
