"use client";

import { api } from "@convex/_generated/api";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { useState } from "react";
import { dateTime, relativeTime } from "../format";
import { useAdminPaginatedQuery } from "../session";
import { Avatar, Button, EmptyState, LoadingRows, PageHeader, Panel, Select } from "../ui";

const ENTITIES = [
  ["", "Everything"],
  ["lead", "Leads"],
  ["application", "Applications"],
  ["job", "Jobs"],
  ["reel", "Reels"],
  ["client", "Clients"],
  ["case study", "Case studies"],
  ["service", "Services"],
  ["FAQ", "FAQs"],
  ["testimonial", "Testimonials"],
  ["team member", "Team on site"],
  ["media", "Media"],
  ["settings", "Settings"],
  ["user", "Team access"],
] as const;

export function ActivityPage() {
  const [entity, setEntity] = useState("");
  const { results, status, loadMore } = useAdminPaginatedQuery(api.activity.list, { entity: entity || undefined }, { initialNumItems: 50 });

  return (
    <div>
      <PageHeader
        title="Activity log"
        description="Who changed what, and when. Website submissions are logged as “Website”."
        actions={
          <Select aria-label="Filter by area" className="w-52" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        }
      />
      <Panel padded={false}>
        {status === "LoadingFirstPage" ? (
          <LoadingRows rows={10} />
        ) : results.length === 0 ? (
          <EmptyState icon={<ClockCounterClockwise className="size-6" aria-hidden />} title="Nothing logged yet" />
        ) : (
          <ol className="divide-y divide-a-line">
            {results.map((a) => (
              <li key={a._id} className="flex items-start gap-3 px-4 py-3 text-[0.85rem]">
                <Avatar name={a.actorName} size={26} />
                <p className="min-w-0 flex-1">
                  <span className="font-semibold">{a.actorName}</span> <span className="text-a-muted">{a.action}</span> {a.entity}{" "}
                  <span className="text-a-muted">“{a.label}”</span>
                </p>
                <time dateTime={new Date(a._creationTime).toISOString()} title={dateTime(a._creationTime)} className="shrink-0 text-[0.76rem] text-a-faint">
                  {relativeTime(a._creationTime)}
                </time>
              </li>
            ))}
          </ol>
        )}
        {status === "CanLoadMore" || status === "LoadingMore" ? (
          <div className="flex justify-center border-t border-a-line p-3">
            <Button size="sm" onClick={() => loadMore(50)} loading={status === "LoadingMore"}>
              Load older
            </Button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
