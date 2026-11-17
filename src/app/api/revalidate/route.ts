import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { revalidateTag } from "next/cache";

/**
 * Called by the dashboard after content changes so the public site shows
 * edits immediately instead of waiting for the day-long page cache.
 * The caller's dashboard session token is verified against Convex.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!token || !url) return Response.json({ ok: false }, { status: 401 });
  try {
    const me = await new ConvexHttpClient(url).query(api.users.me, { token });
    if (!me) return Response.json({ ok: false }, { status: 401 });
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
  revalidateTag("site", { expire: 0 });
  return Response.json({ ok: true });
}
