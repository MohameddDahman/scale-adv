"use client";

import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  DownloadSimple,
  EnvelopeSimple,
  Kanban as KanbanIcon,
  Phone,
  Plus,
  Rows,
  Trash,
  Tray,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { useConvex } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { useNow } from "../hooks";
import { Kanban } from "../Kanban";
import { dateTime, downloadCsv, egp, LEAD_ORDER, LEAD_STATUS, relativeTime, SERVICE_LABEL, todayStamp, whatsappHref, type LeadStatusKey } from "../format";
import { errorMessage, useAdminMutation, useAdminPaginatedQuery, useAdminQuery, useSession } from "../session";
import { Timeline } from "../Timeline";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  LoadingRows,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Segmented,
  Select,
  Sheet,
  TagInput,
  Textarea,
  useFeedback,
} from "../ui";

type Lead = Doc<"leads">;

export function LeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view") === "board" ? "board" : "table";
  const status = (params.get("status") as LeadStatusKey | null) ?? null;
  const openId = params.get("id");
  const creating = params.get("new") === "1";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const markSeen = useAdminMutation(api.dashboard.markSeen);
  useEffect(() => {
    markSeen({ area: "leads" }).catch(() => undefined);
  }, [markSeen]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const counts = useAdminQuery(api.leads.counts, {});
  const update = useAdminMutation(api.leads.update);
  const updateMany = useAdminMutation(api.leads.updateMany);
  const remove = useAdminMutation(api.leads.remove);
  const staff = useAdminQuery(api.users.staff, {});
  const staffMap = useMemo(() => new Map((staff ?? []).map((s) => [s._id as string, s.name])), [staff]);
  const { toast, confirm } = useFeedback();
  const convex = useConvex();
  const { token } = useSession();
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    if (!token) return;
    setExporting(true);
    try {
      const rows = await convex.query(api.leads.exportAll, { token, status: status ?? undefined });
      if (!rows.length) toast("Nothing to export yet.", "info");
      else downloadCsv(`scale-leads-${todayStamp()}.csv`, rows);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Every brief from the website's contact form, plus leads you add by hand."
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
            <Button icon={<DownloadSimple className="size-4" aria-hidden />} onClick={exportCsv} loading={exporting}>
              Export CSV
            </Button>
            <Button variant="primary" icon={<Plus className="size-4" weight="bold" aria-hidden />} onClick={() => setParam("new", "1")}>
              Add lead
            </Button>
          </>
        }
      />

      {view === "board" ? (
        <LeadsBoard
          staffMap={staffMap}
          onOpen={(id) => setParam("id", id)}
          onMove={(id, to) =>
            update({ id: id as Id<"leads">, status: to as LeadStatusKey })
              .then(() => toast(`Moved to ${LEAD_STATUS[to as LeadStatusKey].label}`))
              .catch((e) => toast(errorMessage(e), "error"))
          }
        />
      ) : (
        <Panel padded={false}>
          <div className="flex flex-wrap items-center gap-3 border-b border-a-line p-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, business, phone" className="w-full max-w-xs" />
            <Segmented
              label="Status"
              value={status ?? "all"}
              onChange={(v) => setParam("status", v === "all" ? null : v)}
              options={[{ value: "all", label: "All", count: counts?.all }, ...LEAD_ORDER.map((s) => ({ value: s, label: LEAD_STATUS[s].label, count: counts?.[s] }))]}
            />
          </div>
          {selected.size ? (
            <BulkBar
              count={selected.size}
              onClear={() => setSelected(new Set())}
              onMove={async (to) => {
                await updateMany({ ids: [...selected] as Id<"leads">[], status: to }).catch((e) => toast(errorMessage(e), "error"));
                toast(`Moved ${selected.size} to ${LEAD_STATUS[to].label}`);
                setSelected(new Set());
              }}
              onDelete={async () => {
                if (!(await confirm({ title: `Delete ${selected.size} lead${selected.size > 1 ? "s" : ""}?`, body: "Notes are deleted too. This can't be undone.", confirmLabel: "Delete", tone: "danger" }))) return;
                await remove({ ids: [...selected] as Id<"leads">[] }).catch((e) => toast(errorMessage(e), "error"));
                toast("Deleted");
                setSelected(new Set());
              }}
            />
          ) : null}
          <LeadsTable status={status} search={search} selected={selected} setSelected={setSelected} staffMap={staffMap} onOpen={(id) => setParam("id", id)} />
        </Panel>
      )}

      <LeadSheet id={openId} onClose={() => setParam("id", null)} />
      <NewLeadModal open={creating} onClose={() => setParam("new", null)} onCreated={(id) => setParam("id", id)} />
    </div>
  );
}

