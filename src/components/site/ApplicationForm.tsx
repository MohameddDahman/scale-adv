"use client";

import { CheckCircle, FileText, Paperclip, Trash, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { PublicJob } from "@convex/lib/shape";
import { publicConvex, readError, uploadWithProgress } from "@/lib/convex-public";
import { cn } from "@/lib/format";
import { tx, type Dictionary, type Locale } from "@/lib/i18n";
import { describedBy, FormField } from "./FormField";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];
/** Stored in English so the dashboard reads consistently. */
const EXPERIENCE_VALUES = ["Less than 1 year", "1–2 years", "3–5 years", "More than 5 years"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneOk = (v: string) => {
  const digits = v.replace(/[^0-9٠-٩]/g, "");
  return digits.length >= 8 && digits.length <= 15;
};
const urlOk = (v: string) => {
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return !!u.hostname.includes(".");
  } catch {
    return false;
  }
};
const formatBytes = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

type Job = Pick<PublicJob, "slug" | "type" | "questions">;

export function ApplicationForm({
  locale,
  t,
  e,
  job,
  careersHref,
}: {
  locale: Locale;
  t: Dictionary["apply"];
  e: Dictionary["errors"];
  job: Job | null;
  careersHref: string;
}) {
  const startedAt = useRef(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const [v, setV] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    experience: "",
    portfolioUrl: "",
    profileUrl: "",
    coverNote: "",
    expectedSalary: "",
    startDate: "",
    consent: false,
    honeypot: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cv, setCv] = useState<{ storageId: string; name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState<{ name: string; progress: number } | null>(null);
  const [dragging, setDragging] = useState(false);
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
    const value = ev.target.type === "checkbox" ? (ev.target as HTMLInputElement).checked : ev.target.value;
    setV((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  const isTalent = job?.type === "talent";
  const questions = job?.questions ?? [];

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setErrors(({ cv: _, ...rest }) => rest);
    if (file.type && !TYPES.includes(file.type)) return setErrors((x) => ({ ...x, cv: e.fileType }));
    if (file.size > MAX_BYTES) return setErrors((x) => ({ ...x, cv: e.fileSize }));
    const client = publicConvex();
    if (!client) return setErrors((x) => ({ ...x, cv: e.offline }));
    setUploading({ name: file.name, progress: 0 });
    try {
      const url = await client.mutation(api.forms.generateUploadUrl, {});
      const storageId = await uploadWithProgress(url, file, (p) => setUploading({ name: file.name, progress: p }));
      setCv({ storageId, name: file.name, size: file.size });
    } catch (err) {
      const r = readError(err);
      setErrors((x) => ({ ...x, cv: r.code === "RATE_LIMITED" ? e.rate : e.upload }));
    } finally {
      setUploading(null);
    }
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!v.name.trim()) next.name = e.required;
    if (!v.email.trim()) next.email = e.required;
    else if (!EMAIL_RE.test(v.email.trim())) next.email = e.email;
    if (!v.phone.trim()) next.phone = e.required;
    else if (!phoneOk(v.phone)) next.phone = e.phone;
    if (v.portfolioUrl.trim() && !urlOk(v.portfolioUrl.trim())) next.portfolioUrl = e.url;
    if (!isTalent && !cv && !v.portfolioUrl.trim()) next.cv = e.cvOrPortfolio;
    for (const q of questions) {
      const a = (answers[q.id] ?? "").trim();
      if (q.required && !a) next[`q:${q.id}`] = e.required;
      else if (a && q.kind === "url" && !urlOk(a)) next[`q:${q.id}`] = e.url;
    }
    if (!v.consent) next.consent = e.consent;
    return next;
  }

  function mapServerError(err: ReturnType<typeof readError>) {
    if (err.code === "RATE_LIMITED") return setFormError(e.rate);
    if (err.code === "CLOSED") return setFormError(e.closed);
    if (err.field) {
      const f = err.field;
      const message =
        f === "email"
          ? e.email
          : f === "phone"
            ? e.phone
            : f === "consent"
              ? e.consent
              : f === "portfolioUrl"
                ? e.url
                : f === "cv"
                  ? err.message.includes("10 MB")
                    ? e.fileSize
                    : err.message.includes("PDF")
                      ? e.fileType
                      : err.message.includes("link")
                        ? e.cvOrPortfolio
                        : e.upload
                  : f.startsWith("q:")
                    ? err.message.includes("link")
                      ? e.url
                      : e.required
                    : e.required;
      setErrors({ [f]: message });
      setFormError(e.summary);
      return;
    }
    setFormError(e.generic);
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError(e.summary);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const client = publicConvex();
    if (!client) return setFormError(e.offline);
    setState("sending");
    try {
      const opt = (s: string) => (s.trim() ? s.trim() : undefined);
      const result = await client.mutation(api.forms.submitApplication, {
        jobSlug: job?.slug,
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim(),
        city: opt(v.city),
        experience: opt(v.experience),
        portfolioUrl: opt(v.portfolioUrl),
        profileUrl: opt(v.profileUrl),
        cv: cv ? (cv.storageId as Id<"_storage">) : undefined,
        cvName: cv?.name,
        coverNote: opt(v.coverNote),
        expectedSalary: opt(v.expectedSalary),
        startDate: opt(v.startDate),
        answers: questions.map((q) => ({ questionId: q.id, value: (answers[q.id] ?? "").trim() })).filter((a) => a.value),
        locale,
        consent: v.consent,
        honeypot: v.honeypot || undefined,
        elapsedMs: Date.now() - startedAt.current,
      });
      setReference(result.ref);
      setState("done");
    } catch (err) {
      setState("idle");
      mapServerError(readError(err));
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  if (state === "done") {
    return (
      <div className="border border-chalk/15 bg-ink-900 p-8 md:p-12" role="status">
        <CheckCircle className="size-12 text-signal" weight="fill" aria-hidden />
        <h2 ref={doneRef} tabIndex={-1} className="heading mt-6 text-[clamp(2rem,4vw,3rem)] text-chalk outline-none">
          {t.successTitle}
        </h2>
        <p className="mt-4 max-w-[52ch] text-[1.05rem] leading-relaxed text-smoke">
          {t.successBody.split("{ref}")[0]}
          <span className="font-mono text-chalk" dir="ltr">
            {reference}
          </span>
          {t.successBody.split("{ref}")[1]}
        </p>
        <Link href={careersHref} className="btn btn-line mt-8">
          {t.another}
        </Link>
      </div>
    );
  }

  const fieldProps = (id: string, hint?: string) => ({
    id,
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": describedBy(id, errors[id], hint),
    className: "field",
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-12">
      <div
        ref={summaryRef}
        tabIndex={-1}
        className={cn(
          "flex items-start gap-3 border border-[#ff8a70]/50 bg-[#ff8a70]/10 p-4 text-[0.95rem] text-chalk outline-none",
          !formError && "hidden",
        )}
        role="alert"
      >
        <WarningCircle className="mt-0.5 size-5 shrink-0 text-[#ff8a70]" weight="fill" aria-hidden />
        {formError}
      </div>

      {/* Honeypot: hidden from people, tempting for bots. */}
      <div className="sr-only" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={v.honeypot} onChange={set("honeypot")} />
      </div>

      <fieldset className="space-y-6">
        <legend className="mono-label mb-6 text-ash">{t.sections.you}</legend>
        <div className="grid gap-6 md:grid-cols-2">
          <FormField id="name" label={t.name} required error={errors.name}>
            <input {...fieldProps("name")} autoComplete="name" value={v.name} onChange={set("name")} />
          </FormField>
          <FormField id="email" label={t.email} required error={errors.email}>
            <input {...fieldProps("email")} type="email" inputMode="email" autoComplete="email" dir="ltr" value={v.email} onChange={set("email")} />
          </FormField>
          <FormField id="phone" label={t.phone} required hint={t.phoneHint} error={errors.phone}>
            <input {...fieldProps("phone", t.phoneHint)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={v.phone} onChange={set("phone")} />
          </FormField>
          <FormField id="city" label={t.city} optionalLabel={t.optional}>
            <input {...fieldProps("city")} autoComplete="address-level2" value={v.city} onChange={set("city")} />
          </FormField>
          <FormField id="experience" label={t.experience} optionalLabel={t.optional}>
            <select {...fieldProps("experience")} value={v.experience} onChange={set("experience")}>
              <option value="">{t.choose}</option>
              {t.experienceOptions.map((label, i) => (
                <option key={label} value={EXPERIENCE_VALUES[i]}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="startDate" label={t.start} optionalLabel={t.optional}>
            <input {...fieldProps("startDate")} type="date" value={v.startDate} onChange={set("startDate")} />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="mono-label mb-6 text-ash">{t.sections.work}</legend>
        <div className="grid gap-6 md:grid-cols-2">
          <FormField id="portfolioUrl" label={t.portfolio} hint={t.portfolioHint} error={errors.portfolioUrl} required={!isTalent && !cv}>
            <input
              {...fieldProps("portfolioUrl", t.portfolioHint)}
              type="url"
              inputMode="url"
              dir="ltr"
              placeholder="https://"
              value={v.portfolioUrl}
              onChange={set("portfolioUrl")}
            />
          </FormField>
          <FormField id="profileUrl" label={t.profile} optionalLabel={t.optional}>
            <input {...fieldProps("profileUrl")} type="url" inputMode="url" dir="ltr" placeholder="https://" value={v.profileUrl} onChange={set("profileUrl")} />
          </FormField>
        </div>

        <div>
          <span className="field-label" id="cv-label">
            {t.cv}
          </span>
          <div
            onDragOver={(ev) => {
              ev.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(ev: DragEvent) => {
              ev.preventDefault();
              setDragging(false);
              void handleFile(ev.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex min-h-[7.5rem] flex-col items-start justify-center gap-3 border border-dashed p-5 transition-colors sm:flex-row sm:items-center",
              dragging ? "border-signal bg-signal/5" : errors.cv ? "border-[#ff8a70]" : "border-chalk/25",
            )}
          >
            {cv ? (
              <div className="flex w-full items-center gap-4">
                <FileText className="size-8 shrink-0 text-signal" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-chalk" dir="ltr">
                    {cv.name}
                  </p>
                  <p className="text-[0.85rem] text-smoke" dir="ltr">
                    {formatBytes(cv.size)}
                  </p>
                </div>
                <button type="button" onClick={() => setCv(null)} className="inline-flex min-h-11 items-center gap-2 px-3 text-[0.9rem] text-smoke hover:text-chalk">
                  <Trash className="size-4" aria-hidden />
                  {t.cvRemove}
                </button>
              </div>
            ) : uploading ? (
              <div className="w-full" aria-live="polite">
                <p className="text-[0.92rem] text-chalk">
                  {t.uploading} <span dir="ltr">{uploading.name}</span>
                </p>
                <div className="mt-3 h-1.5 w-full bg-chalk/10" role="progressbar" aria-valuenow={Math.round(uploading.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-labelledby="cv-label">
                  <div className="h-full bg-signal transition-[width]" style={{ width: `${Math.round(uploading.progress * 100)}%` }} />
                </div>
              </div>
            ) : (
              <>
                <label className="btn btn-line !min-h-11 cursor-pointer">
                  <Paperclip className="size-4" aria-hidden />
                  {t.cvChoose}
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.doc,.docx,image/*"
                    aria-labelledby="cv-label"
                    aria-describedby={errors.cv ? "cv-error" : "cv-hint"}
                    onChange={(ev) => void handleFile(ev.target.files?.[0])}
                  />
                </label>
                <span className="text-[0.92rem] text-smoke">{t.cvDrop}</span>
              </>
            )}
          </div>
          {errors.cv ? (
            <p id="cv-error" className="field-error" role="alert">
              {errors.cv}
            </p>
          ) : (
            <p id="cv-hint" className="field-hint">
              {t.cvHint}
            </p>
          )}
        </div>
      </fieldset>

      {questions.length ? (
        <fieldset className="space-y-6">
          <legend className="mono-label mb-6 text-ash">{t.sections.questions}</legend>
          {questions.map((q) => {
            const id = `q:${q.id}`;
            const label = tx(q.label, locale);
            const value = answers[q.id] ?? "";
            const onChange = (val: string) => {
              setAnswers((a) => ({ ...a, [q.id]: val }));
              if (errors[id]) setErrors(({ [id]: _, ...rest }) => rest);
            };
            return (
              <FormField key={q.id} id={id} label={label} required={q.required} optionalLabel={t.optional} error={errors[id]}>
                {q.kind === "long" ? (
                  <textarea {...fieldProps(id)} value={value} onChange={(ev) => onChange(ev.target.value)} rows={4} />
                ) : q.kind === "select" ? (
                  <select {...fieldProps(id)} value={value} onChange={(ev) => onChange(ev.target.value)}>
                    <option value="">{t.choose}</option>
                    {(q.options ?? []).map((o, i) => (
                      <option key={i} value={o.en || o.ar}>
                        {tx(o, locale)}
                      </option>
                    ))}
                  </select>
                ) : q.kind === "yesno" ? (
                  <div className="flex gap-2" role="radiogroup" aria-label={label}>
                    {[
                      ["Yes", t.yes],
                      ["No", t.no],
                    ].map(([val, text]) => (
                      <label key={val} className="chip-toggle">
                        <input type="radio" name={id} className="sr-only" checked={value === val} onChange={() => onChange(val)} />
                        {text}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    {...fieldProps(id)}
                    type={q.kind === "url" ? "url" : "text"}
                    dir={q.kind === "url" ? "ltr" : undefined}
                    placeholder={q.kind === "url" ? "https://" : undefined}
                    value={value}
                    onChange={(ev) => onChange(ev.target.value)}
                  />
                )}
              </FormField>
            );
          })}
        </fieldset>
      ) : null}

      <fieldset className="space-y-6">
        <legend className="mono-label mb-6 text-ash">{t.sections.extra}</legend>
        <FormField id="coverNote" label={t.cover} hint={t.coverHint} optionalLabel={t.optional}>
          <textarea {...fieldProps("coverNote", t.coverHint)} rows={4} value={v.coverNote} onChange={set("coverNote")} />
        </FormField>
        <FormField id="expectedSalary" label={t.salary} hint={t.salaryHint} className="max-w-sm">
          <input {...fieldProps("expectedSalary", t.salaryHint)} inputMode="numeric" dir="ltr" value={v.expectedSalary} onChange={set("expectedSalary")} />
        </FormField>
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] leading-relaxed text-chalk/90">
            <input
              type="checkbox"
              checked={v.consent}
              onChange={set("consent")}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "consent-error" : undefined}
              className="mt-1 size-5 shrink-0 accent-[var(--color-signal)]"
            />
            {t.consent}
          </label>
          {errors.consent ? (
            <p id="consent-error" className="field-error" role="alert">
              {errors.consent}
            </p>
          ) : null}
        </div>
      </fieldset>

      <button type="submit" className="btn btn-signal w-full sm:w-auto" disabled={state === "sending" || !!uploading}>
        {state === "sending" ? t.submitting : t.submit}
      </button>
    </form>
  );
}
