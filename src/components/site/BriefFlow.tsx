"use client";

import { ArrowLeft, ArrowRight, Check, FacebookLogo, InstagramLogo, TiktokLogo, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { api } from "@convex/_generated/api";
import { publicConvex, readError } from "@/lib/convex-public";
import { cn } from "@/lib/format";
import { fmt, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * "Become our client": one short question per screen, like a chat, so it's
 * easy on a phone. What matters most (quality or speed), brand, name, phone,
 * WhatsApp, social links, and an optional note. Shown as a bottom sheet on phones (see Brief.tsx) and inline
 * on the contact page.
 */

export type BriefText = { b: Dictionary["brief"]; e: Dictionary["errors"] };

const STEPS = ["priority", "brand", "name", "phone", "whatsapp", "socials", "about"] as const;
type Step = (typeof STEPS)[number];
const NETWORKS = ["instagram", "tiktok", "facebook"] as const;
type Network = (typeof NETWORKS)[number];
const PRIORITIES = ["quality", "speed"] as const;
type Priority = (typeof PRIORITIES)[number];

type Draft = {
  step: number;
  priority: Priority | "";
  company: string;
  name: string;
  phone: string;
  sameWhatsapp: boolean;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  about: string;
};

const EMPTY: Draft = {
  step: 0,
  priority: "",
  company: "",
  name: "",
  phone: "",
  sameWhatsapp: true,
  whatsapp: "",
  instagram: "",
  tiktok: "",
  facebook: "",
  about: "",
};

/* ----------------- Draft: kept for the visit, so closing loses nothing ----------------- */

const KEY = "scale.brief.v3";
let cache: Draft | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): Draft {
  if (!raw || typeof raw !== "object") return EMPTY;
  const r = raw as Record<string, unknown>;
  const out: Draft = { ...EMPTY };
  for (const key of Object.keys(EMPTY) as (keyof Draft)[]) {
    const value = r[key];
    if (key === "step") out.step = typeof value === "number" ? Math.min(Math.max(Math.floor(value), 0), STEPS.length - 1) : 0;
    else if (key === "sameWhatsapp") out.sameWhatsapp = typeof value === "boolean" ? value : true;
    else if (key === "priority") out.priority = PRIORITIES.find((p) => p === value) ?? "";
    else out[key] = typeof value === "string" ? value.slice(0, 2000) : "";
  }
  return out;
}

function readDraft(): Draft {
  if (cache) return cache;
  try {
    const raw = sessionStorage.getItem(KEY);
    cache = raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function writeDraft(next: Draft) {
  cache = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage blocked: the draft still lives in memory.
  }
  listeners.forEach((l) => l());
}

function clearDraft() {
  writeDraft(EMPTY);
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const serverDraft = () => EMPTY;

/* ------------------------------------------------------------------ */

const phoneOk = (v: string) => {
  const digits = v.replace(/[^0-9٠-٩]/g, "");
  return digits.length >= 8 && digits.length <= 15;
};
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Turns what someone typed into a profile link: a full link stays as it is,
 * "@name" or "name" becomes the profile address on that network. Returns
 * null when it can't be a link or a username.
 */
export function profileLink(network: Network, raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(v)) return `https://${v}`;
  const handle = v.replace(/^@/, "");
  if (network === "facebook" && /\s/.test(handle)) return `https://www.facebook.com/search/top?q=${encodeURIComponent(handle)}`;
  if (!/^[\p{L}\p{N}._-]{1,60}$/u.test(handle)) return null;
  if (network === "instagram") return `https://www.instagram.com/${handle}`;
  if (network === "tiktok") return `https://www.tiktok.com/@${handle}`;
  return `https://www.facebook.com/${handle}`;
}

const ICONS: Record<Network, typeof InstagramLogo> = { instagram: InstagramLogo, tiktok: TiktokLogo, facebook: FacebookLogo };

export function BriefFlow({
  locale,
  text,
  mode,
  autoFocus,
  onClose,
}: {
  locale: Locale;
  text: BriefText;
  mode: "dialog" | "inline";
  /** Focus the first question on mount (dialog only; never steal focus on page load). */
  autoFocus?: boolean;
  onClose?: () => void;
}) {
  const { b, e } = text;
  const draft = useSyncExternalStore(subscribe, readDraft, serverDraft);
  const set = (patch: Partial<Draft>) => writeDraft({ ...readDraft(), ...patch });

  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"edit" | "sending" | "done">("edit");
  const [sentRef, setSentRef] = useState("");
  const [move, setMove] = useState<{ n: number; dir: "next" | "back" }>({ n: 0, dir: "next" });
  const [honeypot, setHoneypot] = useState("");

  const startedAt = useRef(0);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();

  const index = Math.min(Math.max(draft.step, 0), STEPS.length - 1);
  const step = STEPS[index];
  const total = STEPS.length;
  const isLast = index === total - 1;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Put the cursor in the answer: when the sheet opens, and after every move between questions.
  useEffect(() => {
    if (!autoFocus && move.n === 0) return;
    const field = step === "socials" ? "instagram" : step === "whatsapp" && readDraft().sameWhatsapp ? "same" : step;
    const target = document.getElementById(`${uid}-${field}`);
    const frame = requestAnimationFrame(() => target?.focus({ preventScroll: mode === "dialog" }));
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, move.n, step, uid, mode]);
  useEffect(() => {
    if (phase === "done") doneRef.current?.focus({ preventScroll: mode === "dialog" });
  }, [phase, mode]);

  function check(s: Step, d: Draft): { field: string; message: string } | null {
    if (s === "priority" && !d.priority) return { field: "priority", message: e.pickOne };
    if (s === "brand" && !d.company.trim()) return { field: "brand", message: e.required };
    if (s === "name" && !d.name.trim()) return { field: "name", message: e.required };
    if (s === "phone") {
      if (!d.phone.trim()) return { field: "phone", message: e.required };
      if (!phoneOk(d.phone)) return { field: "phone", message: e.phone };
    }
    if (s === "whatsapp" && !d.sameWhatsapp) {
      if (!d.whatsapp.trim()) return { field: "whatsapp", message: e.required };
      if (!phoneOk(d.whatsapp)) return { field: "whatsapp", message: e.phone };
    }
    if (s === "socials") {
      const filled = NETWORKS.filter((n) => d[n].trim());
      if (!filled.length) return { field: "instagram", message: e.socials };
      const bad = filled.find((n) => profileLink(n, d[n]) === null);
      if (bad) return { field: bad, message: e.socialLink };
    }
    return null;
  }

  function go(to: number, dir: "next" | "back") {
    setError(null);
    setFormError(null);
    set({ step: to });
    setMove((m) => ({ n: m.n + 1, dir }));
  }

  function next() {
    if (phase !== "edit") return;
    const problem = check(step, draft);
    if (problem) {
      setError(problem);
      document.getElementById(`${uid}-${problem.field}`)?.focus();
      return;
    }
    if (isLast) void send();
    else go(index + 1, "next");
  }

  function back() {
    if (phase === "edit" && index > 0) go(index - 1, "back");
  }

  async function send() {
    for (const [i, s] of STEPS.entries()) {
      const problem = check(s, draft);
      if (problem) {
        if (i !== index) go(i, "back");
        setError(problem);
        return;
      }
    }
    const client = publicConvex();
    if (!client) return setFormError(e.offline);
    setPhase("sending");
    const socials = NETWORKS.map((n) => profileLink(n, draft[n])).filter((x): x is string => !!x);
    try {
      const result = await client.mutation(api.forms.submitLead, {
        priority: draft.priority || undefined,
        name: draft.name.trim(),
        company: draft.company.trim(),
        phone: draft.phone.trim(),
        whatsapp: draft.sameWhatsapp ? undefined : draft.whatsapp.trim(),
        socials,
        message: draft.about.trim() || undefined,
        locale,
        honeypot: honeypot || undefined,
        elapsedMs: Date.now() - startedAt.current,
      });
      setSentRef(result.ref);
      setPhase("done");
      clearDraft();
    } catch (err) {
      setPhase("edit");
      const r = readError(err);
      if (r.code === "RATE_LIMITED") return setFormError(e.rate);
      if (r.field === "phone" || r.field === "whatsapp" || r.field === "name") {
        const target = STEPS.indexOf(r.field as Step);
        if (target !== index) go(target, "back");
        setError({ field: r.field, message: r.field === "name" ? e.required : e.phone });
        return;
      }
      setFormError(e.generic);
    }
  }

  function restart() {
    clearDraft();
    setSentRef("");
    setPhase("edit");
    setMove((m) => ({ n: m.n + 1, dir: "back" }));
    startedAt.current = Date.now();
  }

  function onKeyDown(ev: KeyboardEvent<HTMLDivElement>) {
    if (ev.key !== "Enter" || ev.shiftKey || ev.nativeEvent.isComposing) return;
    const el = ev.target as HTMLElement;
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) return;
    ev.preventDefault();
    next();
  }

  /* ----------------------------------- view ----------------------------------- */

  const input = (field: string) => ({
    id: `${uid}-${field}`,
    "aria-invalid": error?.field === field ? true : undefined,
    "aria-describedby": error?.field === field ? `${uid}-error` : undefined,
    className: "field bf-input",
  });

  const q = b.steps[step];
  let body: ReactNode;
  if (step === "priority") {
    const p = b.steps.priority;
    const focusable = draft.priority || PRIORITIES[0];
    body = (
      <div
        role="radiogroup"
        aria-labelledby={`${uid}-q`}
        aria-describedby={error?.field === "priority" ? `${uid}-error` : undefined}
        className="bf-options"
      >
        {PRIORITIES.map((value) => (
          <label key={value} className="bf-option" data-on={draft.priority === value || undefined}>
            <input
              id={value === focusable ? `${uid}-priority` : undefined}
              type="radio"
              name={`${uid}-priority`}
              value={value}
              className="sr-only"
              checked={draft.priority === value}
              aria-invalid={error?.field === "priority" ? true : undefined}
              onChange={() => {
                set({ priority: value });
                setError(null);
              }}
            />
            <span className="bf-option-dot" aria-hidden />
            <span className="bf-option-body">
              <span className="bf-option-title">
                {p[value].title}
                {value === "quality" ? <span className="bf-option-badge">{p.recommended}</span> : null}
              </span>
              <span className="bf-option-text">{p[value].text}</span>
            </span>
          </label>
        ))}
      </div>
    );
  } else if (step === "brand") {
    body = (
      <input
        {...input("brand")}
        aria-labelledby={`${uid}-q`}
        autoComplete="organization"
        placeholder={b.steps.brand.placeholder}
        value={draft.company}
        onChange={(ev) => set({ company: ev.target.value })}
      />
    );
  } else if (step === "name") {
    body = (
      <input
        {...input("name")}
        aria-labelledby={`${uid}-q`}
        autoComplete="name"
        placeholder={b.steps.name.placeholder}
        value={draft.name}
        onChange={(ev) => set({ name: ev.target.value })}
      />
    );
  } else if (step === "phone") {
    body = (
      <input
        {...input("phone")}
        aria-labelledby={`${uid}-q`}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        dir="ltr"
        placeholder="010 1234 5678"
        value={draft.phone}
        onChange={(ev) => set({ phone: ev.target.value })}
      />
    );
  } else if (step === "whatsapp") {
    body = (
      <div className="space-y-3">
        <label className="bf-same">
          <input
            id={`${uid}-same`}
            type="checkbox"
            checked={draft.sameWhatsapp}
            onChange={(ev) => {
              const same = ev.target.checked;
              set({ sameWhatsapp: same });
              setError(null);
              // Unticked: the WhatsApp box appears, so put the cursor in it.
              if (!same) requestAnimationFrame(() => document.getElementById(`${uid}-whatsapp`)?.focus());
            }}
          />
          <span className="bf-same-box" aria-hidden>
            <Check className="size-3.5" weight="bold" />
          </span>
          <span>
            {b.steps.whatsapp.same}
            {draft.phone.trim() ? (
              <span className="bf-same-number" dir="ltr">
                {draft.phone.trim()}
              </span>
            ) : null}
          </span>
        </label>
        {!draft.sameWhatsapp ? (
          <input
            {...input("whatsapp")}
            aria-labelledby={`${uid}-q`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="010 1234 5678"
            value={draft.whatsapp}
            onChange={(ev) => set({ whatsapp: ev.target.value })}
          />
        ) : null}
      </div>
    );
  } else if (step === "socials") {
    body = (
      <div className="space-y-3">
        {NETWORKS.map((n) => {
          const Icon = ICONS[n];
          return (
            <div key={n}>
              <label htmlFor={`${uid}-${n}`} className="bf-social-label">
                <Icon className="size-4" aria-hidden />
                {b.steps.socials[n]}
              </label>
              <input
                {...input(n)}
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                // Empty: follows the page, so the Arabic hint reads right to left. Typed: a link or handle goes left to right.
                dir={draft[n] ? "auto" : undefined}
                placeholder={n === "facebook" ? b.steps.socials.page : b.steps.socials.handle}
                value={draft[n]}
                onChange={(ev) => {
                  set({ [n]: ev.target.value } as Partial<Draft>);
                  if (error) setError(null);
                }}
              />
            </div>
          );
        })}
      </div>
    );
  } else {
    body = (
      <textarea
        {...input("about")}
        aria-labelledby={`${uid}-q`}
        rows={4}
        placeholder={b.steps.about.placeholder}
        value={draft.about}
        onChange={(ev) => set({ about: ev.target.value })}
      />
    );
  }

  const required = step !== "about";
  const [doneBefore, doneAfter] = b.done.body.split("{ref}");

  return (
    <div className={cn("bf", `bf--${mode}`)} data-phase={phase} onKeyDown={onKeyDown}>
      <div className="bf-head">
        <div className="min-w-0">
          <p className="bf-title" aria-hidden={mode === "dialog" || undefined}>
            {b.title}
          </p>
          <p className="bf-sub">{b.sub}</p>
        </div>
        {onClose ? (
          <button type="button" className="bf-close" onClick={onClose} aria-label={b.close}>
            <X className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>

      {phase === "done" ? (
        <div className="bf-done" role="status">
          <span className="bf-done-mark" aria-hidden>
            <Check className="size-7" weight="bold" />
          </span>
          <h2 ref={doneRef} tabIndex={-1} className="heading bf-done-title outline-none">
            {b.done.title}
          </h2>
          <p className="bf-done-body">
            {doneBefore}
            <span className="font-mono text-chalk" dir="ltr">
              {sentRef}
            </span>
            {doneAfter}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {onClose ? (
              <button type="button" className="btn btn-signal bf-pill" onClick={onClose}>
                {b.close}
              </button>
            ) : null}
            <button type="button" className="btn btn-line bf-pill" onClick={restart}>
              {b.done.again}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bf-progress" aria-hidden>
            <span className="bf-count" dir="ltr">
              {index + 1} / {total}
            </span>
            <span className="bf-bar">
              <span style={{ transform: `scaleX(${(index + 1) / total})` }} />
            </span>
          </div>

          <div key={move.n} className="bf-step" data-dir={move.dir}>
            <p className="bf-num" dir="ltr">
              {pad(index + 1)}.
            </p>
            <h2 id={`${uid}-q`} className="bf-q">
              {q.title}
              {required ? (
                <span className="text-signal" aria-hidden>
                  {" "}
                  *
                </span>
              ) : (
                <span className="bf-optional"> ({b.optional})</span>
              )}
            </h2>
            {q.hint ? <p className="bf-hint">{q.hint}</p> : null}
            <div className="bf-field">{body}</div>
            {error ? (
              <p id={`${uid}-error`} className="field-error" role="alert">
                {error.message}
              </p>
            ) : null}
            {formError ? (
              <p className="bf-alert" role="alert">
                {formError}
              </p>
            ) : null}
            {/* Hidden from people, tempting for bots. */}
            <div className="sr-only" aria-hidden>
              <label htmlFor={`${uid}-website`}>Website</label>
              <input id={`${uid}-website`} tabIndex={-1} autoComplete="off" value={honeypot} onChange={(ev) => setHoneypot(ev.target.value)} />
            </div>
          </div>

          <div className="bf-foot">
            {index > 0 ? (
              <button type="button" className="bf-back" onClick={back} disabled={phase !== "edit"} aria-label={b.back}>
                <ArrowLeft className="size-5 rtl:-scale-x-100" weight="bold" aria-hidden />
              </button>
            ) : null}
            <button type="button" className="btn btn-signal bf-pill bf-next" onClick={next} disabled={phase !== "edit"}>
              {phase === "sending" ? b.sending : isLast ? b.send : b.next}
              {phase === "edit" && !isLast ? <ArrowRight className="size-4 rtl:-scale-x-100" weight="bold" aria-hidden /> : null}
            </button>
          </div>

          <p className="sr-only" aria-live="polite">
            {phase === "sending" ? b.sending : fmt(b.stepOf, { n: index + 1, total, title: q.title })}
          </p>
        </>
      )}
    </div>
  );
}
