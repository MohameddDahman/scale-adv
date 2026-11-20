import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { sha256Hex } from "./sha256";
import type { Role } from "./validators";

/** What each role may touch. The admin UI reads the same map to build its navigation. */
export const PERMISSIONS = {
  dashboard: ["owner", "admin", "editor", "recruiter", "sales"],
  leads: ["owner", "admin", "sales"],
  careers: ["owner", "admin", "recruiter"],
  content: ["owner", "admin", "editor"],
  media: ["owner", "admin", "editor", "recruiter"],
  settings: ["owner", "admin"],
  users: ["owner", "admin"],
  activity: ["owner", "admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Usernames ignore case and surrounding spaces: "Amir " and "amir" are the same account. */
export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

/** Why a (normalized) username can't be used, or null when it's fine. */
export function usernameProblem(username: string): string | null {
  if (username.length < 2) return "Use at least 2 characters.";
  if (username.length > 32) return "Use 32 characters at most.";
  if (!/^[\p{L}\p{N}._@-]+$/u.test(username)) return "Use letters and numbers (dots, dashes and underscores are fine), with no spaces.";
  return null;
}

export async function getSession(ctx: QueryCtx | MutationCtx, token: string | undefined | null) {
  if (!token || token.length < 20 || token.length > 200) return null;
  const tokenHash = sha256Hex(token);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  if (!user || !user.active) return null;
  return { session, user };
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  token: string,
  permission?: Permission,
): Promise<Doc<"users">> {
  const found = await getSession(ctx, token);
  if (!found) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Your session has ended. Sign in again." });
  }
  if (permission && !can(found.user.role, permission)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Your role doesn't have access to this." });
  }
  return found.user;
}

/** Fields that are safe to send to the browser. */
export function publicUser(user: Doc<"users">) {
  return {
    _id: user._id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user._creationTime,
  };
}
