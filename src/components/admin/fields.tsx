"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Question, Text } from "@convex/lib/validators";
import { ArrowDown, ArrowUp, ImageSquare, LinkSimple, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { IMAGE_PRESETS, type ImagePreset } from "@/lib/image-compress";
import { MediaPicker, Thumb, UploadProgress, uploadedMessage, useUploader } from "./media";
import { errorMessage, useAdminQuery } from "./session";
import { Button, IconButton, Input, Select, Textarea, useFeedback } from "./ui";

export const emptyText = (): Text => ({ en: "", ar: "" });

/* --------------------------- Bilingual ---------------------------- */

export function BilingualInput({
  id,
  value,
  onChange,
  multiline,
  rows = 3,
  invalid,
  placeholder,
}: {
  id?: string;
  value: Text;
  onChange: (v: Text) => void;
  multiline?: boolean;
  rows?: number;
  invalid?: boolean;
  placeholder?: { en?: string; ar?: string };
}) {
  const auto = useId();
  const base = id ?? auto;
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {(["en", "ar"] as const).map((lang) => (
        <div key={lang} className="relative">
          <span
            className={cn(
              "pointer-events-none absolute top-2 z-10 rounded-[2px] bg-a-hover px-1 font-mono text-[0.6rem] font-semibold uppercase text-a-faint",
              lang === "ar" ? "left-2" : "right-2",
            )}
          >
            {lang}
          </span>
          <Control
            id={lang === "en" ? base : `${base}-ar`}
            dir={lang === "ar" ? "rtl" : "ltr"}
            lang={lang}
            aria-label={lang === "en" ? undefined : "Arabic"}
            aria-invalid={invalid && lang === "en" ? true : undefined}
            value={value[lang]}
            rows={multiline ? rows : undefined}
            placeholder={placeholder?.[lang]}
            onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            className={cn(lang === "ar" ? "pl-9 font-[family-name:var(--font-plex-arabic)] text-[0.95rem]" : "pr-9")}
          />
        </div>
      ))}
    </div>
  );
}

export function BilingualList({
  value,
  onChange,
  addLabel = "Add item",
  multiline,
}: {
  value: Text[];
  onChange: (v: Text[]) => void;
  addLabel?: string;
  multiline?: boolean;
}) {
  const move = (i: number, d: number) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 w-5 shrink-0 text-end font-mono text-[0.7rem] text-a-faint">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <BilingualInput value={item} multiline={multiline} rows={2} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
          </div>
          <div className="flex shrink-0 flex-col">
            <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="size-3.5" aria-hidden />
            </IconButton>
            <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === value.length - 1}>
              <ArrowDown className="size-3.5" aria-hidden />
            </IconButton>
          </div>
          <IconButton label="Remove" tone="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Trash className="size-4" aria-hidden />
          </IconButton>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus className="size-4" aria-hidden />} onClick={() => onChange([...value, emptyText()])}>
        {addLabel}
      </Button>
    </div>
  );
}

/* ----------------------------- Media ------------------------------ */

/** Resolves stored file ids to URLs for previews. */
export function useStorageUrls(ids: (string | undefined | null)[]) {
  const unique = useMemo(() => [...new Set(ids.filter((x): x is string => !!x))].sort(), [ids]);
  const result = useAdminQuery(api.media.urls, unique.length ? { ids: unique as Id<"_storage">[] } : "skip");
  return result ?? {};
}

