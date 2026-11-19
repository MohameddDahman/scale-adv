"use client";

import { ArrowLeft, ArrowRight, Check, X } from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { api } from "@convex/_generated/api";
import { publicConvex, readError } from "@/lib/convex-public";
import { cn } from "@/lib/format";
import { fmt, type Dictionary, type Locale } from "@/lib/i18n";
import { describedBy, FormField } from "./FormField";

/**
 * The project brief, built like an edit: every question is a scene, every
 * answer lands on the timeline as a clip, and sending "renders" the brief.
 * Used in the "Start a project" dialog and on the contact page.
 */

export type BriefText = {
  b: Dictionary["brief"];
  c: Dictionary["contactPage"];
  e: Dictionary["errors"];
  /** English values stored in the dashboard, index-aligned with the localized labels. */
  values: { budgets: string[]; industries: string[]; sources: string[]; goals: string[] };
};

const STEPS = ["need", "brand", "goal", "budget", "contact"] as const;
type Step = (typeof STEPS)[number];
const SERVICE_KEYS = ["content", "production", "media_buying", "full"] as const;
type ChoiceKey = "industry" | "goal" | "budget" | "source";

type Draft = {
  step: number;
  reached: number;
  services: string[];
  company: string;
  industry: string;
  link: string;
  city: string;
  goal: string;
  detail: string;
  budget: string;
  name: string;
  phone: string;
  email: string;
  source: string;
};

const EMPTY: Draft = {
  step: 0,
  reached: 0,
  services: [],
  company: "",
  industry: "",
  link: "",
  city: "",
  goal: "",
  detail: "",
  budget: "",
  name: "",
  phone: "",
  email: "",
  source: "",
};

/* ----------------- Draft: kept for the visit, so closing loses nothing ----------------- */

