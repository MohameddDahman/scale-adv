"use client";

import { api } from "@convex/_generated/api";
import {
  ArrowSquareOut,
  Bell,
  CaretUpDown,
  List,
  MagnifyingGlass,
  Moon,
  Plus,
  SignOut,
  Sun,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Wordmark } from "@/components/site/Wordmark";
import { cn } from "@/lib/format";
import { NAV, ROLE_LABEL, type NavItem } from "./nav";
import { useAdminQuery, useSession } from "./session";
import { Avatar, FeedbackProvider, Kbd, Menu, MenuItem, MenuSeparator, TooltipProvider } from "./ui";

/* ---------------------------- Theme ----------------------------- */

const THEME_KEY = "scale.admin.theme";
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const readTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light") as "light" | "dark";

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);
  const toggle = useCallback(() => {
    const next = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }, []);
  return { theme, toggle };
}

/* ---------------------------- Gate ------------------------------ */

export function AdminGate({ children }: { children: ReactNode }) {
  const { token, me } = useSession();
  const setup = useQuery(api.users.setupStatus, token === null ? {} : "skip");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (token === null && setup) {
      router.replace(setup.needsSetup ? "/admin/setup" : `/admin/login?next=${encodeURIComponent(pathname ?? "/admin")}`);
    }
  }, [token, setup, router, pathname]);

  if (!token || !me) return <FullScreenLoader />;
  return (
    <TooltipProvider>
      <FeedbackProvider>
        <Shell>{children}</Shell>
      </FeedbackProvider>
    </TooltipProvider>
  );
}

export function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-a-bg" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col items-center gap-5">
        <span className="text-[2rem]">
          <Wordmark />
        </span>
        <span className="h-0.5 w-28 overflow-hidden bg-a-line">
          <span className="block h-full w-1/3 animate-[loader_1s_ease-in-out_infinite] bg-signal" />
        </span>
      </div>
    </div>
  );
}

/* ---------------------------- Shell ----------------------------- */

function Shell({ children }: { children: ReactNode }) {
  const { me, can } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const badges = useAdminQuery(api.dashboard.badges, {});
  const pathname = usePathname() ?? "/admin";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(
    () => NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) })).filter((g) => g.items.length),
    [can],
  );
  const totalNew = (badges?.newLeads ?? 0) + (badges?.newApplications ?? 0);

  const sidebar = <Sidebar groups={groups} pathname={pathname} badges={badges ?? undefined} onNavigate={() => setMobileOpen(false)} />;

  return (
    <div className="min-h-dvh bg-a-bg text-a-text">
      <a href="#admin-main" className="fixed start-3 top-3 z-[100] -translate-y-20 rounded bg-signal px-3 py-2 font-semibold text-ink-950 focus:translate-y-0">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[15.5rem] lg:block">{sidebar}</aside>

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 start-0 z-50 w-[16.5rem] outline-none lg:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Dashboard sections</Dialog.Description>
            {sidebar}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="lg:ps-[15.5rem]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-a-line bg-a-bg/90 px-4 backdrop-blur-md md:px-6">
          <button
            type="button"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[4px] hover:bg-a-hover lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <List className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full max-w-sm cursor-pointer items-center gap-2 rounded-[4px] border border-a-line bg-a-surface px-3 text-[0.84rem] text-a-faint transition-colors hover:border-a-line-strong"
          >
            <MagnifyingGlass className="size-4" aria-hidden />
            <span className="flex-1 text-start">Jump to…</span>
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <div className="ms-auto flex items-center gap-1">
            <Notifications badges={badges ?? undefined} total={totalNew} />
            <ThemeButton />
            <Link
              href="/en"
              target="_blank"
              className="hidden h-9 items-center gap-2 rounded-[4px] px-3 text-[0.84rem] font-semibold text-a-muted hover:bg-a-hover hover:text-a-text sm:inline-flex"
            >
              View site
              <ArrowSquareOut className="size-4" aria-hidden />
            </Link>
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-[90rem] px-4 py-6 outline-none md:px-8 md:py-8">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} groups={groups} />
      <span className="sr-only" aria-live="polite">
        {me ? `Signed in as ${me.name}` : ""}
      </span>
    </div>
  );
}

