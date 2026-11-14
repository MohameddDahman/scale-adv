"use client";

import { api } from "@convex/_generated/api";
import {
  ConvexProvider,
  ConvexReactClient,
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
  type PaginatedQueryArgs,
  type PaginatedQueryReference,
} from "convex/react";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";

const TOKEN_KEY = "scale.admin.session";

export type Permission = "dashboard" | "leads" | "careers" | "content" | "media" | "settings" | "users" | "activity";
export type Me = NonNullable<FunctionReturnType<typeof api.users.me>>;

type SessionValue = {
  /** undefined while reading storage */
  token: string | null | undefined;
  /** undefined while loading, null when signed out */
  me: Me | null | undefined;
  setToken: (token: string | null) => void;
  signOut: () => Promise<void>;
  can: (permission: Permission) => boolean;
};

const SessionContext = createContext<SessionValue | null>(null);

let client: ConvexReactClient | null = null;
function getClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  client ??= new ConvexReactClient(url);
  return client;
}

export function AdminProviders({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const convex = getClient();
  if (!convex) return <>{fallback}</>;
  return (
    <ConvexProvider client={convex}>
      <SessionProvider>{children}</SessionProvider>
    </ConvexProvider>
  );
}

/* The session token lives in localStorage (shared across tabs) with an in-memory fallback. */
const tokenListeners = new Set<() => void>();
let memoryToken: string | null = null;

function subscribeToken(listener: () => void) {
  tokenListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    tokenListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return memoryToken;
  }
}

function writeToken(next: string | null) {
  memoryToken = next;
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: the session lives in memory for this tab */
  }
  tokenListeners.forEach((l) => l());
}

function SessionProvider({ children }: { children: ReactNode }) {
  // undefined during server render and hydration, then the stored value.
  const token = useSyncExternalStore<string | null | undefined>(subscribeToken, readToken, () => undefined);
  const signOutMutation = useMutation(api.users.signOut);
  const setToken = useCallback((next: string | null) => writeToken(next), []);

  const meResult = useQuery(api.users.me, token ? { token } : "skip");
  const me = token === undefined ? undefined : token === null ? null : meResult;

  // A stored token that the server no longer accepts: forget it.
  useEffect(() => {
    if (token && meResult === null) setToken(null);
  }, [token, meResult, setToken]);

  const signOut = useCallback(async () => {
    const current = token;
    setToken(null);
    if (current) await signOutMutation({ token: current }).catch(() => undefined);
  }, [token, setToken, signOutMutation]);

  const value = useMemo<SessionValue>(
    () => ({
      token,
      me,
      setToken,
      signOut,
      can: (p) => !!me?.permissions.includes(p),
    }),
    [token, me, setToken, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside AdminProviders");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Token-injecting wrappers around Convex hooks                        */
/* ------------------------------------------------------------------ */

type NoToken<F extends FunctionReference<"query" | "mutation" | "action">> = Omit<FunctionArgs<F>, "token">;

export function useAdminQuery<F extends FunctionReference<"query">>(
  fn: F,
  args: NoToken<F> | "skip",
): FunctionReturnType<F> | undefined {
  const { token } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useQuery(fn, (token && args !== "skip" ? { ...args, token } : "skip") as any);
}

export function useAdminPaginatedQuery<F extends PaginatedQueryReference>(
  fn: F,
  args: Omit<PaginatedQueryArgs<F>, "token"> | "skip",
  options: { initialNumItems: number },
) {
  const { token } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return usePaginatedQuery(fn, (token && args !== "skip" ? { ...args, token } : "skip") as any, options);
}

let revalidateTimer: ReturnType<typeof setTimeout> | null = null;
/** Asks the website to refresh cached pages. Debounced so bulk edits trigger one refresh. */
export function refreshSite(token: string) {
  if (revalidateTimer) clearTimeout(revalidateTimer);
  revalidateTimer = setTimeout(() => {
    void fetch("/api/revalidate", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }, 600);
}

export function useAdminMutation<F extends FunctionReference<"mutation">>(fn: F, opts: { refresh?: boolean } = {}) {
  const { token, setToken } = useSession();
  const mutate = useMutation(fn);
  const refresh = useRef(opts.refresh);
  return useCallback(
    async (args: NoToken<F>): Promise<FunctionReturnType<F>> => {
      if (!token) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in again." });
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await mutate({ ...args, token } as any);
        if (refresh.current) refreshSite(token);
        return result;
      } catch (error) {
        if (errorCode(error) === "UNAUTHENTICATED") setToken(null);
        throw error;
      }
    },
    [mutate, token, setToken],
  );
}

export function useAdminAction<F extends FunctionReference<"action">>(fn: F) {
  const { token, setToken } = useSession();
  const run = useAction(fn);
  return useCallback(
    async (args: NoToken<F>): Promise<FunctionReturnType<F>> => {
      if (!token) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Sign in again." });
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await run({ ...args, token } as any);
      } catch (error) {
        if (errorCode(error) === "UNAUTHENTICATED") setToken(null);
        throw error;
      }
    },
    [run, token, setToken],
  );
}

export function errorCode(error: unknown): string | undefined {
  if (error instanceof ConvexError && error.data && typeof error.data === "object") {
    const code = (error.data as Record<string, unknown>).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function errorField(error: unknown): string | undefined {
  if (error instanceof ConvexError && error.data && typeof error.data === "object") {
    const field = (error.data as Record<string, unknown>).field;
    return typeof field === "string" ? field : undefined;
  }
  return undefined;
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (error instanceof ConvexError) {
    if (typeof error.data === "string") return error.data;
    if (error.data && typeof error.data === "object") {
      const message = (error.data as Record<string, unknown>).message;
      if (typeof message === "string") return message;
    }
  }
  if (error instanceof Error && /network|fetch/i.test(error.message)) return "Can't reach the server. Check your connection.";
  return fallback;
}
