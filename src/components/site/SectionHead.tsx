import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/** Section opener: the ADV tab names the section, the heading carries the voice. */
export function SectionHead({
  tab,
  title,
  body,
  aside,
  className,
  id,
  as: Heading = "h2",
}: {
  tab: string;
  title: string;
  body?: string;
  aside?: ReactNode;
  className?: string;
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-12 md:items-end", className)}>
      <div className="md:col-span-8">
        <span className="adv-tab">
          <span>{tab}</span>
        </span>
        <Heading
          id={id}
          className={cn(
            "heading mt-5 text-balance text-chalk",
            Heading === "h1" ? "text-[clamp(2.6rem,7vw,6.25rem)]" : "text-[clamp(2.2rem,5.2vw,4.75rem)]",
          )}
        >
          {title}
        </Heading>
      </div>
      {(body || aside) && (
        <div className="md:col-span-4 md:pb-2">
          {body ? <p className="max-w-[38ch] text-[1.02rem] leading-relaxed text-smoke">{body}</p> : null}
          {aside}
        </div>
      )}
    </div>
  );
}
