"use client";

import { useMemo, useState } from "react";
import type { PublicJobSummary } from "@convex/lib/shape";
import { cn } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n";
import { JobRow } from "./JobRow";

export function JobsBoard({ jobs, locale, d }: { jobs: PublicJobSummary[]; locale: Locale; d: Dictionary }) {
  const [type, setType] = useState("all");
  const types = useMemo(() => [...new Set(jobs.map((j) => j.type))], [jobs]);
  const visible = type === "all" ? jobs : jobs.filter((j) => j.type === type);

  return (
    <div>
      {types.length > 1 ? (
        <div role="group" aria-label="Filter" className="mb-6 flex flex-wrap gap-2">
          {["all", ...types].map((t) => {
            const count = t === "all" ? jobs.length : jobs.filter((j) => j.type === t).length;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={cn(
                  "min-h-11 border px-4 text-[0.92rem] font-medium transition-colors",
                  type === t ? "border-chalk bg-chalk text-ink-950" : "border-chalk/20 text-chalk/80 hover:border-chalk/50",
                )}
              >
                {t === "all" ? d.careersPage.filterAll : (d.careersPage.types[t] ?? t)}
                <span className="ms-2 font-mono text-[0.75rem] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {visible.length ? (
        <ul className="divide-y divide-chalk/10 border-y border-chalk/10">
          {visible.map((job) => (
            <li key={job.id}>
              <JobRow job={job} locale={locale} d={d} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-y border-chalk/10 py-8 text-smoke">{d.careersPage.noMatch}</p>
      )}
    </div>
  );
}
