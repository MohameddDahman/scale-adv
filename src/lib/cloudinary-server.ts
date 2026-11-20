/**
 * Video hosting on Cloudinary, for the website's own API routes
 * (src/app/api/cloudinary/*). The keys are environment variables of the
 * website: Vercel → Settings → Environment Variables when it's live, and
 * .env.local on your computer.
 *
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *   (or CLOUDINARY_URL=cloudinary://key:secret@cloud instead of the three)
 *
 * The free plan has 25 credits per rolling 30 days, shared by stored GB,
 * watched GB and processing. To stretch that, videos are shrunk in the
 * browser before upload (src/lib/video-compress.ts) and delivered exactly as
 * stored. The secret never reaches the browser: uploads are signed here.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export const VIDEO_FOLDER = "scale-adv/reels";
/** Every dashboard upload carries this tag, so the clean-up only ever touches our own files. */
export const VIDEO_TAG = "scale-adv-reel";
/** Used only when the browser couldn't compress: 720p either way round, Cloudinary's leanest automatic quality. */
export const SERVER_COMPRESSION = "c_limit,w_1280,h_1280/q_auto:eco/vc_h264,ac_aac";
/** The free plan only processes videos up to 40 MB during the upload itself. */
export const SERVER_COMPRESSION_MAX_BYTES = 40 * 1024 * 1024;
/** Cloudinary takes single-request uploads up to 100 MB. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

export function cloudinaryConfig(): CloudinaryConfig | null {
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
export function signParams(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(payload + secret).digest("hex");
}

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/** Compares two secrets without leaking how much of them matched. */
export const sameSecret = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

const basicAuth = (c: CloudinaryConfig) => `Basic ${Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString("base64")}`;

export const refuse = (status: number, code: string, message: string) => Response.json({ code, message }, { status });

/**
 * Lets a request through only with a dashboard session (Authorization: Bearer
 * <session token>) whose role has this permission. Returns the refusal to
 * send, or null when it may go ahead.
 */
export async function requireDashboard(request: Request, permission: string): Promise<Response | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return refuse(503, "NOT_CONFIGURED", "The website isn't connected to Convex.");
  if (!token) return refuse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
  let me;
  try {
    me = await new ConvexHttpClient(url).query(api.users.me, { token });
  } catch {
    return refuse(502, "UNAVAILABLE", "Can't reach the database right now. Try again in a minute.");
  }
  if (!me) return refuse(401, "UNAUTHENTICATED", "Your session has ended. Sign in again.");
  if (!(me.permissions as readonly string[]).includes(permission)) return refuse(403, "FORBIDDEN", "Your role doesn't have access to this.");
  return null;
}

/** Signs one upload. The browser then sends the file straight to Cloudinary with exactly these fields, so it can't change the folder or settings. */
export function signUpload(c: CloudinaryConfig, serverCompression: boolean) {
  const params: Record<string, string | number> = {
    folder: VIDEO_FOLDER,
    tags: VIDEO_TAG,
    timestamp: Math.floor(Date.now() / 1000),
    ...(serverCompression ? { format: "mp4", transformation: SERVER_COMPRESSION } : {}),
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${c.cloudName}/video/upload`,
    fields: {
      ...Object.fromEntries(Object.entries(params).map(([k, val]) => [k, String(val)])),
      api_key: c.apiKey,
      signature: signParams(params, c.apiSecret),
    },
  };
}

export type SignedUpload = ReturnType<typeof signUpload>;

async function destroyVideo(c: CloudinaryConfig, publicId: string) {
  const params = { invalidate: "true", public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
  const body = new URLSearchParams({
    invalidate: params.invalidate,
    public_id: params.public_id,
    timestamp: String(params.timestamp),
    api_key: c.apiKey,
    signature: signParams(params, c.apiSecret),
  });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/video/destroy`, { method: "POST", body, cache: "no-store" });
  const json = (await res.json().catch(() => null)) as { result?: string } | null;
  return json?.result ?? `HTTP ${res.status}`;
}

/** Credits, storage and views over the last 30 days, for the dashboard's Storage page. */
export async function cloudinaryUsage(c: CloudinaryConfig) {
  const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/usage`, { headers: { Authorization: basicAuth(c) }, cache: "no-store" });
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
  };
}

export type CloudinaryUsage = { configured: false } | Awaited<ReturnType<typeof cloudinaryUsage>>;

/**
 * Deletes our tagged uploads that no reel uses and that are older than the
 * grace period, so a video someone just uploaded but hasn't saved yet stays.
 * If the list of used videos can't be read, nothing is deleted.
 */
export async function deleteUnusedVideos(c: CloudinaryConfig, graceHours: number): Promise<{ removed: number } | { error: string }> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return { error: "The website isn't connected to Convex." };
  let used: Set<string>;
  try {
    used = new Set(await new ConvexHttpClient(convexUrl).query(api.reels.videoKeys, {}));
  } catch {
    return { error: "Can't reach the database right now. Nothing was deleted." };
  }
  const cutoff = Date.now() - graceHours * 60 * 60 * 1000;
  let cursor: string | undefined;
  let removed = 0;
  for (let page = 0; page < 10; page++) {
    const url = new URL(`https://api.cloudinary.com/v1_1/${c.cloudName}/resources/video/tags/${VIDEO_TAG}`);
    url.searchParams.set("max_results", "500");
    if (cursor) url.searchParams.set("next_cursor", cursor);
    const res = await fetch(url, { headers: { Authorization: basicAuth(c) }, cache: "no-store" });
    if (!res.ok) return removed ? { removed } : { error: `Cloudinary answered with ${res.status}. Check the keys.` };
    const data = (await res.json()) as { resources?: { public_id: string; created_at: string }[]; next_cursor?: string };
    for (const r of data.resources ?? []) {
      if (used.has(sha256(r.public_id).toString("hex")) || !(Date.parse(r.created_at) < cutoff)) continue;
      if ((await destroyVideo(c, r.public_id)) === "ok") removed++;
    }
    cursor = data.next_cursor;
    if (!cursor) break;
  }
  return { removed };
}
