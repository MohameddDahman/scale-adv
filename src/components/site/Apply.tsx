"use client";

import { X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { createContext, useContext, useId, useMemo, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import type { PublicApplyJob } from "@convex/lib/shape";
import { cn } from "@/lib/format";
import { tx, type Dictionary, type Locale } from "@/lib/i18n";
import { ApplicationForm } from "./ApplicationForm";
import { KeyboardInset } from "./KeyboardInset";

type ApplyApi = { open: () => void; applyHref: string };
const ApplyContext = createContext<ApplyApi | null>(null);

/** "Open application" in the role picker. */
const OPEN = "";

type PanelProps = {
  locale: Locale;
  jobs: PublicApplyJob[];
  acceptingOpen: boolean;
  dialog: Dictionary["applyDialog"];
  t: Dictionary["apply"];
  e: Dictionary["errors"];
  careersHref: string;
};

const noSubscribe = () => () => {};

/**
 * Pick a role (or apply openly), then the application form with that role's
 * own questions. Used in the pop-up and on the /apply page; on the page a
 * link can pick the role for them: /apply?role=video-editor.
 */
export function ApplyPanel({
  locale,
  jobs,
  acceptingOpen,
  dialog,
  t,
  e,
  careersHref,
  onClose,
  roleFromLink,
}: PanelProps & { onClose?: () => void; roleFromLink?: boolean }) {
  const name = useId();
  // Read after hydration, so the page itself can stay static.
  const linked = useSyncExternalStore(
    noSubscribe,
    () => (roleFromLink ? new URLSearchParams(window.location.search).get("role") : null),
    () => null,
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const options = [...jobs.map((j) => ({ value: j.slug, label: tx(j.title, locale) })), ...(acceptingOpen ? [{ value: OPEN, label: dialog.open }] : [])];
  if (options.length === 0) return <p className="mt-6 text-[0.98rem] leading-relaxed text-smoke">{dialog.none}</p>;

  const fromLink = linked !== null && options.some((o) => o.value === linked) ? linked : null;
  const choice = picked ?? fromLink ?? options[0].value;
  const job = jobs.find((j) => j.slug === choice) ?? null;

  return (
    <>
      {/* Once sent, only the thank-you stays on screen. */}
      <fieldset className="mt-6" hidden={sent}>
        <legend className="bf-q">{dialog.role}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => (
            <label key={o.value || "open"} className={cn("chip-toggle apply-role", choice === o.value && "is-on")}>
              <input type="radio" name={name} className="sr-only" checked={choice === o.value} onChange={() => setPicked(o.value)} />
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
          onClose={onClose}
          onSent={() => setSent(true)}
        />
      </div>
    </>
  );
}

/** Hosts the "Apply for a job" pop-up once per page. */
export function ApplyProvider({
  applyHref,
  children,
  ...panel
}: PanelProps & { applyHref: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const api = useMemo<ApplyApi>(() => ({ open: () => setOpen(true), applyHref }), [applyHref]);
  const { dialog } = panel;

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
              <ApplyPanel {...panel} onClose={() => setOpen(false)} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ApplyContext.Provider>
  );
}

/**
 * "Apply for a job" buttons: they open the pop-up. With a modifier key or
 * before JavaScript loads they're a plain link to the /apply page; on that
 * page they just scroll to its form.
 */
export function ApplyLink({ className, children }: { className?: string; children: ReactNode }) {
  const apply = useContext(ApplyContext);
  const pathname = usePathname();
  const applyHref = apply?.applyHref ?? "/apply";
  const onApplyPage = pathname === applyHref;
  return (
    <a
      href={onApplyPage ? "#apply" : applyHref}
      className={className}
      onClick={(ev: MouseEvent<HTMLAnchorElement>) => {
        if (!apply || onApplyPage || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        apply.open();
      }}
    >
      {children}
    </a>
  );
}
