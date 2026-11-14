"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/format";
import { shortDate } from "./format";

type Series = { key: string; label: string; color: string; values: number[] };

/**
 * Daily trend for up to two series. One y-axis, recessive grid, 2px lines,
 * direct labels at the line ends, crosshair tooltip on hover/focus, and a
 * table view for screen readers and anyone who prefers numbers.
 */
export function TrendChart({ days, series, height = 220 }: { days: number[]; series: Series[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const titleId = useId();
  const W = 720;
  const H = height;
  const pad = { top: 16, right: 92, bottom: 26, left: 32 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(4, ...series.flatMap((s) => s.values));
  const niceMax = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.left + (days.length <= 1 ? 0 : (i / (days.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / niceMax) * innerH;
  const ticks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];
  const totals = series.map((s) => s.values.reduce((a, b) => a + b, 0));

  const paths = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        d: s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(""),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, niceMax, days.length],
  );

  // Direct labels at the right edge, nudged apart if they collide.
  const endLabels = useMemo(() => {
    const items = series.map((s) => ({ key: s.key, label: s.label, color: s.color, y: y(s.values[s.values.length - 1] ?? 0) }));
    items.sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 14) items[i].y = items[i - 1].y + 14;
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, niceMax]);

  const summary = series.map((s, i) => `${s.label}: ${totals[i]} in the last ${days.length} days`).join(". ");

  return (
    <figure aria-labelledby={titleId}>
      <figcaption id={titleId} className="sr-only">
        {summary}
      </figcaption>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {series.map((s, i) => (
          <span key={s.key} className="inline-flex items-center gap-2 text-[0.8rem] text-a-muted">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
            <span className="font-mono tabular text-a-text">{totals[i]}</span>
          </span>
        ))}
        <button type="button" onClick={() => setTable((t) => !t)} className="ms-auto cursor-pointer text-[0.75rem] font-semibold text-a-muted underline-offset-2 hover:text-a-text hover:underline">
          {table ? "Show chart" : "Show as table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-64 overflow-auto rounded-[4px] border border-a-line scrollbar-thin">
          <table className="w-full text-[0.8rem]">
            <thead className="sticky top-0 bg-a-raised text-a-muted">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-semibold">Day</th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="px-3 py-2 text-end font-semibold">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days
                .map((d, i) => ({ d, i }))
                .reverse()
                .map(({ d, i }) => (
                  <tr key={d} className="border-t border-a-line">
                    <td className="px-3 py-1.5">{shortDate(d)}</td>
                    {series.map((s) => (
                      <td key={s.key} className="px-3 py-1.5 text-end font-mono tabular">{s.values[i]}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={summary}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={pad.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--a-line)" strokeWidth={1} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--a-faint)] font-mono text-[10px]">
                  {t}
                </text>
              </g>
            ))}
            {days.map((d, i) =>
              (i % 7 === 0 && days.length - 1 - i >= 4) || i === days.length - 1 ? (
                <text key={d} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} className="fill-[var(--a-faint)] text-[10px]">
                  {shortDate(d)}
                </text>
              ) : null,
            )}
            {paths.map((p) => (
              <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {endLabels.map((l) => (
              <text key={l.key} x={pad.left + innerW + 8} y={l.y} dy="0.32em" className="fill-[var(--a-muted)] text-[11px] font-semibold">
                {l.label}
              </text>
            ))}
            {hover !== null ? (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH} stroke="var(--a-line-strong)" strokeWidth={1} />
                {series.map((s) => (
                  <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill={s.color} stroke="var(--a-surface)" strokeWidth={2} />
                ))}
              </g>
            ) : null}
            {/* Hit areas wider than the marks */}
            {days.map((d, i) => (
              <rect
                key={d}
                x={x(i) - innerW / days.length / 2}
                y={pad.top}
                width={innerW / Math.max(1, days.length - 1)}
                height={innerH}
                fill="transparent"
                tabIndex={i === days.length - 1 ? 0 : -1}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? i) - 1));
                  if (e.key === "ArrowRight") setHover((h) => Math.min(days.length - 1, (h ?? i) + 1));
                }}
                aria-label={`${shortDate(d)}: ${series.map((s) => `${s.label} ${s.values[i]}`).join(", ")}`}
              />
            ))}
          </svg>
          {hover !== null ? (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-[5px] border border-a-line bg-a-surface px-3 py-2 text-[0.78rem] shadow-lg"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${x(hover) > W * 0.6 ? "-110%" : "10%"})` }}
            >
              <p className="font-semibold text-a-text">{shortDate(days[hover])}</p>
              {series.map((s) => (
                <p key={s.key} className="mt-1 flex items-center justify-between gap-4 text-a-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
                    {s.label}
                  </span>
                  <span className="font-mono tabular text-a-text">{s.values[hover]}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </figure>
  );
}

/** Horizontal bars with the label and value as text; colour only reinforces. */
export function BarList({
  items,
  color = "var(--viz-leads)",
  empty = "No data yet.",
  valueSuffix,
}: {
  items: { key: string; label: string; value: number; href?: string; muted?: boolean }[];
  color?: string;
  empty?: string;
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length || items.every((i) => i.value === 0)) return <p className="py-6 text-center text-[0.82rem] text-a-muted">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[0.8rem]">
              <span className="truncate text-a-text">{item.label}</span>
              <span className="shrink-0 font-mono tabular text-a-muted">
                {item.value}
                {valueSuffix ? ` ${valueSuffix}` : ""}
              </span>
            </div>
            <div className="h-2 w-full rounded-[2px] bg-a-hover">
              <div
                className="h-full rounded-e-[4px]"
                style={{ width: `${Math.max(item.value ? 2 : 0, (item.value / max) * 100)}%`, background: item.muted ? "var(--viz-neutral)" : color }}
              />
            </div>
          </>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <a href={item.href} className={cn("block rounded-[3px] outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-signal")}>
                {inner}
              </a>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Buckets timestamps into local calendar days. */
export function bucketByDay(times: number[], days: number, now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const first = start.getTime() - (days - 1) * 86_400_000;
  const keys = Array.from({ length: days }, (_, i) => first + i * 86_400_000);
  const counts = new Array(days).fill(0);
  for (const t of times) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const idx = Math.round((d.getTime() - first) / 86_400_000);
    if (idx >= 0 && idx < days) counts[idx]++;
  }
  return { keys, counts };
}