function BulkBar({ count, onClear, onMove, onDelete }: { count: number; onClear: () => void; onMove: (s: LeadStatusKey) => void; onDelete: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-a-line bg-a-accent-soft px-4 py-2 text-[0.84rem]">
      <span className="font-semibold">{count} selected</span>
      <Select aria-label="Move selected to" className="!h-8 w-48" value="" onChange={(e) => e.target.value && onMove(e.target.value as LeadStatusKey)}>
        <option value="">Move to…</option>
        {LEAD_ORDER.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS[s].label}
          </option>
        ))}
      </Select>
      <Button size="sm" variant="ghost" className="text-a-danger" icon={<Trash className="size-4" aria-hidden />} onClick={onDelete}>
        Delete
      </Button>
      <button type="button" className="ms-auto cursor-pointer text-[0.8rem] font-semibold text-a-muted hover:text-a-text" onClick={onClear}>
        Clear selection
      </button>
    </div>
  );
}

function LeadsTable({
  status,
  search,
  selected,
  setSelected,
  staffMap,
  onOpen,
}: {
  status: LeadStatusKey | null;
  search: string;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  staffMap: Map<string, string>;
  onOpen: (id: string) => void;
}) {
  const now = useNow();
  const { results, status: pageStatus, loadMore } = useAdminPaginatedQuery(
    api.leads.list,
    { status: status ?? undefined, search: search || undefined },
    { initialNumItems: 25 },
  );
  if (pageStatus === "LoadingFirstPage") return <LoadingRows />;
  if (!results.length) {
    return (
      <EmptyState
        icon={<Tray className="size-6" aria-hidden />}
        title={search || status ? "No leads match" : "No leads yet"}
        body={search || status ? "Try another search or status." : "Briefs sent from the website's contact page land here."}
      />
    );
  }
  const allChecked = results.every((r) => selected.has(r._id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(results.map((r) => r._id)));
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[56rem] text-[0.84rem]">
        <thead className="border-b border-a-line bg-a-raised text-[0.75rem] text-a-muted">
          <tr>
            <th scope="col" className="w-10 px-3 py-2.5">
              <input type="checkbox" aria-label="Select all on this page" checked={allChecked} onChange={toggleAll} className="size-4 accent-[var(--color-signal)]" />
            </th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Business</th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Wants</th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Budget</th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Status</th>
            <th scope="col" className="px-3 py-2.5 text-start font-semibold">Owner</th>
            <th scope="col" className="px-3 py-2.5 text-end font-semibold">Received</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-a-line">
          {results.map((l) => (
            <tr key={l._id} className={cn("cursor-pointer transition-colors hover:bg-a-hover", selected.has(l._id) && "bg-a-accent-soft")} onClick={() => onOpen(l._id)}>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" aria-label={`Select ${l.company}`} checked={selected.has(l._id)} onChange={() => toggle(l._id)} className="size-4 accent-[var(--color-signal)]" />
              </td>
              <td className="px-3 py-2.5">
                <button type="button" className="cursor-pointer text-start font-semibold hover:underline" onClick={() => onOpen(l._id)}>
                  {l.company}
                </button>
                <span className="block text-[0.76rem] text-a-muted">
                  {l.name} · <span dir="ltr">{l.phone}</span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-a-muted">{l.services.map((s) => SERVICE_LABEL[s] ?? s).join(", ")}</td>
              <td className="px-3 py-2.5 text-a-muted">{l.budget ?? "—"}</td>
              <td className="px-3 py-2.5">
                <Badge tone={LEAD_STATUS[l.status].tone} dot>
                  {LEAD_STATUS[l.status].label}
                </Badge>
                {l.followUpAt ? <span className={cn("ms-2 text-[0.72rem]", l.followUpAt < now ? "text-a-danger" : "text-a-muted")}>↻ {relativeTime(l.followUpAt)}</span> : null}
              </td>
              <td className="px-3 py-2.5">
                {l.assigneeId && staffMap.get(l.assigneeId) ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={staffMap.get(l.assigneeId)!} size={22} />
                    <span className="text-a-muted">{staffMap.get(l.assigneeId)}</span>
                  </span>
                ) : (
                  <span className="text-a-faint">Unassigned</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-end text-a-muted" title={dateTime(l._creationTime)}>
                {relativeTime(l._creationTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pageStatus === "CanLoadMore" || pageStatus === "LoadingMore" ? (
        <div className="flex justify-center border-t border-a-line p-3">
          <Button size="sm" onClick={() => loadMore(25)} loading={pageStatus === "LoadingMore"}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LeadsBoard({ staffMap, onOpen, onMove }: { staffMap: Map<string, string>; onOpen: (id: string) => void; onMove: (id: string, to: string) => void }) {
  const board = useAdminQuery(api.leads.board, {});
  if (!board) return <LoadingRows />;
  return (
    <Kanban
      columns={LEAD_ORDER.map((s) => ({ key: s, label: LEAD_STATUS[s].label, tone: LEAD_STATUS[s].tone, items: board[s] }))}
      onMove={onMove}
      onOpen={(item) => onOpen(item._id)}
      renderCard={(l: Lead) => (
        <div>
          <p className="truncate text-[0.85rem] font-semibold">{l.company}</p>
          <p className="truncate text-[0.76rem] text-a-muted">{l.name}</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-[0.72rem] text-a-faint">
            <span className="truncate">{l.services.map((s) => SERVICE_LABEL[s] ?? s).join(" · ")}</span>
            {l.assigneeId && staffMap.get(l.assigneeId) ? <Avatar name={staffMap.get(l.assigneeId)!} size={18} /> : null}
          </div>
          {l.value ? <p className="mt-1.5 font-mono text-[0.72rem] text-a-muted">{egp(l.value)}</p> : null}
        </div>
      )}
    />
  );
}

/* --------------------------- Detail sheet --------------------------- */

function LeadSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const data = useAdminQuery(api.leads.get, id ? { id: id as Id<"leads"> } : "skip");
  const staff = useAdminQuery(api.users.staff, {});
  const update = useAdminMutation(api.leads.update);
  const remove = useAdminMutation(api.leads.remove);
  const { toast, confirm } = useFeedback();
  const lead = data?.lead;

  const patch = (p: Parameters<typeof update>[0] extends infer A ? Omit<A, "id"> : never) =>
    lead ? update({ id: lead._id, ...p }).catch((e) => toast(errorMessage(e), "error")) : undefined;

  return (
    <Sheet
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      title={lead?.company ?? "Lead"}
      headerExtra={lead ? <p className="mt-0.5 text-[0.8rem] text-a-muted">{lead.name} · received {relativeTime(lead._creationTime)}</p> : null}
      footer={
        lead ? (
          <>
            <Button
              variant="ghost"
              className="text-a-danger"
              icon={<Trash className="size-4" aria-hidden />}
              onClick={async () => {
                if (!(await confirm({ title: "Delete this lead?", body: "Its notes are deleted too.", confirmLabel: "Delete", tone: "danger" }))) return;
                await remove({ ids: [lead._id] });
                toast("Lead deleted");
                onClose();
              }}
            >
              Delete
            </Button>
            <span className="text-[0.75rem] text-a-faint">{lead.origin === "manual" ? "Added manually" : `From the website (${lead.locale === "ar" ? "Arabic" : "English"})`}</span>
          </>
        ) : null
      }
    >
      {data === undefined ? (
        <LoadingRows rows={8} />
      ) : !lead ? (
        <EmptyState title="This lead was deleted" />
      ) : (
        <div className="space-y-6 p-5">
          <div className="flex flex-wrap gap-2">
            <a href={whatsappHref(lead.phone, `Hi ${lead.name.split(" ")[0]}, this is SCALE ADV about your brief for ${lead.company}.`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-[#25d366] px-3.5 text-[0.84rem] font-semibold text-[#0b3d1f] hover:opacity-90">
              <WhatsappLogo className="size-4" weight="fill" aria-hidden /> WhatsApp
            </a>
            <a href={`tel:${lead.phone}`} className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-a-line-strong px-3.5 text-[0.84rem] font-semibold hover:bg-a-hover">
              <Phone className="size-4" aria-hidden /> Call
            </a>
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-a-line-strong px-3.5 text-[0.84rem] font-semibold hover:bg-a-hover">
                <EnvelopeSimple className="size-4" aria-hidden /> Email
              </a>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="lead-status">
              <Select id="lead-status" value={lead.status} onChange={(e) => patch({ status: e.target.value as LeadStatusKey })}>
                {LEAD_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Owner" htmlFor="lead-owner">
              <Select id="lead-owner" value={lead.assigneeId ?? ""} onChange={(e) => patch({ assigneeId: (e.target.value || null) as Id<"users"> | null })}>
                <option value="">Unassigned</option>
                {(staff ?? []).map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Follow up on" htmlFor="lead-follow">
              <Input
                id="lead-follow"
                type="date"
                value={lead.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0, 10) : ""}
                onChange={(e) => patch({ followUpAt: e.target.value ? new Date(`${e.target.value}T10:00:00`).getTime() : null })}
              />
            </Field>
            <Field label="Deal value (EGP / month)" htmlFor="lead-value">
              <Input
                id="lead-value"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={lead.value ?? ""}
                key={`${lead._id}-${lead.value}`}
                onBlur={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  if (v !== (lead.value ?? null)) patch({ value: v });
                }}
                className="tabular"
              />
            </Field>
          </div>
          <Field label="Tags">
            <TagInput value={lead.tags} onChange={(tags) => patch({ tags })} placeholder="Add tag, e.g. ramadan, retainer" />
          </Field>

          <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2.5 rounded-[6px] border border-a-line p-4 text-[0.84rem]">
            <Detail label="Contact">{lead.name}</Detail>
            <Detail label="Phone"><span dir="ltr">{lead.phone}</span></Detail>
            {lead.email ? <Detail label="Email">{lead.email}</Detail> : null}
            {lead.city ? <Detail label="City">{lead.city}</Detail> : null}
            {lead.link ? (
              <Detail label="Page">
                <a href={lead.link} target="_blank" rel="noopener noreferrer" className="break-all text-signal-600 hover:underline dark:text-signal">
                  {lead.link.replace(/^https?:\/\//, "")}
                </a>
              </Detail>
            ) : null}
            <Detail label="Wants">{lead.services.map((s) => SERVICE_LABEL[s] ?? s).join(", ")}</Detail>
            {lead.budget ? <Detail label="Ad budget">{lead.budget}</Detail> : null}
            {lead.industry ? <Detail label="Business">{lead.industry}</Detail> : null}
            {lead.source ? <Detail label="Heard via">{lead.source}</Detail> : null}
            <Detail label="Received">{dateTime(lead._creationTime)}</Detail>
          </dl>

          {lead.message ? (
            <div>
              <p className="mb-2 text-[0.8rem] font-semibold">Their message</p>
              <blockquote className="whitespace-pre-wrap rounded-[6px] border-s-2 border-signal bg-a-raised p-4 text-[0.88rem] leading-relaxed" dir="auto">
                {lead.message}
              </blockquote>
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-[0.8rem] font-semibold">Notes & history</p>
            <Timeline entity="lead" entityId={lead._id} notes={data.notes} />
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-a-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

/* ------------------------------ Create ------------------------------ */

function NewLeadModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const create = useAdminMutation(api.leads.create);
  const { toast } = useFeedback();
  const blank = { name: "", company: "", phone: "", email: "", city: "", link: "", budget: "", industry: "", message: "", source: "", services: [] as string[] };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const opt = (s: string) => (s.trim() ? s.trim() : undefined);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Add a lead"
      description="For briefs that came in by phone, WhatsApp or in person."
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const id = await create({
                  name: form.name,
                  company: form.company,
                  phone: form.phone,
                  email: opt(form.email),
                  city: opt(form.city),
                  link: opt(form.link),
                  services: form.services.length ? form.services : ["full"],
                  budget: opt(form.budget),
                  industry: opt(form.industry),
                  message: opt(form.message),
                  source: opt(form.source),
                });
                toast("Lead added");
                setForm(blank);
                onClose();
                onCreated(id);
              } catch (e) {
                toast(errorMessage(e), "error");
              } finally {
                setBusy(false);
              }
            }}
          >
            Add lead
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name" htmlFor="nl-name" required>
          <Input id="nl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Business" htmlFor="nl-company" required>
          <Input id="nl-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </Field>
        <Field label="Phone / WhatsApp" htmlFor="nl-phone" required>
          <Input id="nl-phone" type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email" htmlFor="nl-email">
          <Input id="nl-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="City" htmlFor="nl-city">
          <Input id="nl-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </Field>
        <Field label="Page link" htmlFor="nl-link">
          <Input id="nl-link" dir="ltr" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        </Field>
        <Field label="Monthly budget" htmlFor="nl-budget">
          <Input id="nl-budget" value={form.budget} placeholder="e.g. 25,000 EGP" onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        </Field>
        <Field label="Source" htmlFor="nl-source">
          <Input id="nl-source" value={form.source} placeholder="e.g. Referral from Mohsen" onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </Field>
        <Field label="Wants" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {Object.entries(SERVICE_LABEL).map(([key, label]) => {
              const on = form.services.includes(key);
              return (
                <label key={key} className={cn("inline-flex h-8 cursor-pointer items-center gap-2 rounded-[4px] border px-3 text-[0.8rem]", on ? "border-signal bg-a-accent-soft" : "border-a-line-strong")}>
                  <input type="checkbox" className="size-3.5 accent-[var(--color-signal)]" checked={on} onChange={() => setForm({ ...form, services: on ? form.services.filter((s) => s !== key) : [...form.services, key] })} />
                  {label}
                </label>
              );
            })}
          </div>
        </Field>
        <Field label="Notes from the conversation" htmlFor="nl-message" className="sm:col-span-2">
          <Textarea id="nl-message" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

