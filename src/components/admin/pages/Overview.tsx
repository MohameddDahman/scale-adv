"use client";

import { api } from "@convex/_generated/api";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarCheck, Sparkle, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { BarList, bucketByDay, TrendChart } from "../charts";
import { APP_STAGE, egp, LEAD_ORDER, LEAD_STATUS, relativeTime, SERVICE_LABEL, STAGE_ORDER } from "../format";
import { errorMessage, useAdminMutation, useAdminQuery, useSession } from "../session";
import { Badge, Button, EmptyState, PageHeader, Panel, Skeleton, useFeedback } from "../ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Overview() {
  const { me } = useSession();
  const data = useAdminQuery(api.dashboard.overview, {});
  const loadStarter = useAdminMutation(api.seed.loadStarter, { refresh: true });
  const { toast } = useFeedback();
  const [seeding, setSeeding] = useState(false);

  const trend = useMemo(() => {
    if (!data) return null;
    const now = data.now;
    const leads = data.leads ? bucketByDay(data.leads.times, 30, now) : null;
    const apps = data.careers ? bucketByDay(data.careers.times, 30, now) : null;
    const days = (leads ?? apps)?.keys ?? [];
    const series = [
      ...(leads ? [{ key: "leads", label: "Leads", color: "var(--viz-leads)", values: leads.counts }] : []),
      ...(apps ? [{ key: "apps", label: "Applications", color: "var(--viz-apps)", values: apps.counts }] : []),
    ];
    return { days, series };
  }, [data]);

  const periods = useMemo(() => {
    if (!data) return null;
    const now = data.now;
    const split = (times: number[]) => ({
      current: times.filter((t) => t > now - 30 * 86_400_000).length,
      previous: times.filter((t) => t <= now - 30 * 86_400_000).length,
    });
    return { leads: data.leads ? split(data.leads.times) : null, apps: data.careers ? split(data.careers.times) : null };
  }, [data]);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${me?.name.split(" ")[0] ?? ""}`}
        description="Here's what came in over the last 30 days."
        actions={
          <>
            <Link href="/en" target="_blank" className="inline-flex h-9 items-center rounded-[4px] border border-a-line-strong bg-a-surface px-3.5 text-[0.85rem] font-semibold hover:bg-a-hover">
              Open website
            </Link>
            {data?.leads ? (
              <Link href="/admin/leads?new=1" className="inline-flex h-9 items-center rounded-[4px] bg-signal px-3.5 text-[0.85rem] font-semibold text-ink-950 hover:bg-signal-300">
                Add a lead
              </Link>
            ) : null}
          </>
        }
      />

      {data?.content?.empty ? (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-[6px] border border-signal/40 bg-a-accent-soft p-4">
          <Sparkle className="size-6 text-signal" weight="fill" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">The website has no content in the database yet</p>
            <p className="text-[0.82rem] text-a-muted">Load the starter set — services, the 12 clients, sample roles and FAQs — then edit it.</p>
          </div>
          <Button
            variant="primary"
            loading={seeding}
            onClick={async () => {
              setSeeding(true);
              try {
                await loadStarter({});
                toast("Starter content loaded");
              } catch (e) {
                toast(errorMessage(e), "error");
              } finally {
                setSeeding(false);
              }
            }}
          >
            Load starter content
          </Button>
        </div>
      ) : null}

      {/* KPI tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data === undefined ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[7.5rem]" />)
        ) : (
          <>
            {periods?.leads ? (
              <Stat label="Leads · 30 days" value={periods.leads.current} delta={periods.leads.current - periods.leads.previous} href="/admin/leads" />
            ) : null}
            {data.leads ? (
              <Stat
                label="Open pipeline"
                value={(data.leads.byStatus.new ?? 0) + (data.leads.byStatus.contacted ?? 0) + (data.leads.byStatus.proposal ?? 0)}
                note={data.leads.wonValue ? `${egp(data.leads.wonValue)} won to date` : `${data.leads.byStatus.won ?? 0} won to date`}
                href="/admin/leads?view=board"
              />
            ) : null}
            {periods?.apps ? (
              <Stat label="Applications · 30 days" value={periods.apps.current} delta={periods.apps.current - periods.apps.previous} href="/admin/applications" />
            ) : null}
            {data.careers ? <Stat label="Open roles" value={data.careers.openRoles} note={`${data.careers.byStage.interview ?? 0} in interviews`} href="/admin/jobs" /> : null}
            {data.content ? (
              <Stat
                label="Reels on the site"
                value={data.content.reels}
                note={data.content.reelsMissingMedia ? `${data.content.reelsMissingMedia} still need a video` : "All have video"}
                warn={!!data.content.reelsMissingMedia}
                href="/admin/work"
              />
            ) : null}
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Inbound" description="New leads and applications per day">
          {trend && trend.series.length ? <TrendChart days={trend.days} series={trend.series} /> : <Skeleton className="h-56" />}
        </Panel>
        {data?.leads ? (
          <Panel title="Lead pipeline" description="Every lead by its current status" actions={<Link href="/admin/leads?view=board" className="text-[0.8rem] font-semibold text-a-muted hover:text-a-text">Open board</Link>}>
            <BarList
              items={LEAD_ORDER.map((s) => ({ key: s, label: LEAD_STATUS[s].label, value: data.leads!.byStatus[s] ?? 0, muted: s === "lost", href: `/admin/leads?status=${s}` }))}
              empty="No leads yet. They'll appear here when the contact form is used."
            />
          </Panel>
        ) : data?.careers ? (
          <Panel title="Hiring pipeline" description="Applications by stage">
            <BarList color="var(--viz-apps)" items={STAGE_ORDER.map((s) => ({ key: s, label: APP_STAGE[s].label, value: data.careers!.byStage[s] ?? 0, muted: s === "rejected" }))} />
          </Panel>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {data?.careers ? (
          <Panel title="Applications per open role">
            <BarList
              color="var(--viz-apps)"
              items={data.careers.perJob.map((j) => ({ key: j._id, label: j.title, value: j.count, href: `/admin/applications?job=${j._id}` }))}
              empty="No open roles. Open one from Jobs."
            />
          </Panel>
        ) : null}
        {data?.leads ? (
          <Panel title="What leads ask for" description="Last 60 days">
            <BarList
              items={Object.entries(data.leads.services)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => ({ key: k, label: SERVICE_LABEL[k] ?? k, value: v }))}
              empty="Nothing yet."
            />
          </Panel>
        ) : null}
        {data?.leads ? (
          <Panel title="Follow-ups due" description="Overdue and next 7 days">
            {data.leads.followUps.length === 0 ? (
              <EmptyState icon={<CalendarCheck className="size-6" aria-hidden />} title="You're all caught up" />
            ) : (
              <ul className="divide-y divide-a-line">
                {data.leads.followUps.map((f) => {
                  const overdue = f.followUpAt < data.now;
                  return (
                    <li key={f._id}>
                      <Link href={`/admin/leads?id=${f._id}`} className="flex items-center justify-between gap-3 py-2.5 hover:underline">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{f.company}</span>
                          <span className="block truncate text-[0.78rem] text-a-muted">{f.name}</span>
                        </span>
                        <Badge tone={overdue ? "danger" : "warn"}>{overdue ? "Overdue" : relativeTime(f.followUpAt, data.now)}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {data?.leads ? (
          <Feed title="Latest leads" href="/admin/leads" empty="No leads yet.">
            {data.leads.latest.map((l) => (
              <FeedRow key={l._id} href={`/admin/leads?id=${l._id}`} title={l.company} subtitle={l.name} meta={relativeTime(l.createdAt, data.now)} badge={<Badge tone={LEAD_STATUS[l.status].tone}>{LEAD_STATUS[l.status].label}</Badge>} />
            ))}
          </Feed>
        ) : null}
        {data?.careers ? (
          <Feed title="Latest applications" href="/admin/applications" empty="No applications yet.">
            {data.careers.latest.map((a) => (
              <FeedRow key={a._id} href={`/admin/applications/${a._id}`} title={a.name} subtitle={a.jobTitle} meta={relativeTime(a.createdAt, data.now)} badge={<Badge tone={APP_STAGE[a.stage].tone}>{APP_STAGE[a.stage].label}</Badge>} />
            ))}
          </Feed>
        ) : null}
        {data?.activity ? (
          <Feed title="Recent activity" href="/admin/activity" empty="Nothing has happened yet.">
            {data.activity.map((a) => (
              <li key={a._id} className="py-2.5 text-[0.82rem]">
                <span className="font-semibold">{a.actorName}</span> <span className="text-a-muted">{a.action}</span> {a.entity}{" "}
                <span className="text-a-muted">“{a.label}”</span>
                <span className="block text-[0.72rem] text-a-faint">{relativeTime(a._creationTime, data.now)}</span>
              </li>
            ))}
          </Feed>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, delta, note, href, warn }: { label: string; value: number; delta?: number; note?: string; href: string; warn?: boolean }) {
  return (
    <Link href={href} className="group rounded-[6px] border border-a-line bg-a-surface p-4 transition-colors hover:border-a-line-strong">
      <p className="text-[0.78rem] font-semibold text-a-muted">{label}</p>
      <p className="a-heading mt-2 text-[2.2rem] leading-none tabular">{value}</p>
      <p className={cn("mt-3 flex items-center gap-1 text-[0.76rem]", warn ? "text-a-warn" : "text-a-muted")}>
        {delta !== undefined ? (
          <>
            {delta > 0 ? <ArrowUpRight className="size-3.5 text-a-ok" aria-hidden /> : delta < 0 ? <ArrowDownRight className="size-3.5 text-a-danger" aria-hidden /> : null}
            <span>
              {delta > 0 ? `+${delta}` : delta} vs previous 30 days
            </span>
          </>
        ) : warn ? (
          <>
            <WarningCircle className="size-3.5" aria-hidden /> {note}
          </>
        ) : (
          note
        )}
      </p>
    </Link>
  );
}

function Feed({ title, href, children, empty }: { title: string; href: string; children: ReactNode; empty: string }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <Panel
      title={title}
      actions={
        <Link href={href} className="inline-flex items-center gap-1 text-[0.8rem] font-semibold text-a-muted hover:text-a-text">
          All <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      }
    >
      {items.filter(Boolean).length === 0 ? <p className="py-4 text-center text-[0.82rem] text-a-muted">{empty}</p> : <ul className="-my-2.5 divide-y divide-a-line">{children}</ul>}
    </Panel>
  );
}

function FeedRow({ href, title, subtitle, meta, badge }: { href: string; title: string; subtitle: string; meta: string; badge: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 py-2.5 hover:underline">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{title}</span>
          <span className="block truncate text-[0.78rem] text-a-muted">
            {subtitle} · {meta}
          </span>
        </span>
        {badge}
      </Link>
    </li>
  );
}
