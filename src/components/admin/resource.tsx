"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@convex/_generated/api";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowSquareOut,
  Copy,
  DotsSixVertical,
  DotsThree,
  FloppyDisk,
  ImageSquare,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { FunctionReference } from "convex/server";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";
import type { ImagePreset } from "@/lib/image-compress";
import {
  BilingualInput,
  BilingualList,
  DateInput,
  ImageField,
  MetricsEditor,
  QuestionBuilder,
  SlugInput,
  StoredVideo,
  useStorageUrls,
} from "./fields";
import { Thumb } from "./media";
import { errorField, errorMessage, useAdminMutation, useAdminQuery } from "./session";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  LoadingRows,
  Menu,
  MenuItem,
  MenuSeparator,
  PageHeader,
  Panel,
  SearchInput,
  Segmented,
  Select,
  Switch,
  Textarea,
  useFeedback,
} from "./ui";

/* ------------------------------ Types ------------------------------ */

type Base = { name: string; label: string; hint?: string };
export type FieldDef =
  | (Base & { kind: "text"; required?: boolean; optional?: boolean; placeholder?: string; dir?: "ltr" | "rtl"; inputType?: string })
  | (Base & { kind: "textarea"; optional?: boolean; rows?: number })
  | (Base & { kind: "number"; optional?: boolean; min?: number })
  | (Base & { kind: "i18n"; required?: boolean; multiline?: boolean; rows?: number })
  | (Base & { kind: "i18nList"; addLabel?: string })
  | (Base & { kind: "select"; options: { value: string; label: string }[]; optional?: boolean })
  | (Base & { kind: "multiselect"; options: { value: string; label: string }[] })
  | (Base & { kind: "switch"; description?: string })
  | (Base & { kind: "image"; pathName: string; aspect?: string; preset?: ImagePreset })
  | (Base & { kind: "video" })
  | (Base & { kind: "slug"; source: string; prefix: string })
  | (Base & { kind: "reference"; source: "clients" })
  | (Base & { kind: "references"; source: "reels" })
  | (Base & { kind: "metrics" })
  | (Base & { kind: "questions" })
  | (Base & { kind: "date" });

export type Section = { title: string; description?: string; fields: FieldDef[]; aside?: boolean };

type Api = {
  list: FunctionReference<"query">;
  get: FunctionReference<"query">;
  create: FunctionReference<"mutation">;
  update: FunctionReference<"mutation">;
  remove: FunctionReference<"mutation">;
  reorder: FunctionReference<"mutation">;
  setPublished?: FunctionReference<"mutation">;
  duplicate?: FunctionReference<"mutation">;
};

export type Column = { label: string; className?: string; render: (doc: any) => ReactNode };

export type ResourceConfig = {
  singular: string;
  plural: string;
  description: string;
  basePath: string;
  api: Api;
  empty: () => Record<string, any>;
  sections: Section[];
  titleOf: (data: any) => string;
  subtitleOf?: (doc: any) => ReactNode;
  columns?: Column[];
  searchOf: (doc: any) => string;
  publishToggle?: boolean;
  view?: "table" | "grid";
  thumb?: (doc: any) => { storageId?: string; path?: string } | null;
  thumbAspect?: string;
  previewHref?: (doc: any) => string | null;
  rowMenu?: (doc: any) => ReactNode;
  headerExtra?: ReactNode;
};

/* ------------------------------ List ------------------------------- */

