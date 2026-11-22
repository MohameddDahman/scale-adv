"use client";

import { X } from "@phosphor-icons/react";
import { Dialog } from "radix-ui";
import { createContext, useContext, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type { PublicApplyJob } from "@convex/lib/shape";
import { cn } from "@/lib/format";
import { tx, type Dictionary, type Locale } from "@/lib/i18n";
import { ApplicationForm } from "./ApplicationForm";
import { KeyboardInset } from "./KeyboardInset";

type ApplyApi = { open: () => void; careersHref: string };
const ApplyContext = createContext<ApplyApi | null>(null);

/** "Open application" in the role picker. */
const OPEN = "";

/**
 * Hosts the "Apply for a job" pop-up once per page: pick a role (or apply
 * openly), then the application form with that role's own questions.
 */
export function ApplyProvider({
  locale,
  jobs,
  acceptingOpen,
  dialog,
  t,
  e,
  careersHref,
  children,
}: {
  locale: Locale;
  jobs: PublicApplyJob[];
  acceptingOpen: boolean;
  dialog: Dictionary["applyDialog"];
  t: Dictionary["apply"];
  e: Dictionary["errors"];
  careersHref: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [choice, setChoice] = useState<string>(() => jobs[0]?.slug ?? OPEN);
  const api = useMemo<ApplyApi>(
    () => ({
      open: () => {
        setSent(false);
        setOpen(true);
      },
      careersHref,
    }),
    [careersHref],
  );
  const job = jobs.find((j) => j.slug === choice) ?? null;
  const options = [...jobs.map((j) => ({ value: j.slug, label: tx(j.title, locale) })), ...(acceptingOpen ? [{ value: OPEN, label: dialog.open }] : [])];

  return (
    <ApplyContext.Provider value={api}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="brief-overlay" />
          <Dialog.Content
            className="brief-dialog apply-dialog"
            // Focus the sheet itself rather than its first control: no focus ring on Close, no keyboard popping up.
            onOpenAutoFocus={(ev) => {
              ev.preventDefault();
              (ev.target as HTMLElement | null)?.focus({ preventScroll: true });
            }}
          >
            <Dialog.Title className="sr-only">{dialog.title}</Dialog.Title>
            <Dialog.Description className="sr-only">{dialog.sub}</Dialog.Description>
            <KeyboardInset />
            <div className="bf bf--dialog">
              <div className="bf-head">
                <div className="min-w-0">
                  <p className="bf-title" aria-hidden>
                    {dialog.title}
                  </p>
                  <p className="bf-sub">{dialog.sub}</p>
                </div>
                <Dialog.Close asChild>
                  <button type="button" className="bf-close" aria-label={dialog.close}>
                    <X className="size-5" aria-hidden />
                  </button>
                </Dialog.Close>
              </div>

              {options.length === 0 ? (
                <p className="mt-6 text-[0.98rem] leading-relaxed text-smoke">{dialog.none}</p>
              ) : (
                <>
                  {/* Once sent, only the thank-you stays on screen. */}
                  <fieldset className="mt-6" hidden={sent}>
                    <legend className="bf-q">{dialog.role}</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {options.map((o) => (
                        <label key={o.value || "open"} className={cn("chip-toggle apply-role", choice === o.value && "is-on")}>
                          <input
                            type="radio"
                            name="apply-role"
                            className="sr-only"
                            checked={choice === o.value}
                            onChange={() => setChoice(o.value)}
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className={sent ? "mt-6" : "mt-9"}>
                    {/* A new form for each role, since every role asks its own questions. */}
                    <ApplicationForm
                      key={choice || "open"}
                      locale={locale}
                      t={t}
                      e={e}
                      job={job}
                      careersHref={careersHref}
                      onClose={() => setOpen(false)}
                      onSent={() => setSent(true)}
                    />
                  </div>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ApplyContext.Provider>
  );
}

/**
 * "Apply for a job" buttons: they open the pop-up. With a modifier key or
 * before JavaScript loads they're a plain link to the careers page.
 */
export function ApplyLink({ className, children }: { className?: string; children: ReactNode }) {
  const apply = useContext(ApplyContext);
  return (
    <a
      href={apply?.careersHref ?? "/careers"}
      className={className}
      onClick={(ev: MouseEvent<HTMLAnchorElement>) => {
        if (!apply || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        apply.open();
      }}
    >
      {children}
    </a>
  );
}