export function ImageField({
  storageId,
  path,
  onChange,
  aspect = "aspect-square",
  hint,
  preset = "library",
  allowLink = true,
  fallback,
}: {
  storageId?: string;
  path?: string;
  onChange: (next: { storageId?: Id<"_storage">; path?: string }) => void;
  aspect?: string;
  hint?: string;
  /** How the image is used; decides the size it's shrunk to before upload. */
  preset?: ImagePreset;
  /** Offer "Link" (an address instead of an upload) only where a link can be stored. */
  allowLink?: boolean;
  /** What the site shows while there's no image of its own (e.g. a reel cover), with a note saying where it comes from. */
  fallback?: { src: string; badge: string; note: string };
}) {
  const urls = useStorageUrls([storageId]);
  const { upload, progress } = useUploader();
  const { toast } = useFeedback();
  const [picker, setPicker] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const own = (storageId && (urls[storageId] ?? localUrl)) || path || null;
  const borrowed = !own && fallback ? fallback : null;
  const preview = own ?? borrowed?.src ?? null;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className={cn("relative w-32 shrink-0 overflow-hidden rounded-[5px] border border-a-line bg-a-hover", aspect)}>
        {preview ? (
          <Thumb src={preview} sizes="128px" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-a-faint">
            <ImageSquare className="size-7" aria-hidden />
          </span>
        )}
        {borrowed ? (
          <span className="absolute inset-x-1.5 bottom-1.5 rounded-[3px] bg-black/75 px-1.5 py-0.5 text-center text-[0.66rem] font-semibold text-white">
            {borrowed.badge}
          </span>
        ) : null}
      </div>
      <div className="min-w-48 flex-1 space-y-2">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex">
            <span className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[4px] border border-a-line-strong bg-a-surface px-3 text-[0.8rem] font-semibold hover:bg-a-hover">
              <UploadSimple className="size-4" aria-hidden />
              Upload
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={progress !== null}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const up = await upload(file, preset);
                  setLocalUrl(up.url);
                  onChange({ storageId: up.storageId, path: undefined });
                  toast(uploadedMessage(up));
                } catch (err) {
                  toast(errorMessage(err, "Upload failed."), "error");
                }
              }}
            />
          </label>
          <Button size="sm" onClick={() => setPicker(true)}>
            Library
          </Button>
          {allowLink ? (
            <Button size="sm" variant="ghost" icon={<LinkSimple className="size-4" aria-hidden />} onClick={() => setLinkMode((v) => !v)}>
              Link
            </Button>
          ) : null}
          {own ? (
            <Button size="sm" variant="ghost" className="text-a-danger" onClick={() => onChange({ storageId: undefined, path: undefined })}>
              Remove
            </Button>
          ) : null}
        </div>
        <UploadProgress progress={progress} />
        {linkMode ? (
          <Input
            placeholder="https://… or /clients/logo.webp"
            defaultValue={!storageId ? (path ?? "") : ""}
            onBlur={(e) => onChange({ storageId: undefined, path: e.target.value.trim() || undefined })}
            dir="ltr"
          />
        ) : null}
        {borrowed ? <p className="text-[0.76rem] text-a-text">{borrowed.note}</p> : null}
        {hint ? <p className="text-[0.76rem] text-a-muted">{hint}</p> : null}
        <p className="text-[0.72rem] text-a-faint">{IMAGE_PRESETS[preset].note}</p>
      </div>
      <MediaPicker
        open={picker}
        onOpenChange={setPicker}
        preset={preset}
        onPick={(m) => {
          setLocalUrl(m.url);
          onChange({ storageId: m.storageId, path: undefined });
        }}
      />
    </div>
  );
}

/**
 * Video files aren't kept in Convex: on the free plan a handful of reels
 * would fill the storage, and every play would count against the monthly
 * downloads. Reels use a link instead (Cloudinary, YouTube, Instagram).
 * This only shows a video stored by an earlier version, so it can be removed.
 */
export function StoredVideo({ storageId, onRemove }: { storageId?: string; onRemove: () => void }) {
  const urls = useStorageUrls([storageId]);
  if (!storageId) return null;
  const src = urls[storageId] ?? null;
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="relative aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-[5px] border border-a-line bg-a-hover">
        {src ? <video src={src} className="absolute inset-0 size-full object-cover" muted controls preload="none" /> : null}
      </div>
      <div className="min-w-48 flex-1 space-y-2">
        <p className="text-[0.8rem] text-a-muted">
          This reel still has a video file stored in the dashboard. Each play counts against the free plan&apos;s monthly downloads. Add a
          link below, then remove the file.
        </p>
        <Button size="sm" variant="ghost" className="text-a-danger" onClick={onRemove}>
          Remove video file
        </Button>
      </div>
    </div>
  );
}

/* ------------------------- Structured lists ------------------------ */

export type Metric = { label: Text; before?: string; after: string };

export function MetricsEditor({ value, onChange }: { value: Metric[]; onChange: (v: Metric[]) => void }) {
  return (
    <div className="space-y-3">
      {value.map((m, i) => (
        <div key={i} className="rounded-[5px] border border-a-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[0.7rem] text-a-faint">Metric {i + 1}</span>
            <IconButton label="Remove metric" tone="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash className="size-4" aria-hidden />
            </IconButton>
          </div>
          <BilingualInput value={m.label} onChange={(label) => onChange(value.map((x, j) => (j === i ? { ...x, label } : x)))} placeholder={{ en: "Label, e.g. Monthly orders", ar: "الاسم" }} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input placeholder="Before (optional)" value={m.before ?? ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, before: e.target.value || undefined } : x)))} />
            <Input placeholder="After, e.g. 3.2x" value={m.after} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, after: e.target.value } : x)))} />
          </div>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus className="size-4" aria-hidden />} onClick={() => onChange([...value, { label: emptyText(), after: "" }])}>
        Add metric
      </Button>
    </div>
  );
}

