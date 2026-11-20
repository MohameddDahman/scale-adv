import { cloudinaryConfig, MAX_UPLOAD_BYTES, refuse, requireDashboard, SERVER_COMPRESSION_MAX_BYTES, signUpload } from "@/lib/cloudinary-server";

/**
 * Signs one reel upload for the dashboard. The browser has already shrunk the
 * video; it sends the file straight to Cloudinary with the signed fields.
 * Body: { bytes: number, serverCompression: boolean }
 */
export async function POST(request: Request) {
  const denied = await requireDashboard(request, "content");
  if (denied) return denied;
  const c = cloudinaryConfig();
  if (!c) return refuse(503, "NOT_CONFIGURED", "Video uploads aren't connected yet. Add the Cloudinary keys in Vercel (see the README).");

  const body = (await request.json().catch(() => null)) as { bytes?: unknown; serverCompression?: unknown } | null;
  const bytes = typeof body?.bytes === "number" && Number.isFinite(body.bytes) && body.bytes > 0 ? body.bytes : null;
  if (bytes === null) return refuse(400, "INVALID_FILE", "Choose a video file to upload.");
  const serverCompression = body?.serverCompression === true;

  if (bytes > MAX_UPLOAD_BYTES) {
    return refuse(413, "TOO_BIG", "This video is still over 100 MB. Export it shorter or at 1080p and try again.");
  }
  if (serverCompression && bytes > SERVER_COMPRESSION_MAX_BYTES) {
    return refuse(
      413,
      "TOO_BIG",
      "This browser can't shrink videos, and the file is over 40 MB. Use Chrome or Edge on a computer, or export the reel at 1080p first.",
    );
  }
  return Response.json(signUpload(c, serverCompression));
}
