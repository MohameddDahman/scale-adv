"use node";
/**
 * Video hosting on Cloudinary. The free plan has 25 credits per rolling 30
 * days, shared by stored GB, delivered GB and processing. To stretch that:
 *
 * - Videos are shrunk in the browser before upload (src/lib/video-compress.ts),
 *   so Cloudinary stores small 720p MP4s and does no processing.
 * - Only when a browser can't compress does Cloudinary do it on upload
 *   (SERVER_COMPRESSION), for files small enough to process right away.
 * - Videos are delivered exactly as stored: no on-the-fly variants.
 * - Videos that no reel uses any more are deleted.
 *
 * Credentials come from Convex environment variables, either CLOUDINARY_URL
 * (cloudinary://key:secret@cloud, as shown in the Cloudinary console) or
 * CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET. The
 * secret never reaches the browser: uploads are signed here.
 */
import { createHash } from "node:crypto";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { can, type Permission } from "./lib/auth";

const FOLDER = "scale-adv/reels";
/** Every dashboard upload carries this tag, so the cleanup only ever touches our own files. */
const TAG = "scale-adv-reel";
/** Used only when the browser couldn't compress: 720p (either way round), Cloudinary's leanest automatic quality. */
const SERVER_COMPRESSION = "c_limit,w_1280,h_1280/q_auto:eco/vc_h264,ac_aac";
/** The free plan only processes videos up to 40 MB during the upload itself. */
const SERVER_COMPRESSION_MAX_BYTES = 40 * 1024 * 1024;
/** Cloudinary takes single-request uploads up to 100 MB. */
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

type Config = { cloudName: string; apiKey: string; apiSecret: string };

function config(): Config | null {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/.exec(url);
    if (m) return { apiKey: decodeURIComponent(m[1]), apiSecret: decodeURIComponent(m[2]), cloudName: m[3] };
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** Cloudinary's request signature: params sorted by name, joined with "&", the secret appended, SHA-1. */
function signParams(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(payload + secret).digest("hex");
}

const basicAuth = (c: Config) => `Basic ${Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString("base64")}`;

async function requireRole(ctx: ActionCtx, token: string, permission: Permission) {
  const user = await ctx.runQuery(internal.authInternal.viewer, { token });
  if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Your session has ended. Sign in again." });
  if (!can(user.role, permission)) throw new ConvexError({ code: "FORBIDDEN", message: "Your role doesn't have access to this." });
  return user;
}

async function destroy(c: Config, publicId: string) {
  const params = { invalidate: "true", public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
  const body = new URLSearchParams({
    invalidate: params.invalidate,
    public_id: params.public_id,
    timestamp: String(params.timestamp),
    api_key: c.apiKey,
    signature: signParams(params, c.apiSecret),
  });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/video/destroy`, { method: "POST", body });
  const json = (await res.json().catch(() => null)) as { result?: string } | null;
  return json?.result ?? `HTTP ${res.status}`;
}

/** Whether video uploads are set up, without revealing anything else. */
export const status = action({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, "content");
    return { configured: config() !== null };
  },
});

/**
 * Signs one upload. The browser then sends the file straight to Cloudinary
 * with exactly these parameters, so it can't change the folder or settings.
 */
export const signUpload = action({
  args: { token: v.string(), bytes: v.number(), serverCompression: v.boolean() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, "content");
    const c = config();
    if (!c) {
      throw new ConvexError({ code: "NOT_CONFIGURED", message: "Video uploads aren't connected yet. Add the Cloudinary keys (see the README)." });
    }
    if (a.bytes > MAX_UPLOAD_BYTES) {
      throw new ConvexError({ code: "TOO_BIG", message: "This video is still over 100 MB. Export it shorter or at 1080p and try again." });
    }
    if (a.serverCompression && a.bytes > SERVER_COMPRESSION_MAX_BYTES) {
      throw new ConvexError({
        code: "TOO_BIG",
        message: "This browser can't shrink videos, and the file is over 40 MB. Use Chrome or Edge on a computer, or export the reel at 1080p first.",
      });
    }
    const params: Record<string, string | number> = {
      folder: FOLDER,
      tags: TAG,
      timestamp: Math.floor(Date.now() / 1000),
      ...(a.serverCompression ? { format: "mp4", transformation: SERVER_COMPRESSION } : {}),
    };
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${c.cloudName}/video/upload`,
      fields: { ...Object.fromEntries(Object.entries(params).map(([k, val]) => [k, String(val)])), api_key: c.apiKey, signature: signParams(params, c.apiSecret) },
    };
  },
});

/** Credits, storage and delivery over the last 30 days, for the Storage page. */
export const usage = action({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    await requireRole(ctx, a.token, "media");
    const c = config();
    if (!c) return { configured: false as const };
    const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/usage`, { headers: { Authorization: basicAuth(c) } });
    if (!res.ok) return { configured: true as const, error: `Cloudinary answered with ${res.status}. Check the keys.` };
    const u = (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
    return {
      configured: true as const,
      plan: typeof u.plan === "string" ? u.plan : null,
      creditsUsed: num(u.credits?.usage),
      creditsLimit: num(u.credits?.limit),
      storageBytes: num(u.storage?.usage),
      bandwidthBytes: num(u.bandwidth?.usage),
      transformations: num(u.transformations?.usage),
      updated: typeof u.last_updated === "string" ? u.last_updated : null,
    };
  },
});

/** Deletes one video, unless another reel still uses it. Scheduled when a reel drops or replaces its video. */
export const destroyIfUnused = internalAction({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }): Promise<string> => {
    const c = config();
    if (!c) return "not configured";
    const used: string[] = await ctx.runQuery(internal.reels.videoPublicIds, {});
    if (used.includes(publicId)) return "still used";
    return await destroy(c, publicId);
  },
});

/**
 * Daily: deletes dashboard uploads that never ended up on a reel (the editor
 * was closed before saving). Only files carrying our tag and older than a day.
 */
export const cleanup = internalAction({
  args: {},
  handler: async (ctx): Promise<{ removed: number } | { skipped: string }> => {
    const c = config();
    if (!c) return { skipped: "not configured" };
    const ids: string[] = await ctx.runQuery(internal.reels.videoPublicIds, {});
    const used = new Set(ids);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let cursor: string | undefined;
    let removed = 0;
    for (let page = 0; page < 10; page++) {
      const url = new URL(`https://api.cloudinary.com/v1_1/${c.cloudName}/resources/video/tags/${TAG}`);
      url.searchParams.set("max_results", "500");
      if (cursor) url.searchParams.set("next_cursor", cursor);
      const res = await fetch(url, { headers: { Authorization: basicAuth(c) } });
      if (!res.ok) break;
      const data = (await res.json()) as { resources?: { public_id: string; created_at: string }[]; next_cursor?: string };
      for (const r of data.resources ?? []) {
        if (used.has(r.public_id) || Date.parse(r.created_at) > cutoff) continue;
        if ((await destroy(c, r.public_id)) === "ok") removed++;
      }
      cursor = data.next_cursor;
      if (!cursor) break;
    }
    return { removed };
  },
});