export function ResourceList({ config }: { config: ResourceConfig }) {
  const docs = useAdminQuery(config.api.list as any, {}) as any[] | undefined;
  const reorder = useAdminMutation(config.api.reorder as any, { refresh: true });
  const setPublished = useAdminMutation((config.api.setPublished ?? config.api.reorder) as any, { refresh: true });
  const remove = useAdminMutation(config.api.remove as any, { refresh: true });
  const duplicate = useAdminMutation((config.api.duplicate ?? config.api.reorder) as any, { refresh: true });
  const { confirm, toast } = useFeedback();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "live" | "hidden">("all");
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);

  const ordered = useMemo(() => {
    if (!docs) return undefined;
    if (!localOrder) return docs;
    const map = new Map(docs.map((d) => [d._id, d]));
    return localOrder.map((id) => map.get(id)).filter(Boolean) as any[];
  }, [docs, localOrder]);

  const filtered = useMemo(() => {
    if (!ordered) return undefined;
    const q = query.trim().toLowerCase();
    return ordered.filter((d) => {
      if (config.publishToggle && status !== "all" && (status === "live") !== !!d.published) return false;
      return !q || config.searchOf(d).toLowerCase().includes(q);
    });
  }, [ordered, query, status, config]);

  const thumbs = useStorageUrls((docs ?? []).map((d) => config.thumb?.(d)?.storageId));
  const dragEnabled = !query && status === "all";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    if (!ordered || !e.over || e.active.id === e.over.id) return;
    const ids = ordered.map((d) => d._id as string);
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    setLocalOrder(next);
    try {
      await reorder({ ids: next } as any);
      toast("Order saved");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setLocalOrder(null);
    }
  }

  async function onDelete(doc: any) {
    const ok = await confirm({
      title: `Delete “${config.titleOf(doc)}”?`,
      body: "This can't be undone. It disappears from the website right away.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove({ id: doc._id } as any);
      toast(`${config.singular} deleted`);
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  const live = docs?.filter((d) => d.published).length ?? 0;

  return (
    <div>
      <PageHeader
        title={config.plural}
        description={config.description}
        actions={
          <>
            {config.headerExtra}
            <Button variant="primary" icon={<Plus className="size-4" weight="bold" aria-hidden />} onClick={() => router.push(`${config.basePath}/new`)}>
              New {config.singular.toLowerCase()}
            </Button>
          </>
        }
      />
      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-a-line p-3">
          <SearchInput value={query} onChange={setQuery} placeholder={`Search ${config.plural.toLowerCase()}`} className="w-full max-w-xs" />
          {config.publishToggle ? (
            <Segmented
              label="Visibility"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All", count: docs?.length },
                { value: "live", label: "On site", count: live },
                { value: "hidden", label: "Hidden", count: (docs?.length ?? 0) - live },
              ]}
            />
          ) : null}
          <p className="ms-auto hidden text-[0.78rem] text-a-faint md:block">
            {dragEnabled ? "Drag the handle to change the order on the website." : "Clear filters to reorder."}
          </p>
        </div>

        {filtered === undefined ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ImageSquare className="size-6" aria-hidden />}
            title={docs?.length ? "Nothing matches" : `No ${config.plural.toLowerCase()} yet`}
            body={docs?.length ? "Try a different search or filter." : `Add the first one and it shows up on the website.`}
            action={
              docs?.length ? null : (
                <Button variant="primary" onClick={() => router.push(`${config.basePath}/new`)}>
                  New {config.singular.toLowerCase()}
                </Button>
              )
            }
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={filtered.map((d) => d._id)} strategy={config.view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
              {config.view === "grid" ? (
                <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-5">
                  {filtered.map((doc) => (
                    <SortableItem key={doc._id} id={doc._id} disabled={!dragEnabled} as="li">
                      {(handle) => (
                        <GridCard
                          doc={doc}
                          config={config}
                          handle={handle}
                          thumbUrl={thumbUrl(config, doc, thumbs)}
                          onToggle={(v) => setPublished({ id: doc._id, published: v } as any).catch((e) => toast(errorMessage(e), "error"))}
                          menu={<RowMenu doc={doc} config={config} onDelete={onDelete} onDuplicate={duplicate} />}
                        />
                      )}
                    </SortableItem>
                  ))}
                </ul>
              ) : (
                <ul role="list" className="divide-y divide-a-line">
                  {filtered.map((doc) => (
                    <SortableItem key={doc._id} id={doc._id} disabled={!dragEnabled} as="li">
                      {(handle) => (
                        <Row
                          doc={doc}
                          config={config}
                          handle={handle}
                          thumbUrl={thumbUrl(config, doc, thumbs)}
                          onToggle={(v) => setPublished({ id: doc._id, published: v } as any).catch((e) => toast(errorMessage(e), "error"))}
                          menu={<RowMenu doc={doc} config={config} onDelete={onDelete} onDuplicate={duplicate} />}
                        />
                      )}
                    </SortableItem>
                  ))}
                </ul>
              )}
            </SortableContext>
          </DndContext>
        )}
      </Panel>
    </div>
  );
}