const KEY = "scale.brief.v1";
let cache: Draft | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): Draft {
  if (!raw || typeof raw !== "object") return EMPTY;
  const r = raw as Record<string, unknown>;
  const out: Draft = { ...EMPTY };
  for (const key of Object.keys(EMPTY) as (keyof Draft)[]) {
    const value = r[key];
    if (key === "services") out.services = Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
    else if (key === "step" || key === "reached") out[key] = typeof value === "number" ? Math.min(Math.max(Math.floor(value), 0), STEPS.length - 1) : 0;
    else out[key] = typeof value === "string" ? value.slice(0, 3000) : "";
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
  cache = EMPTY;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const serverDraft = () => EMPTY;

/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneOk = (v: string) => {
  const digits = v.replace(/[^0-9٠-٩]/g, "");
  return digits.length >= 8 && digits.length <= 15;
};
const pad = (n: number) => String(n).padStart(2, "0");

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
  const { b, c, e, values } = text;
  const draft = useSyncExternalStore(subscribe, readDraft, serverDraft);
  const set = useCallback((patch: Partial<Draft>) => writeDraft({ ...readDraft(), ...patch }), []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"edit" | "sending" | "done">("edit");
  const [sent, setSent] = useState<{ ref: string; company: string } | null>(null);
  const [cut, setCut] = useState<{ n: number; dir: "next" | "back" }>({ n: 0, dir: "next" });
  const [honeypot, setHoneypot] = useState("");

  const startedAt = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const timecodeRef = useRef<HTMLSpanElement>(null);
  const uid = useId();
  const qid = `${uid}-q`;

  const index = Math.min(Math.max(draft.step, 0), STEPS.length - 1);
  const step = STEPS[index];
  const total = STEPS.length;
  const isLast = index === total - 1;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Focus the question when the dialog opens, and after every cut (user moved between steps).
  useEffect(() => {
    if (autoFocus) headingRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  useEffect(() => {
    if (cut.n > 0) headingRef.current?.focus({ preventScroll: mode === "dialog" });
  }, [cut.n, mode]);
  useEffect(() => {
    if (phase === "done") doneRef.current?.focus({ preventScroll: mode === "dialog" });
  }, [phase, mode]);

  // Running timecode, like the camera's: written straight to the DOM so nothing re-renders.
  useEffect(() => {
    if (phase === "done") return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (timecodeRef.current) {
        timecodeRef.current.textContent = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)}:${pad(Math.floor((t % 1) * 25))}`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const clearError = (key: string) => {
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  function check(s: Step, d: Draft) {
    const out: Record<string, string> = {};
    if (s === "need" && d.services.length === 0) out.services = e.services;
    if (s === "brand" && !d.company.trim()) out.company = e.required;
    if (s === "contact") {
      if (!d.name.trim()) out.name = e.required;
      if (!d.phone.trim()) out.phone = e.required;
      else if (!phoneOk(d.phone)) out.phone = e.phone;
      if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) out.email = e.email;
    }
    return out;
  }

  function showErrors(errs: Record<string, string>) {
    setErrors(errs);
    const first = Object.keys(errs)[0];
    requestAnimationFrame(() => {
      const el = document.getElementById(first === "services" ? `${uid}-services` : `${uid}-${first}`);
      el?.focus();
    });
  }

  function go(to: number, dir: "next" | "back") {
    setErrors({});
    setFormError(null);
    set({ step: to, reached: Math.max(readDraft().reached, to) });
    setCut((cur) => ({ n: cur.n + 1, dir }));
  }

  function next() {
    if (phase !== "edit") return;
    const errs = check(step, draft);
    if (Object.keys(errs).length) return showErrors(errs);
    if (!isLast) go(index + 1, "next");
    else void send();
  }

  function back() {
    if (phase === "edit" && index > 0) go(index - 1, "back");
  }

  function jump(to: number) {
    if (phase !== "edit" || to === index || to > draft.reached) return;
    if (to > index) {
      const errs = check(step, draft);
      if (Object.keys(errs).length) return showErrors(errs);
    }
    go(to, to > index ? "next" : "back");
  }

  async function send() {
    for (const [i, s] of STEPS.entries()) {
      const errs = check(s, draft);
      if (Object.keys(errs).length) {
        if (i !== index) go(i, "back");
        setErrors(errs);
        return;
      }
    }
    const client = publicConvex();
    if (!client) return setFormError(e.offline);
    setPhase("sending");
    const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    const message = [draft.goal ? `Goal: ${draft.goal}` : "", draft.detail.trim()].filter(Boolean).join("\n\n");
    try {
      const [result] = await Promise.all([
        client.mutation(api.forms.submitLead, {
          name: draft.name.trim(),
          company: draft.company.trim(),
          phone: draft.phone.trim(),
          email: opt(draft.email),
          city: opt(draft.city),
          link: opt(draft.link),
          services: draft.services,
          budget: opt(draft.budget),
          industry: opt(draft.industry),
          message: opt(message),
          source: opt(draft.source),
          locale,
          honeypot: honeypot || undefined,
          elapsedMs: Date.now() - startedAt.current,
        }),
        // Let the render bar play out; a brief shouldn't vanish in a blink.
        new Promise((resolve) => setTimeout(resolve, 1300)),
      ]);
      setSent({ ref: result.ref, company: draft.company.trim() });
      setPhase("done");
      clearDraft();
    } catch (err) {
      setPhase("edit");
      const r = readError(err);
      if (r.code === "RATE_LIMITED") return setFormError(e.rate);
      if (r.field) {
        const target = r.field === "services" ? 0 : r.field === "company" ? 1 : 4;
        if (target !== index) go(target, "back");
        const msg = r.field === "phone" ? e.phone : r.field === "email" ? e.email : r.field === "services" ? e.services : e.required;
        setErrors({ [r.field]: msg });
        return;
      }
      setFormError(e.generic);
    }
  }

  function restart() {
    clearDraft();
    setSent(null);
    setPhase("edit");
    setCut((cur) => ({ n: cur.n + 1, dir: "back" }));
    startedAt.current = Date.now();
  }

  /* ---------- options: shared by clicks and the number-key shortcuts ---------- */

  const toggleService = (key: string) => {
    const current = readDraft().services;
    set({ services: current.includes(key) ? current.filter((x) => x !== key) : [...current, key] });
    clearError("services");
  };
  const setChoice = (key: ChoiceKey, value: string) => {
    const patch: Partial<Draft> = {};
    patch[key] = value;
    set(patch);
  };
  /** Single choices can be cleared by picking them again. */
  const pick = (key: ChoiceKey, value: string) => setChoice(key, readDraft()[key] === value ? "" : value);

  function onKeyDown(ev: KeyboardEvent<HTMLDivElement>) {
    if (phase !== "edit") return;
    const el = ev.target as HTMLElement;
    const isChoice = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");
    const typing = (el instanceof HTMLInputElement && !isChoice) || el instanceof HTMLTextAreaElement || el.isContentEditable;
    if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing && !(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLButtonElement) && !(el instanceof HTMLAnchorElement)) {
      ev.preventDefault();
      next();
      return;
    }
    if (typing || ev.metaKey || ev.ctrlKey || ev.altKey || !/^[1-9]$/.test(ev.key)) return;
    const n = Number(ev.key) - 1;
    if (step === "need" && n < SERVICE_KEYS.length) toggleService(SERVICE_KEYS[n]);
    else if (step === "brand" && n < values.industries.length) pick("industry", values.industries[n]);
    else if (step === "goal" && n < values.goals.length) pick("goal", values.goals[n]);
    else if (step === "budget" && n < values.budgets.length) pick("budget", values.budgets[n]);
    else if (step === "contact" && n < values.sources.length) pick("source", values.sources[n]);
    else return;
    ev.preventDefault();
  }

  /* --------------------------- labels for the timeline --------------------------- */

  const labelOf = (list: string[], localized: string[], value: string) => {
    const i = list.indexOf(value);
    return i >= 0 ? (localized[i] ?? value) : value;
  };
  const budgetLabel = (value: string) => {
    const i = values.budgets.indexOf(value);
    if (i < 0) return value;
    return i < b.budgetShort.length ? b.budgetShort[i] : b.notSure;
  };
  const summary = (s: Step, d: Draft) => {
    switch (s) {
      case "need":
        return d.services.map((k) => b.needs[k]?.verb.replace(/[.。]$/, "") ?? k).join(" · ");
      case "brand":
        return d.company.trim();
      case "goal":
        return labelOf(values.goals, b.goals, d.goal);
      case "budget":
        return d.budget ? budgetLabel(d.budget) : "";
      case "contact":
        return d.name.trim();
    }
  };

  const optionalEmpty = (step === "goal" && !draft.goal && !draft.detail.trim()) || (step === "budget" && !draft.budget);
  const shown = phase === "done" ? null : draft;
  const pos = phase === "edit" ? ((index + 0.5) / total) * 100 : 100;

  /* ----------------------------------- view ----------------------------------- */

  const field = (key: string, hint?: string) => ({
    id: `${uid}-${key}`,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": describedBy(`${uid}-${key}`, errors[key], hint),
    className: "field",
  });

  const chip = (key: ChoiceKey, valueList: string[], labels: string[], withKeys = false) => (
    <div className="flex flex-wrap gap-2">
      {labels.map((label, i) => {
        const value = valueList[i];
        const checked = draft[key] === value;
        return (
          <label key={value} className="chip-toggle brief-chip">
            <input
              type="radio"
              name={`${uid}-${key}`}
              className="sr-only"
              checked={checked}
              onChange={() => setChoice(key, value)}
              onClick={() => {
                if (checked) setChoice(key, "");
              }}
            />
            {withKeys ? (
              <span className="brief-key" aria-hidden>
                {i + 1}
              </span>
            ) : null}
            {label}
          </label>
        );
      })}
    </div>
  );

  let body: ReactNode = null;
  if (step === "need") {
    body = (
      <>
        <div id={`${uid}-services`} tabIndex={-1} role="group" aria-labelledby={qid} aria-describedby={errors.services ? `${uid}-services-error` : undefined} className="brief-cards outline-none">
          {SERVICE_KEYS.map((key, i) => (
            <label key={key} className="brief-card">
              <input type="checkbox" className="sr-only" checked={draft.services.includes(key)} onChange={() => toggleService(key)} />
              <span className="brief-key" aria-hidden>
                {i + 1}
              </span>
              <span className="brief-card-verb">{b.needs[key].verb}</span>
              <span className="mono-label brief-card-name">{c.services[key]}</span>
              <span className="brief-card-body">{b.needs[key].body}</span>
              <span className="brief-card-rec" aria-hidden>
                <span className="rec-dot" /> REC
              </span>
            </label>
          ))}
        </div>
        {errors.services ? (
          <p id={`${uid}-services-error`} className="field-error" role="alert">
            {errors.services}
          </p>
        ) : null}
      </>
    );
  } else if (step === "brand") {
    body = (
      <div className="space-y-7">
        <FormField id={`${uid}-company`} label={c.company} required error={errors.company}>
          <input
            {...field("company")}
            className="field brief-big"
            autoComplete="organization"
            value={draft.company}
            onChange={(ev) => {
              set({ company: ev.target.value });
              clearError("company");
            }}
          />
        </FormField>
        <fieldset>
          <legend className="field-label">
            {c.industry} <span className="ms-1 text-[0.78rem] font-normal text-ash">({c.optional})</span>
          </legend>
          {chip("industry", values.industries, c.industries)}
        </fieldset>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id={`${uid}-link`} label={c.link} hint={c.linkHint} optionalLabel={c.optional}>
            <input {...field("link", c.linkHint)} type="url" inputMode="url" dir="ltr" placeholder="https://" value={draft.link} onChange={(ev) => set({ link: ev.target.value })} />
          </FormField>
          <FormField id={`${uid}-city`} label={c.city} optionalLabel={c.optional}>
            <input {...field("city")} autoComplete="address-level2" value={draft.city} onChange={(ev) => set({ city: ev.target.value })} />
          </FormField>
        </div>
      </div>
    );
  } else if (step === "goal") {
    body = (
      <div className="space-y-7">
        <div role="group" aria-labelledby={qid}>
          {chip("goal", values.goals, b.goals, true)}
        </div>
        <FormField id={`${uid}-detail`} label={b.detail} hint={b.detailHint} optionalLabel={c.optional}>
          <textarea {...field("detail", b.detailHint)} rows={3} value={draft.detail} onChange={(ev) => set({ detail: ev.target.value })} />
        </FormField>
      </div>
    );
  } else if (step === "budget") {
    const ranges = b.budgetShort.length;
    const level = values.budgets.indexOf(draft.budget);
    body = (
      <div role="radiogroup" aria-labelledby={qid}>
        <div className="brief-meter">
          {b.budgetShort.map((short, i) => {
            const value = values.budgets[i];
            const checked = draft.budget === value;
            return (
              <label
                key={value}
                className="brief-level"
                data-lit={level >= 0 && level < ranges && i <= level}
                style={{ "--h": (i + 1) / ranges, "--d": i } as CSSProperties}
              >
                <input
                  type="radio"
                  name={`${uid}-budget`}
                  className="sr-only"
                  aria-label={c.budgets[i]}
                  checked={checked}
                  onChange={() => setChoice("budget", value)}
                  onClick={() => {
                    if (checked) setChoice("budget", "");
                  }}
                />
                <span className="brief-level-bar" aria-hidden />
                <span className="brief-level-label">
                  <span className="brief-key" aria-hidden>
                    {i + 1}
                  </span>
                  {short}
                </span>
              </label>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="mono-label text-ash">{b.budgetUnit}</p>
          <label className="chip-toggle brief-chip">
            <input
              type="radio"
              name={`${uid}-budget`}
              className="sr-only"
              checked={draft.budget === values.budgets[ranges]}
              onChange={() => setChoice("budget", values.budgets[ranges])}
              onClick={() => {
                if (draft.budget === values.budgets[ranges]) setChoice("budget", "");
              }}
            />
            <span className="brief-key" aria-hidden>
              {ranges + 1}
            </span>
            {b.notSure}
          </label>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-7">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id={`${uid}-name`} label={c.name} required error={errors.name}>
            <input
              {...field("name")}
              autoComplete="name"
              value={draft.name}
              onChange={(ev) => {
                set({ name: ev.target.value });
                clearError("name");
              }}
            />
          </FormField>
          <FormField id={`${uid}-phone`} label={c.phone} required error={errors.phone}>
            <input
              {...field("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              value={draft.phone}
              onChange={(ev) => {
                set({ phone: ev.target.value });
                clearError("phone");
              }}
            />
          </FormField>
          <FormField id={`${uid}-email`} label={c.email} optionalLabel={c.optional} error={errors.email} className="sm:col-span-2">
            <input
              {...field("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              value={draft.email}
              onChange={(ev) => {
                set({ email: ev.target.value });
                clearError("email");
              }}
            />
          </FormField>
        </div>
        <fieldset>
          <legend className="field-label">
            {c.source} <span className="ms-1 text-[0.78rem] font-normal text-ash">({c.optional})</span>
          </legend>
          {chip("source", values.sources, c.sources)}
        </fieldset>
      </div>
    );
  }

  const [before, after] = c.successBody.split("{ref}");

  return (
    <div className={cn("brief", `brief--${mode}`)} data-phase={phase} onKeyDown={onKeyDown}>
      <div className="brief-slate">
        <div className="brief-clapper" aria-hidden />
        <div className="brief-slate-row">
          <span className="brief-slate-cell min-w-0">
            <span className="mono-label">{b.prod}</span>
            <span className="brief-slate-brand">{(sent?.company ?? draft.company.trim()) || b.yourBrand}</span>
          </span>
          <span className="brief-slate-cell">
            <span className="mono-label">{b.scene}</span>
            <span className="brief-slate-num" dir="ltr">
              {pad(phase === "done" ? total : index + 1)}/{pad(total)}
            </span>
          </span>
          <span className="brief-tc" dir="ltr" aria-hidden>
            <span className={cn("rec-dot", phase === "done" && "brief-rec-off")} />
            <span ref={timecodeRef}>00:00:00:00</span>
          </span>
          {onClose ? (
            <button type="button" className="brief-close" onClick={onClose} aria-label={b.close}>
              <X className="size-5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {phase === "done" && sent ? (
        <div className="brief-stage">
          <div className="brief-done" role="status">
            <p className="mono-label brief-printed">
              <Check className="size-4" weight="bold" aria-hidden /> {b.printed} ·{" "}
              <span dir="ltr" className="font-mono">
                {sent.ref}
              </span>
            </p>
            <h2 ref={doneRef} tabIndex={-1} className="display brief-done-title outline-none">
              {c.successTitle}
            </h2>
            <p className="brief-done-body">
              {before}
              <span className="font-mono text-chalk" dir="ltr">
                {sent.ref}
              </span>
              {after}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {onClose ? (
                <button type="button" className="btn btn-signal" onClick={onClose}>
                  {b.close}
                </button>
              ) : null}
              <button type="button" className="btn btn-line" onClick={restart}>
                {c.again}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="brief-stage">
          <div key={cut.n} className="brief-step" data-dir={cut.dir}>
            <p className="mono-label brief-eyebrow">
              <span dir="ltr">{pad(index + 1)}</span> — {b.steps[step].clip}
            </p>
            <h2 ref={headingRef} id={qid} tabIndex={-1} className="brief-question outline-none">
              {b.steps[step].title}
            </h2>
            <p className="brief-hint">{b.steps[step].hint}</p>
            <div className="brief-fields">{body}</div>
            {formError ? (
              <p className="brief-alert" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
          {cut.n > 0 ? <span key={`cut-${cut.n}`} className="brief-splice" data-dir={cut.dir} aria-hidden /> : null}
          {/* Hidden from people, tempting for bots. */}
          <div className="sr-only" aria-hidden>
            <label htmlFor={`${uid}-website`}>Website</label>
            <input id={`${uid}-website`} tabIndex={-1} autoComplete="off" value={honeypot} onChange={(ev) => setHoneypot(ev.target.value)} />
          </div>
        </div>
      )}

      <div className="brief-timeline">
        <div className="brief-render" aria-hidden>
          <span className="brief-render-fill" />
        </div>
        <div className="brief-track-wrap" style={{ "--pos": `${pos}%` } as CSSProperties}>
        <ol className="brief-track" aria-label={b.timeline}>
          {STEPS.map((s, i) => {
            const value = shown ? summary(s, shown) : "";
            const state = phase !== "edit" ? "done" : i === index ? "active" : i <= draft.reached && value ? "done" : i <= draft.reached ? "seen" : "idle";
            return (
              <li key={s} className="brief-clip" data-state={state} style={{ "--i": i } as CSSProperties}>
                <button
                  type="button"
                  onClick={() => jump(i)}
                  disabled={phase !== "edit" || i > draft.reached || i === index}
                  aria-current={phase === "edit" && i === index ? "step" : undefined}
                  aria-label={`${fmt(b.edit, { step: b.steps[s].clip })}${value ? `: ${value}` : ""}`}
                >
                  <span className="brief-clip-label">{b.steps[s].clip}</span>
                  <span className="brief-clip-value">{value || "—"}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <span className="brief-playhead" aria-hidden />
        </div>
      </div>

      {phase !== "done" ? (
        <div className="brief-foot">
          <button type="button" className="brief-back" onClick={back} disabled={index === 0 || phase !== "edit"}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden />
            {b.back}
          </button>
          <span className="brief-enter" aria-hidden>
            {b.enterHint}
          </span>
          <button type="button" className="btn btn-signal brief-next" onClick={next} disabled={phase !== "edit"}>
            {phase === "sending" ? b.rendering : isLast ? b.send : optionalEmpty ? b.skip : b.next}
            {phase === "edit" ? <ArrowRight className="size-4 rtl:-scale-x-100" weight="bold" aria-hidden /> : null}
          </button>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {phase === "sending" ? b.rendering : phase === "edit" ? fmt(b.stepOf, { n: index + 1, total, title: b.steps[step].title }) : ""}
      </p>
    </div>
  );
}
