"use client";

import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "@convex/_generated/api";
import { publicConvex, readError } from "@/lib/convex-public";
import { cn } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n";
import { describedBy, FormField } from "./FormField";

const SERVICE_KEYS = ["content", "production", "media_buying", "full"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneOk = (v: string) => {
  const digits = v.replace(/[^0-9٠-٩]/g, "");
  return digits.length >= 8 && digits.length <= 15;
};

export function LeadForm({
  locale,
  t,
  e,
  values,
}: {
  locale: Locale;
  t: Dictionary["contactPage"];
  e: Dictionary["errors"];
  /** English option values (stored in the dashboard), index-aligned with the localized labels. */
  values: { budgets: string[]; industries: string[]; sources: string[] };
}) {
  const startedAt = useRef(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const [v, setV] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    city: "",
    link: "",
    budget: "",
    industry: "",
    message: "",
    source: "",
    honeypot: "",
  });
  const [services, setServices] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [reference, setReference] = useState("");

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (state === "done") {
      doneRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      doneRef.current?.focus({ preventScroll: true });
    }
  }, [state]);

  const set = (key: keyof typeof v) => (ev: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setV((prev) => ({ ...prev, [key]: ev.target.value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  const toggleService = (key: string) => {
    setServices((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
    if (errors.services) setErrors(({ services: _, ...rest }) => rest);
  };

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    if (!v.name.trim()) next.name = e.required;
    if (!v.company.trim()) next.company = e.required;
    if (!v.phone.trim()) next.phone = e.required;
    else if (!phoneOk(v.phone)) next.phone = e.phone;
    if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) next.email = e.email;
    if (!services.length) next.services = e.services;
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError(e.summary);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const client = publicConvex();
    if (!client) return setFormError(e.offline);
    setState("sending");
    const opt = (s: string) => (s.trim() ? s.trim() : undefined);
    try {
      const result = await client.mutation(api.forms.submitLead, {
        name: v.name.trim(),
        company: v.company.trim(),
        phone: v.phone.trim(),
        email: opt(v.email),
        city: opt(v.city),
        link: opt(v.link),
        services,
        budget: opt(v.budget),
        industry: opt(v.industry),
        message: opt(v.message),
        source: opt(v.source),
        locale,
        honeypot: v.honeypot || undefined,
        elapsedMs: Date.now() - startedAt.current,
      });
      setReference(result.ref);
      setState("done");
    } catch (err) {
      setState("idle");
      const r = readError(err);
      if (r.code === "RATE_LIMITED") setFormError(e.rate);
      else if (r.field) {
        setErrors({ [r.field]: r.field === "phone" ? e.phone : r.field === "email" ? e.email : r.field === "services" ? e.services : e.required });
        setFormError(e.summary);
      } else setFormError(e.generic);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  if (state === "done") {
    const [before, after] = t.successBody.split("{ref}");
    return (
      <div className="border border-chalk/15 bg-ink-900 p-8 md:p-12" role="status">
        <CheckCircle className="size-12 text-signal" weight="fill" aria-hidden />
        <h2 ref={doneRef} tabIndex={-1} className="heading mt-6 text-[clamp(2rem,4vw,3rem)] text-chalk outline-none">
          {t.successTitle}
        </h2>
        <p className="mt-4 max-w-[52ch] text-[1.05rem] leading-relaxed text-smoke">
          {before}
          <span className="font-mono text-chalk" dir="ltr">
            {reference}
          </span>
          {after}
        </p>
        <button
          type="button"
          className="btn btn-line mt-8"
          onClick={() => {
            setV({ name: "", company: "", phone: "", email: "", city: "", link: "", budget: "", industry: "", message: "", source: "", honeypot: "" });
            setServices([]);
            setState("idle");
            startedAt.current = Date.now();
          }}
        >
          {t.again}
        </button>
      </div>
    );
  }

  const fp = (id: string, hint?: string) => ({
    id,
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": describedBy(id, errors[id], hint),
    className: "field",
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <div
        ref={summaryRef}
        tabIndex={-1}
        role="alert"
        className={cn(
          "flex items-start gap-3 border border-[#ff8a70]/50 bg-[#ff8a70]/10 p-4 text-[0.95rem] text-chalk outline-none",
          !formError && "hidden",
        )}
      >
        <WarningCircle className="mt-0.5 size-5 shrink-0 text-[#ff8a70]" weight="fill" aria-hidden />
        {formError}
      </div>

      <div className="sr-only" aria-hidden>
        <label htmlFor="company_site">Website</label>
        <input id="company_site" tabIndex={-1} autoComplete="off" value={v.honeypot} onChange={set("honeypot")} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField id="name" label={t.name} required error={errors.name}>
          <input {...fp("name")} autoComplete="name" value={v.name} onChange={set("name")} />
        </FormField>
        <FormField id="company" label={t.company} required error={errors.company}>
          <input {...fp("company")} autoComplete="organization" value={v.company} onChange={set("company")} />
        </FormField>
        <FormField id="phone" label={t.phone} required error={errors.phone}>
          <input {...fp("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={v.phone} onChange={set("phone")} />
        </FormField>
        <FormField id="email" label={t.email} optionalLabel={t.optional} error={errors.email}>
          <input {...fp("email")} type="email" inputMode="email" autoComplete="email" dir="ltr" value={v.email} onChange={set("email")} />
        </FormField>
      </div>

      <fieldset aria-describedby={errors.services ? "services-error" : undefined}>
        <legend className="field-label">
          {t.servicesLabel} <span className="text-signal" aria-hidden>*</span>
        </legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {SERVICE_KEYS.map((key) => (
            <label key={key} className="chip-toggle">
              <input type="checkbox" className="sr-only" checked={services.includes(key)} onChange={() => toggleService(key)} />
              {t.services[key]}
            </label>
          ))}
        </div>
        {errors.services ? (
          <p id="services-error" className="field-error" role="alert">
            {errors.services}
          </p>
        ) : null}
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField id="budget" label={t.budget} optionalLabel={t.optional}>
          <select {...fp("budget")} value={v.budget} onChange={set("budget")}>
            <option value="">{t.choose}</option>
            {t.budgets.map((label, i) => (
              <option key={label} value={values.budgets[i]}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="industry" label={t.industry} optionalLabel={t.optional}>
          <select {...fp("industry")} value={v.industry} onChange={set("industry")}>
            <option value="">{t.choose}</option>
            {t.industries.map((label, i) => (
              <option key={label} value={values.industries[i]}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="link" label={t.link} hint={t.linkHint} optionalLabel={t.optional}>
          <input {...fp("link", t.linkHint)} type="url" inputMode="url" dir="ltr" placeholder="https://" value={v.link} onChange={set("link")} />
        </FormField>
        <FormField id="city" label={t.city} optionalLabel={t.optional}>
          <input {...fp("city")} autoComplete="address-level2" value={v.city} onChange={set("city")} />
        </FormField>
      </div>

      <FormField id="message" label={t.message} hint={t.messageHint} optionalLabel={t.optional}>
        <textarea {...fp("message", t.messageHint)} rows={5} value={v.message} onChange={set("message")} />
      </FormField>

      <FormField id="source" label={t.source} optionalLabel={t.optional} className="max-w-sm">
        <select {...fp("source")} value={v.source} onChange={set("source")}>
          <option value="">{t.choose}</option>
          {t.sources.map((label, i) => (
            <option key={label} value={values.sources[i]}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <button type="submit" className="btn btn-signal w-full sm:w-auto" disabled={state === "sending"}>
        {state === "sending" ? t.submitting : t.submit}
      </button>
    </form>
  );
}