function thumbUrl(config: ResourceConfig, doc: any, urls: Record<string, string | null>) {
  const t = config.thumb?.(doc);
  if (!t) return null;
  return (t.storageId && urls[t.storageId]) || t.path || null;
}

type Handle = { attributes: any; listeners: any; disabled: boolean };

function SortableItem({ id, disabled, as: Tag, children }: { id: string; disabled: boolean; as: "li"; children: (h: Handle) => ReactNode }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <Tag
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative bg-a-surface", isDragging && "z-10 shadow-xl ring-1 ring-signal")}
    >
      {children({ attributes, listeners, disabled })}
    </Tag>
  );
}

function DragHandle({ handle }: { handle: Handle }) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      disabled={handle.disabled}
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-[4px] text-a-faint hover:bg-a-hover hover:text-a-text active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
      {...handle.attributes}
      {...handle.listeners}
    >
      <DotsSixVertical className="size-4" weight="bold" aria-hidden />
    </button>
  );
}

function Row({
  doc,
  config,
  handle,
  thumbUrl,
  onToggle,
  menu,
}: {
  doc: any;
  config: ResourceConfig;
  handle: Handle;
  thumbUrl: string | null;
  onToggle: (v: boolean) => void;
  menu: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <DragHandle handle={handle} />
      {config.thumb ? (
        <span className={cn("relative w-11 shrink-0 overflow-hidden rounded-[4px] border border-a-line bg-a-hover", config.thumbAspect ?? "aspect-square")}>
          {thumbUrl ? <Thumb src={thumbUrl} sizes="48px" /> : null}
        </span>
      ) : null}
      <Link href={`${config.basePath}/${doc._id}`} className="min-w-0 flex-1 rounded-[3px] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-signal">
        <span className="block truncate text-[0.88rem] font-semibold text-a-text">{config.titleOf(doc) || "Untitled"}</span>
        {config.subtitleOf ? <span className="block truncate text-[0.78rem] text-a-muted">{config.subtitleOf(doc)}</span> : null}
      </Link>
      {config.columns?.map((c) => (
        <div key={c.label} className={cn("hidden shrink-0 md:block", c.className)}>
          {c.render(doc)}
        </div>
      ))}
      {config.publishToggle ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[0.75rem] text-a-muted sm:inline">{doc.published ? "On site" : "Hidden"}</span>
          <Switch checked={!!doc.published} onCheckedChange={onToggle} label={undefined} />
        </div>
      ) : null}
      {menu}
    </div>
  );
}

function GridCard({
  doc,
  config,
  handle,
  thumbUrl,
  onToggle,
  menu,
}: {
  doc: any;
  config: ResourceConfig;
  handle: Handle;
  thumbUrl: string | null;
  onToggle: (v: boolean) => void;
  menu: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-a-line">
      <Link href={`${config.basePath}/${doc._id}`} className={cn("relative block overflow-hidden bg-a-hover", config.thumbAspect ?? "aspect-[9/16]")}>
        {thumbUrl ? <Thumb src={thumbUrl} sizes="(min-width: 1024px) 200px, 45vw" /> : null}
        {!doc.published ? (
          <span className="absolute start-2 top-2">
            <Badge tone="neutral">Hidden</Badge>
          </span>
        ) : null}
      </Link>
      <div className="flex items-center gap-1 p-2">
        <DragHandle handle={handle} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8rem] font-semibold">{config.titleOf(doc) || "Untitled"}</p>
          {config.subtitleOf ? <p className="truncate text-[0.72rem] text-a-muted">{config.subtitleOf(doc)}</p> : null}
        </div>
        {config.publishToggle ? <Switch checked={!!doc.published} onCheckedChange={onToggle} /> : null}
        {menu}
      </div>
    </div>
  );
}