function Sidebar({
  groups,
  pathname,
  badges,
  onNavigate,
}: {
  groups: { group: string | null; items: NavItem[] }[];
  pathname: string;
  badges?: { newLeads: number; newApplications: number };
  onNavigate?: () => void;
}) {
  const { me, signOut } = useSession();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="flex h-full flex-col bg-ink-950 text-chalk" style={{ colorScheme: "dark" }}>
      <div className="flex h-14 items-center px-5">
        <Link href="/admin" className="text-[1.45rem]" aria-label="Dashboard home">
          <Wordmark />
        </Link>
        <span className="ms-2 mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">Studio</span>
      </div>
      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {groups.map((g) => (
          <div key={g.group ?? "root"} className="mt-4 first:mt-2">
            {g.group ? <p className="mb-1 px-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-ash">{g.group}</p> : null}
            <ul>
              {g.items.map((item) => {
                const active = isActive(item.href);
                const count = item.badge ? (badges?.[item.badge] ?? 0) : 0;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex h-9 items-center gap-3 rounded-[4px] px-3 text-[0.86rem] font-medium transition-colors",
                        active ? "bg-chalk/[0.08] text-chalk" : "text-chalk/65 hover:bg-chalk/[0.05] hover:text-chalk",
                      )}
                    >
                      {active ? <span className="absolute inset-y-2 start-0 w-[3px] -skew-y-[20deg] bg-signal" aria-hidden /> : null}
                      <Icon className="size-[1.1rem]" weight={active ? "fill" : "regular"} aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 ? (
                        <span className="min-w-5 rounded-[3px] bg-signal px-1.5 text-center font-mono text-[0.68rem] font-semibold leading-5 text-ink-950">
                          {count > 99 ? "99+" : count}
                          <span className="sr-only"> new</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-chalk/10 p-3">
        <Menu
          align="start"
          trigger={
            <button type="button" className="flex w-full cursor-pointer items-center gap-3 rounded-[4px] p-2 text-start transition-colors hover:bg-chalk/[0.06]">
              <Avatar name={me?.name ?? "?"} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.84rem] font-semibold text-chalk">{me?.name}</span>
                <span className="block truncate text-[0.72rem] text-ash">{ROLE_LABEL[me?.role ?? ""] ?? me?.role}</span>
              </span>
              <CaretUpDown className="size-4 text-ash" aria-hidden />
            </button>
          }
        >
          <MenuItem icon={<UserCircle className="size-4" aria-hidden />} onSelect={() => router.push("/admin/account")}>
            Your account
          </MenuItem>
          <MenuItem icon={theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />} onSelect={toggle}>
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<SignOut className="size-4" aria-hidden />}
            tone="danger"
            onSelect={async () => {
              await signOut();
              router.replace("/admin/login");
            }}
          >
            Sign out
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[4px] text-a-muted hover:bg-a-hover hover:text-a-text"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
    >
      {theme === "dark" ? <Sun className="size-[1.15rem]" aria-hidden /> : <Moon className="size-[1.15rem]" aria-hidden />}
    </button>
  );
}

function Notifications({ badges, total }: { badges?: { newLeads: number; newApplications: number }; total: number }) {
  const router = useRouter();
  const { can } = useSession();
  return (
    <Menu
      trigger={
        <button
          type="button"
          className="relative inline-flex size-9 cursor-pointer items-center justify-center rounded-[4px] text-a-muted hover:bg-a-hover hover:text-a-text"
          aria-label={total ? `${total} new items` : "No new items"}
        >
          <Bell className="size-[1.15rem]" aria-hidden />
          {total > 0 ? <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-signal ring-2 ring-a-bg" aria-hidden /> : null}
        </button>
      }
    >
      <div className="px-2 py-1.5 text-[0.72rem] font-semibold uppercase tracking-wide text-a-faint">Since your last visit</div>
      {can("leads") ? (
        <MenuItem onSelect={() => router.push("/admin/leads")}>
          <span className="flex-1">New leads</span>
          <span className="font-mono text-[0.8rem] tabular">{badges?.newLeads ?? 0}</span>
        </MenuItem>
      ) : null}
      {can("careers") ? (
        <MenuItem onSelect={() => router.push("/admin/applications")}>
          <span className="flex-1">New applications</span>
          <span className="font-mono text-[0.8rem] tabular">{badges?.newApplications ?? 0}</span>
        </MenuItem>
      ) : null}
    </Menu>
  );
}

/* ------------------------- Command palette ------------------------ */

const QUICK_ACTIONS: { label: string; href: string; perm: NavItem["perm"] }[] = [
  { label: "Add a lead", href: "/admin/leads?new=1", perm: "leads" },
  { label: "Post a job", href: "/admin/jobs/new", perm: "careers" },
  { label: "Add a reel", href: "/admin/work/new", perm: "content" },
  { label: "Add a client", href: "/admin/clients/new", perm: "content" },
  { label: "Write a case study", href: "/admin/case-studies/new", perm: "content" },
  { label: "Upload media", href: "/admin/media", perm: "media" },
  { label: "Invite a teammate", href: "/admin/users", perm: "users" },
];

function CommandPalette({
  open,
  onOpenChange,
  groups,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groups: { group: string | null; items: NavItem[] }[];
}) {
  const router = useRouter();
  const { can } = useSession();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const entries = useMemo(() => {
    const pages = groups.flatMap((g) => g.items.map((i) => ({ label: i.label, hint: g.group ?? "Go to", href: i.href, keywords: i.keywords ?? "", icon: i.icon })));
    const actions = QUICK_ACTIONS.filter((a) => can(a.perm)).map((a) => ({ label: a.label, hint: "Action", href: a.href, keywords: "new create add", icon: Plus }));
    const all = [...actions, ...pages];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) => `${e.label} ${e.hint} ${e.keywords}`.toLowerCase().includes(q));
  }, [groups, query, can]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setQuery("");
          setIndex(0);
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-[12vh] z-[61] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-[8px] border border-a-line bg-a-surface text-a-text shadow-2xl outline-none animate-[pop_.15s_ease-out]">
          <Dialog.Title className="sr-only">Jump to</Dialog.Title>
          <Dialog.Description className="sr-only">Search pages and actions</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-a-line px-4">
            <MagnifyingGlass className="size-4 text-a-faint" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setIndex((i) => Math.min(entries.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setIndex((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter" && entries[index]) {
                  e.preventDefault();
                  go(entries[index].href);
                }
              }}
              placeholder="Search pages and actions…"
              aria-label="Search pages and actions"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={entries[index] ? `palette-${index}` : undefined}
              className="h-12 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-a-faint"
            />
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="cursor-pointer rounded p-1 text-a-faint hover:text-a-text">
                <X className="size-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <ul ref={listRef} id="palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-thin">
            {entries.length === 0 ? <li className="px-3 py-6 text-center text-[0.85rem] text-a-muted">Nothing matches “{query}”.</li> : null}
            {entries.map((e, i) => {
              const Icon = e.icon;
              return (
                <li
                  key={e.href + e.label}
                  id={`palette-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === index}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(e.href)}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-3 rounded-[5px] px-3 text-[0.88rem]",
                    i === index ? "bg-a-hover text-a-text" : "text-a-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="flex-1 font-medium text-a-text">{e.label}</span>
                  <span className="text-[0.72rem] text-a-faint">{e.hint}</span>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
