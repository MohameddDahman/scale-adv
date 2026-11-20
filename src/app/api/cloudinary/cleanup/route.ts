import { cloudinaryConfig, deleteUnusedVideos, refuse, requireDashboard, sameSecret } from "@/lib/cloudinary-server";

/**
 * Daily clean-up, run by Vercel Cron (see "crons" in vercel.json). Deletes
 * reel videos that were uploaded but never saved, or that a reel no longer
 * uses, once they're a day old. Vercel sends "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const sent = request.headers.get("authorization") ?? "";
  if (!secret || !sameSecret(sent, `Bearer ${secret}`)) return refuse(401, "UNAUTHENTICATED", "Not allowed.");
  const c = cloudinaryConfig();
  if (!c) return Response.json({ skipped: "Cloudinary keys aren't set." });
  const result = await deleteUnusedVideos(c, 24);
  return Response.json(result, { status: "error" in result ? 502 : 200 });
}

/** The same clean-up from the dashboard's Storage page, for videos more than 6 hours old. */
export async function POST(request: Request) {
  const denied = await requireDashboard(request, "media");
  if (denied) return denied;
  const c = cloudinaryConfig();
  if (!c) return refuse(503, "NOT_CONFIGURED", "Video uploads aren't connected yet. Add the Cloudinary keys in Vercel (see the README).");
  const result = await deleteUnusedVideos(c, 6);
  if ("error" in result) return refuse(502, "UNAVAILABLE", result.error);
  return Response.json(result);
}