function RowMenu({
  doc,
  config,
  onDelete,
  onDuplicate,
}: {
  doc: any;
  config: ResourceConfig;
  onDelete: (doc: any) => void;
  onDuplicate: (args: any) => Promise<any>;
}) {
  const router = useRouter();
  const { toast } = useFeedback();
  const href = config.previewHref?.(doc);
  return (
    <Menu
      trigger={
        <IconButton label={`Actions for ${config.titleOf(doc)}`}>
          <DotsThree className="size-5" weight="bold" aria-hidden />
        </IconButton>
      }
    >
      <MenuItem icon={<PencilSimple className="size-4" aria-hidden />} onSelect={() => router.push(`${config.basePath}/${doc._id}`)}>
        Edit
      </MenuItem>
      {config.rowMenu?.(doc)}
      {config.api.duplicate ? (
        <MenuItem
          icon={<Copy className="size-4" aria-hidden />}
          onSelect={async () => {
            try {
              const id = await onDuplicate({ id: doc._id });
              toast("Copy created (hidden until you publish it)");
              if (id) router.push(`${config.basePath}/${id}`);
            } catch (err) {
              toast(errorMessage(err), "error");
            }
          }}
        >
          Duplicate
        </MenuItem>
      ) : null}
      {href ? (
        <MenuItem icon={<ArrowSquareOut className="size-4" aria-hidden />} onSelect={() => window.open(href, "_blank", "noopener")}>
          View on site
        </MenuItem>
      ) : null}
      <MenuSeparator />
      <MenuItem icon={<Trash className="size-4" aria-hidden />} tone="danger" onSelect={() => onDelete(doc)}>
        Delete
      </MenuItem>
    </Menu>
  );
}

/* ------------------------------ Editor ----------------------------- */

const isBlank = (v: unknown) => v === undefined || v === null || v === "" || (typeof v === "number" && Number.isNaN(v));

function buildPayload(config: ResourceConfig, data: Record<string, any>) {
  const keys = new Set<string>(Object.keys(config.empty()));
  for (const s of config.sections) for (const f of s.fields) {
    keys.add(f.name);
    if (f.kind === "image") keys.add(f.pathName);
  }
  const out: Record<string, any> = {};
  for (const key of keys) {
    const v = data[key];
    if (isBlank(v)) continue;
    out[key] = typeof v === "string" ? v.trim() : v;
  }
  // Required plain strings must still be sent, even if empty, so the server can explain what's missing.
  for (const s of config.sections) for (const f of s.fields) {
    if ((f.kind === "text" || f.kind === "slug") && !(f.kind === "text" && f.optional) && out[f.name] === undefined) out[f.name] = "";
  }
  return out;
}

function validateRequired(config: ResourceConfig, data: Record<string, any>) {
  const errors: Record<string, string> = {};
  for (const s of config.sections) for (const f of s.fields) {
    if (f.kind === "i18n" && f.required && !data[f.name]?.en?.trim() && !data[f.name]?.ar?.trim()) errors[f.name] = "Fill in at least one language.";
    if (f.kind === "text" && f.required && !String(data[f.name] ?? "").trim()) errors[f.name] = `${f.label} is required.`;
    if (f.kind === "slug" && !String(data[f.name] ?? "").trim()) errors[f.name] = "Add a URL slug.";
  }
  return errors;
}