const QUESTION_KINDS: { value: Question["kind"]; label: string }[] = [
  { value: "short", label: "Short answer" },
  { value: "long", label: "Paragraph" },
  { value: "url", label: "Link" },
  { value: "yesno", label: "Yes / No" },
  { value: "select", label: "Choice" },
];

export function QuestionBuilder({ value, onChange }: { value: Question[]; onChange: (v: Question[]) => void }) {
  const patch = (i: number, p: Partial<Question>) => onChange(value.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {value.length === 0 ? <p className="text-[0.82rem] text-a-muted">No extra questions. Applicants fill in the standard form only.</p> : null}
      {value.map((q, i) => (
        <div key={q.id} className="rounded-[5px] border border-a-line bg-a-raised p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.7rem] text-a-faint">Q{i + 1}</span>
            <Select
              aria-label="Answer type"
              className="!h-8 w-40"
              value={q.kind}
              onChange={(e) => {
                const kind = e.target.value as Question["kind"];
                patch(i, { kind, options: kind === "select" ? (q.options?.length ? q.options : [emptyText(), emptyText()]) : undefined });
              }}
            >
              {QUESTION_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-[0.8rem]">
              <input type="checkbox" checked={q.required} onChange={(e) => patch(i, { required: e.target.checked })} className="size-4 accent-[var(--color-signal)]" />
              Required
            </label>
            <div className="ms-auto flex">
              <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp className="size-3.5" aria-hidden />
              </IconButton>
              <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === value.length - 1}>
                <ArrowDown className="size-3.5" aria-hidden />
              </IconButton>
              <IconButton label="Remove question" tone="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash className="size-4" aria-hidden />
              </IconButton>
            </div>
          </div>
          <BilingualInput value={q.label} onChange={(label) => patch(i, { label })} placeholder={{ en: "Question", ar: "السؤال" }} />
          {q.kind === "select" ? (
            <div className="mt-3 border-s-2 border-a-line ps-3">
              <p className="mb-2 text-[0.75rem] font-semibold text-a-muted">Choices</p>
              <BilingualList value={q.options ?? []} onChange={(options) => patch(i, { options })} addLabel="Add choice" />
            </div>
          ) : null}
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        icon={<Plus className="size-4" aria-hidden />}
        onClick={() => onChange([...value, { id: `q${Date.now().toString(36)}`, label: emptyText(), kind: "short", required: false }])}
      >
        Add question
      </Button>
    </div>
  );
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function SlugInput({ id, value, onChange, source, prefix, invalid }: { id?: string; value: string; onChange: (v: string) => void; source: string; prefix: string; invalid?: boolean }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-[4px] border border-a-line-strong bg-a-surface focus-within:border-signal focus-within:ring-2 focus-within:ring-signal/25">
      <span className="hidden items-center bg-a-raised px-3 font-mono text-[0.75rem] text-a-faint sm:flex" dir="ltr">
        {prefix}
      </span>
      <input
        id={id}
        dir="ltr"
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(slugify(e.target.value) || e.target.value.toLowerCase())}
        className="h-9 min-w-0 flex-1 bg-transparent px-3 font-mono text-[0.82rem] text-a-text outline-none"
      />
      <button type="button" onClick={() => onChange(slugify(source))} className="cursor-pointer border-s border-a-line px-3 text-[0.75rem] font-semibold text-a-muted hover:bg-a-hover hover:text-a-text">
        From title
      </button>
    </div>
  );
}

export function DateInput({ id, value, onChange }: { id?: string; value?: number; onChange: (v: number | undefined) => void }) {
  const str = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <Input
      id={id}
      type="date"
      value={str}
      onChange={(e) => onChange(e.target.value ? new Date(`${e.target.value}T23:59:00`).getTime() : undefined)}
    />
  );
}

/** An ordered list of items with move up/down, remove and add. */
export function PairList<T>({
  items,
  onChange,
  make,
  render,
  addLabel,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  make: () => T;
  render: (item: T, update: (v: T) => void) => ReactNode;
  addLabel: string;
}) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-[5px] border border-a-line p-3">
          <span className="mt-2 w-5 font-mono text-[0.7rem] text-a-faint">{i + 1}</span>
          <div className="min-w-0 flex-1">{render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}</div>
          <div className="flex flex-col">
            <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="size-3.5" aria-hidden />
            </IconButton>
            <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
              <ArrowDown className="size-3.5" aria-hidden />
            </IconButton>
          </div>
          <IconButton label="Remove" tone="danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash className="size-4" aria-hidden />
          </IconButton>
        </div>
      ))}
      <Button size="sm" variant="ghost" icon={<Plus className="size-4" aria-hidden />} onClick={() => onChange([...items, make()])}>
        {addLabel}
      </Button>
    </div>
  );
}
