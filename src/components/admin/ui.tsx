"use client";

import { CheckCircle, CircleNotch, Info, MagnifyingGlass, WarningCircle, X } from "@phosphor-icons/react";
import { Dialog, DropdownMenu, Switch as RadixSwitch, Tabs as RadixTabs, Tooltip as RadixTooltip } from "radix-ui";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/format";

/* ------------------------------ Buttons ----------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ink";
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-signal text-ink-950 hover:bg-signal-300 border border-transparent",
  ink: "bg-a-text text-a-surface hover:opacity-90 border border-transparent",
  secondary: "bg-a-surface text-a-text border border-a-line-strong hover:bg-a-hover",
  ghost: "text-a-text hover:bg-a-hover border border-transparent",
  danger: "bg-a-danger text-white hover:opacity-90 border border-transparent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[4px] font-semibold transition-[background-color,opacity,border-color] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[0.8rem]" : "h-9 px-3.5 text-[0.85rem]",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <CircleNotch className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "default" | "danger" }>(
  function IconButton({ label, tone = "default", className, children, type = "button", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-a-muted transition-colors hover:bg-a-hover hover:text-a-text disabled:cursor-not-allowed disabled:opacity-40",
          tone === "danger" && "hover:text-a-danger",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

/* ------------------------------- Inputs ------------------------------ */

const control =
  "w-full rounded-[4px] border border-a-line-strong bg-a-surface px-3 text-[0.875rem] text-a-text placeholder:text-a-faint transition-[border-color,box-shadow] hover:border-a-faint focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/25 aria-[invalid=true]:border-a-danger disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(control, "h-9", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(control, "py-2 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        control,
        "h-9 cursor-pointer appearance-none bg-[length:10px] bg-[right_0.75rem_center] bg-no-repeat pe-8",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23857f77' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  aside,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[0.8rem] font-semibold text-a-text">
          {label}
          {required ? <span className="text-a-danger"> *</span> : null}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.78rem] text-a-danger" role="alert">
          <WarningCircle className="size-3.5 shrink-0" weight="fill" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.78rem] leading-snug text-a-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}) {
  const control = (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label && !description ? undefined : label}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-a-line-strong transition-colors data-[state=checked]:bg-signal disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RadixSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] rtl:data-[state=checked]:-translate-x-[18px]" />
    </RadixSwitch.Root>
  );
  if (!label) return control;
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="mt-0.5">{control}</span>
      <span>
        <span className="block text-[0.85rem] font-semibold text-a-text">{label}</span>
        {description ? <span className="block text-[0.78rem] text-a-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  className,
  delay = 250,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
}) {
  const [local, setLocal] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setLocal(value);
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, delay);
    return () => clearTimeout(t);
  }, [local, value, onChange, delay]);
  return (
    <div className={cn("relative", className)}>
      <MagnifyingGlass className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-a-faint" aria-hidden />
      <Input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="ps-9"
      />
    </div>
  );
}

/* ----------------------------- Display ----------------------------- */