export function ResourceEditor({ config, id }: { config: ResourceConfig; id: string }) {
  const isNew = id === "new";
  const doc = useAdminQuery(config.api.get as any, isNew ? "skip" : { id }) as any;
  const create = useAdminMutation(config.api.create as any, { refresh: true });
  const update = useAdminMutation(config.api.update as any, { refresh: true });
  const remove = useAdminMutation(config.api.remove as any, { refresh: true });
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [data, setData] = useState<Record<string, any> | null>(() => (isNew ? config.empty() : null));
  const [baseline, setBaseline] = useState<string>(() => (isNew ? JSON.stringify(config.empty()) : ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isNew && doc && loadedFor.current !== doc._id) {
      loadedFor.current = doc._id;
      const initial = { ...config.empty() };
      for (const key of Object.keys(doc)) if (!key.startsWith("_") && key !== "order") initial[key] = doc[key];
      setData(initial);
      setBaseline(JSON.stringify(initial));
    }
  }, [doc, isNew, config]);

  const dirty = data !== null && JSON.stringify(data) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (!isNew && doc === null) {
    return (
      <Panel>
        <EmptyState
          title={`This ${config.singular.toLowerCase()} no longer exists`}
          body="It may have been deleted by someone else."
          action={
            <Button onClick={() => router.push(config.basePath)} icon={<ArrowLeft className="size-4" aria-hidden />}>
              Back to {config.plural.toLowerCase()}
            </Button>
          }
        />
      </Panel>
    );
  }
  if (!data) return <LoadingRows rows={8} />;

  const set = (name: string, value: any) => {
    setData((d) => ({ ...(d ?? {}), [name]: value }));
    if (errors[name]) setErrors(({ [name]: _, ...rest }) => rest);
  };

  async function save() {
    if (!data) return;
    const found = validateRequired(config, data);
    setErrors(found);
    if (Object.keys(found).length) {
      toast("Some fields need attention.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(config, data);
      if (isNew) {
        const newId = await create({ data: payload } as any);
        setBaseline(JSON.stringify(data));
        toast(`${config.singular} created`);
        router.replace(`${config.basePath}/${newId}`);
      } else {
        await update({ id, data: payload } as any);
        setBaseline(JSON.stringify(data));
        toast("Changes saved — the website updates in a moment");
      }
    } catch (err) {
      const field = errorField(err);
      if (field) setErrors({ [field]: errorMessage(err) });
      toast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: `Delete this ${config.singular.toLowerCase()}?`,
      body: "This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await remove({ id } as any);
      toast(`${config.singular} deleted`);
      router.push(config.basePath);
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  const main = config.sections.filter((s) => !s.aside);
  const aside = config.sections.filter((s) => s.aside);
  const preview = !isNew && doc ? config.previewHref?.(doc) : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="sticky top-14 z-10 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-a-line bg-a-bg/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <IconButton label={`Back to ${config.plural.toLowerCase()}`} onClick={() => router.push(config.basePath)}>
          <ArrowLeft className="size-4" aria-hidden />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-a-faint">{isNew ? `New ${config.singular.toLowerCase()}` : config.singular}</p>
          <h1 className="a-heading truncate text-[1.25rem]">{config.titleOf(data) || "Untitled"}</h1>
        </div>
        {dirty ? <Badge tone="warn" dot>Unsaved changes</Badge> : !isNew ? <Badge tone="ok" dot>Saved</Badge> : null}
        {preview ? (
          <a href={preview} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[4px] px-3 text-[0.84rem] font-semibold text-a-muted hover:bg-a-hover hover:text-a-text">
            View <ArrowSquareOut className="size-4" aria-hidden />
          </a>
        ) : null}
        {!isNew ? (
          <Button variant="ghost" className="text-a-danger" icon={<Trash className="size-4" aria-hidden />} onClick={onDelete}>
            Delete
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={saving} icon={<FloppyDisk className="size-4" aria-hidden />} disabled={!dirty && !isNew}>
          {isNew ? `Create ${config.singular.toLowerCase()}` : "Save changes"}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {main.map((s) => (
            <SectionPanel key={s.title} section={s} data={data} set={set} errors={errors} />
          ))}
        </div>
        {aside.length ? (
          <div className="space-y-6">
            {aside.map((s) => (
              <SectionPanel key={s.title} section={s} data={data} set={set} errors={errors} />
            ))}
          </div>
        ) : null}
      </div>
    </form>
  );
}

function SectionPanel({
  section,
  data,
  set,
  errors,
}: {
  section: Section;
  data: Record<string, any>;
  set: (name: string, value: any) => void;
  errors: Record<string, string>;
}) {
  return (
    <Panel title={section.title} description={section.description}>
      <div className="space-y-5">
        {section.fields.map((f) => (
          <FieldControl key={f.name} field={f} data={data} set={set} error={errors[f.name]} />
        ))}
      </div>
    </Panel>
  );
}

export function FieldControl({
  field: f,
  data,
  set,
  error,
}: {
  field: FieldDef;
  data: Record<string, any>;
  set: (name: string, value: any) => void;
  error?: string;
}) {
  const id = `f-${f.name}`;
  const value = data[f.name];
  switch (f.kind) {
    case "text":
      return (
        <Field label={f.label} htmlFor={id} hint={f.hint} error={error} required={f.required}>
          <Input id={id} type={f.inputType ?? "text"} dir={f.dir} value={value ?? ""} placeholder={f.placeholder} aria-invalid={!!error || undefined} onChange={(e) => set(f.name, e.target.value)} />
        </Field>
      );
    case "textarea":
      return (
        <Field label={f.label} htmlFor={id} hint={f.hint} error={error}>
          <Textarea id={id} rows={f.rows ?? 4} value={value ?? ""} onChange={(e) => set(f.name, e.target.value)} />
        </Field>
      );
    case "number":
      return (
        <Field label={f.label} htmlFor={id} hint={f.hint} error={error}>
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={f.min}
            value={value ?? ""}
            onChange={(e) => set(f.name, e.target.value === "" ? undefined : Number(e.target.value))}
            className="max-w-48 tabular"
          />
        </Field>
      );
    case "i18n":
      return (
        <Field label={f.label} htmlFor={id} hint={f.hint} error={error} required={f.required}>
          <BilingualInput id={id} value={value ?? { en: "", ar: "" }} onChange={(v) => set(f.name, v)} multiline={f.multiline} rows={f.rows} invalid={!!error} />
        </Field>
      );
    case "i18nList":
      return (
        <Field label={f.label} hint={f.hint} error={error}>
          <BilingualList value={value ?? []} onChange={(v) => set(f.name, v)} addLabel={f.addLabel} />
        </Field>
      );
    case "select":
      return (
        <Field label={f.label} htmlFor={id} hint={f.hint} error={error}>
          <Select id={id} value={value ?? ""} onChange={(e) => set(f.name, e.target.value || undefined)}>
            {f.optional ? <option value="">—</option> : null}
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      );
    case "multiselect":
      return (
        <Field label={f.label} hint={f.hint} error={error}>
          <div className="flex flex-wrap gap-2">
            {f.options.map((o) => {
              const checked = (value ?? []).includes(o.value);
              return (
                <label key={o.value} className={cn("inline-flex h-8 cursor-pointer items-center gap-2 rounded-[4px] border px-3 text-[0.8rem] font-medium", checked ? "border-signal bg-a-accent-soft" : "border-a-line-strong")}>
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--color-signal)]"
                    checked={checked}
                    onChange={() => set(f.name, checked ? value.filter((x: string) => x !== o.value) : [...(value ?? []), o.value])}
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        </Field>
      );
    case "switch":
      return <Switch checked={!!value} onCheckedChange={(v) => set(f.name, v)} label={f.label} description={f.description ?? f.hint} />;
    case "image":
      return (
        <Field label={f.label} hint={undefined} error={error}>
          <ImageField
            storageId={value}
            path={data[f.pathName]}
            aspect={f.aspect}
            hint={f.hint}
            preset={f.preset}
            onChange={(next) => {
              set(f.name, next.storageId);
              set(f.pathName, next.path);
            }}
          />
        </Field>
      );
    case "video":
      // Only reels saved by an earlier version can still have a stored file; show it so it can be removed.
      return value ? (
        <Field label={f.label} hint={f.hint} error={error}>
          <StoredVideo storageId={value} onRemove={() => set(f.name, undefined)} />
        </Field>
      ) : null;
    case "slug":
      return (
        <Field label={f.label} htmlFor={id} hint={f.hint} error={error} required>
          <SlugInput id={id} value={value ?? ""} onChange={(v) => set(f.name, v)} source={data[f.source]?.en ?? ""} prefix={f.prefix} invalid={!!error} />
        </Field>
      );
    case "reference":
      return <ClientReference field={f} value={value} onChange={(v) => set(f.name, v)} error={error} />;
    case "references":
      return <ReelReferences field={f} value={value ?? []} onChange={(v) => set(f.name, v)} />;
    case "metrics":
      return (
        <Field label={f.label} hint={f.hint}>
          <MetricsEditor value={value ?? []} onChange={(v) => set(f.name, v)} />
        </Field>
      );
    case "questions":
      return (
        <Field label={f.label} hint={f.hint}>
          <QuestionBuilder value={value ?? []} onChange={(v) => set(f.name, v)} />
        </Field>
      );
    case "date":
      return (
        <Field label={f.label} htmlFor={id} hint={f.hint} error={error}>
          <DateInput id={id} value={value} onChange={(v) => set(f.name, v)} />
        </Field>
      );
  }
}

function ClientReference({ field, value, onChange, error }: { field: FieldDef; value?: string; onChange: (v?: string) => void; error?: string }) {
  const clients = useAdminQuery(api.clients.list, {});
  return (
    <Field label={field.label} htmlFor={`f-${field.name}`} hint={field.hint} error={error}>
      <Select id={`f-${field.name}`} value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">— SCALE ADV (own content) —</option>
        {(clients ?? []).map((c) => (
          <option key={c._id} value={c._id}>
            {c.name.en || c.name.ar}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function ReelReferences({ field, value, onChange }: { field: FieldDef; value: string[]; onChange: (v: string[]) => void }) {
  const reels = useAdminQuery(api.reels.list, {});
  const urls = useStorageUrls((reels ?? []).map((r) => r.poster));
  return (
    <Field label={field.label} hint={field.hint}>
      {reels === undefined ? (
        <LoadingRows rows={2} />
      ) : reels.length === 0 ? (
        <p className="text-[0.82rem] text-a-muted">No reels yet. Add some under Reels first.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {reels.map((r) => {
            const checked = value.includes(r._id);
            const src = (r.poster && urls[r.poster]) || r.posterPath;
            return (
              <li key={r._id}>
                <label className={cn("block cursor-pointer overflow-hidden rounded-[4px] border-2", checked ? "border-signal" : "border-transparent")}>
                  <span className="relative block aspect-[9/16] bg-a-hover">
                    {src ? <Thumb src={src} sizes="120px" /> : null}
                    <input
                      type="checkbox"
                      className="absolute start-1.5 top-1.5 size-4 accent-[var(--color-signal)]"
                      checked={checked}
                      onChange={() => onChange(checked ? value.filter((x) => x !== r._id) : [...value, r._id])}
                      aria-label={r.title.en || r.title.ar}
                    />
                  </span>
                  <span className="block truncate px-1 py-1 text-[0.7rem]">{r.title.en || r.title.ar}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Field>
  );
}
