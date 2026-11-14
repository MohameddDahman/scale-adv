import { cn } from "@/lib/format";

/**
 * Typeset version of the SCALE ADV logo: heavy wide italic "SCALE" with the
 * orange ADV tab. Always left-to-right, even on Arabic pages.
 */
export function Wordmark({ className, tagline }: { className?: string; tagline?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-start leading-none", className)} dir="ltr">
      <span className="inline-flex items-start" aria-hidden="true">
        <span
          className="font-[family-name:var(--font-mona)] text-[1em] font-black italic tracking-[-0.045em] text-chalk"
          style={{ fontVariationSettings: '"wdth" 125' }}
        >
          SCALE
        </span>
        <span
          className="ms-[0.08em] mt-[0.02em] -skew-x-[14deg] bg-signal px-[0.32em] pb-[0.12em] pt-[0.16em] font-[family-name:var(--font-mona)] text-[0.32em] font-black italic tracking-[0.02em] text-ink-950"
          style={{ fontVariationSettings: '"wdth" 125' }}
        >
          ADV
        </span>
      </span>
      {tagline ? (
        <span className="mt-[0.35em] font-mono text-[0.2em] font-medium uppercase tracking-[0.42em] text-smoke" aria-hidden="true">
          {tagline}
        </span>
      ) : null}
      <span className="sr-only">SCALE ADV</span>
    </span>
  );
}