export type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-a-hover text-a-muted",
  accent: "bg-a-accent-soft text-signal-600 dark:text-signal",
  ok: "bg-a-ok-soft text-a-ok",
  warn: "bg-a-warn-soft text-a-warn",
  danger: "bg-a-danger-soft text-a-danger",
  info: "bg-a-info-soft text-a-info",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-[3px] px-1.5 text-[0.72rem] font-semibold", tones[tone], className)}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-[6px] border border-a-line bg-a-surface", className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-a-line px-5 py-4">
          <div>
            {title ? <h2 className="a-heading text-[0.98rem] text-a-text">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-[0.8rem] text-a-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={padded ? "p-5" : undefined}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
        <h1 className="a-heading text-[1.6rem] leading-tight text-a-text">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[0.875rem] text-a-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-full bg-a-hover text-a-muted">{icon}</div> : null}
      <p className="text-[0.95rem] font-semibold text-a-text">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-[0.85rem] text-a-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[4px] bg-a-hover", className)} aria-hidden />;
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

const avatarHues = ["#e9470d", "#2a78d6", "#1d7347", "#6250d6", "#9a5b06", "#c2261b"];
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const hue = avatarHues[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % avatarHues.length];
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: hue, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] border border-a-line-strong bg-a-raised px-1 font-mono text-[0.68rem] text-a-muted">
      {children}
    </kbd>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-[5px] border border-a-line bg-a-raised p-1 scrollbar-thin">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-[3px] px-2.5 text-[0.8rem] font-semibold transition-colors",
            value === o.value ? "bg-a-surface text-a-text shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-a-line" : "text-a-muted hover:text-a-text",
          )}
        >
          {o.label}
          {o.count !== undefined ? <span className="font-mono text-[0.7rem] tabular text-a-faint">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <RadixTooltip.Root delayDuration={250}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="z-[80] max-w-xs rounded-[4px] bg-ink-950 px-2 py-1 text-[0.75rem] text-chalk shadow-lg"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export const TooltipProvider = RadixTooltip.Provider;

/* ------------------------------ Tabs ------------------------------- */

export function Tabs({
  value,
  onValueChange,
  tabs,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  tabs: { value: string; label: ReactNode }[];
  children: ReactNode;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List className="mb-5 flex gap-1 overflow-x-auto border-b border-a-line scrollbar-thin">
        {tabs.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className="relative h-10 shrink-0 cursor-pointer px-3 text-[0.85rem] font-semibold text-a-muted transition-colors hover:text-a-text data-[state=active]:text-a-text data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:bg-signal"
          >
            {t.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}
export const TabPanel = RadixTabs.Content;

/* ----------------------------- Menus ------------------------------ */

export function Menu({ trigger, children, align = "end" }: { trigger: ReactNode; children: ReactNode; align?: "start" | "end" }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className="admin-portal z-[70] min-w-44 rounded-[6px] border border-a-line bg-a-surface p-1 text-a-text shadow-[0_8px_30px_rgb(0_0_0/0.12)]"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function MenuItem({
  children,
  onSelect,
  icon,
  tone = "default",
  disabled,
}: {
  children: ReactNode;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex h-8 cursor-pointer select-none items-center gap-2 rounded-[4px] px-2 text-[0.84rem] outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-a-hover",
        tone === "danger" && "text-a-danger",
      )}
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}
export const MenuSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-a-line" />;

/* ----------------------------- Dialogs ----------------------------- */

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/45 data-[state=open]:animate-[fade_.15s_ease-out]" />
        <Dialog.Content
          className={cn(
            "admin-portal fixed left-1/2 top-[8vh] z-[61] flex max-h-[84vh] w-[calc(100vw-2rem)] -translate-x-1/2 flex-col rounded-[8px] border border-a-line bg-a-surface text-a-text shadow-2xl outline-none data-[state=open]:animate-[pop_.18s_var(--ease-out-quart)]",
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-a-line px-5 py-4">
            <div>
              <Dialog.Title className="a-heading text-[1.05rem]">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[0.82rem] text-a-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close">
                <X className="size-4" aria-hidden />
              </IconButton>
            </Dialog.Close>
          </div>
          {children ? <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">{children}</div> : null}
          {footer ? <div className="flex items-center justify-end gap-2 border-t border-a-line px-5 py-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  headerExtra,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/35 data-[state=open]:animate-[fade_.15s_ease-out]" />
        <Dialog.Content className="admin-portal fixed inset-y-0 end-0 z-[61] flex w-full max-w-xl flex-col border-s border-a-line bg-a-surface text-a-text shadow-2xl outline-none data-[state=open]:animate-[slide-in_.22s_var(--ease-out-quart)]">
          <div className="flex items-start justify-between gap-3 border-b border-a-line px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="a-heading truncate text-[1.1rem]">{title}</Dialog.Title>
              <Dialog.Description className="sr-only">{title}</Dialog.Description>
              {headerExtra}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close">
                <X className="size-4" aria-hidden />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</div>
          {footer ? <div className="flex items-center justify-between gap-2 border-t border-a-line px-5 py-3">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ----------------------- Confirm + Toast hooks ---------------------- */

type ConfirmOptions = { title: string; body?: string; confirmLabel?: string; tone?: "danger" | "default" };
type Toast = { id: number; tone: "ok" | "error" | "info"; message: string; action?: { label: string; run: () => void } };

const FeedbackContext = createContext<{
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, tone?: Toast["tone"], action?: Toast["action"]) => void;
} | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);
  const toast = useCallback((message: string, tone: Toast["tone"] = "ok", action?: Toast["action"]) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-3), { id, tone, message, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6500 : 4000);
  }, []);

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}
      <Modal
        open={!!pending}
        onOpenChange={(o) => !o && close(false)}
        title={pending?.title ?? ""}
        description={pending?.body}
        size="sm"
        footer={
          <>
            <Button onClick={() => close(false)}>Cancel</Button>
            <Button variant={pending?.tone === "danger" ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
              {pending?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      />
      <div className="pointer-events-none fixed bottom-4 end-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-[6px] border border-a-line bg-a-surface px-4 py-3 text-[0.85rem] text-a-text shadow-[0_10px_30px_rgb(0_0_0/0.15)] animate-[pop_.2s_var(--ease-out-quart)]"
          >
            {t.tone === "ok" ? (
              <CheckCircle className="size-5 shrink-0 text-a-ok" weight="fill" aria-hidden />
            ) : t.tone === "error" ? (
              <WarningCircle className="size-5 shrink-0 text-a-danger" weight="fill" aria-hidden />
            ) : (
              <Info className="size-5 shrink-0 text-a-info" weight="fill" aria-hidden />
            )}
            <span className="flex-1">{t.message}</span>
            {t.action ? (
              <button
                type="button"
                className="cursor-pointer font-semibold text-signal-600 hover:underline dark:text-signal"
                onClick={() => {
                  t.action?.run();
                  setToasts((all) => all.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside FeedbackProvider");
  return ctx;
}

/* ----------------------------- Misc ------------------------------- */

export function StarRating({ value, onChange, size = 18 }: { value: number | null; onChange?: (v: number | null) => void; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? "radiogroup" : "img"} aria-label={`Rating ${value ?? 0} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (value ?? 0) >= n;
        const star = (
          <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={filled ? "text-signal" : "text-a-line-strong"}>
            <path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" />
          </svg>
        );
        if (!onChange) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="cursor-pointer rounded-[3px] p-0.5 transition-transform hover:scale-110"
            onClick={() => onChange(value === n ? null : n)}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

export function TagInput({ value, onChange, placeholder = "Add tag" }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().toLowerCase();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-[4px] border border-a-line-strong bg-a-surface p-1.5 focus-within:border-signal focus-within:ring-2 focus-within:ring-signal/25">
      {value.map((t) => (
        <span key={t} className="inline-flex h-6 items-center gap-1 rounded-[3px] bg-a-hover ps-2 pe-1 text-[0.78rem] font-medium">
          {t}
          <button type="button" aria-label={`Remove ${t}`} className="grid size-4 cursor-pointer place-items-center rounded-[2px] hover:bg-a-line" onClick={() => onChange(value.filter((x) => x !== t))}>
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        aria-label={placeholder}
        className="h-6 min-w-24 flex-1 bg-transparent px-1 text-[0.85rem] text-a-text outline-none placeholder:text-a-faint"
      />
    </div>
  );
}
