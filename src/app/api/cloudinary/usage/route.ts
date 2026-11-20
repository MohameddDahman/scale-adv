import { cloudinaryConfig, cloudinaryUsage, requireDashboard, type CloudinaryUsage } from "@/lib/cloudinary-server";

/** Cloudinary credits, storage and views over the last 30 days, for the dashboard's Storage page. */
export async function GET(request: Request) {
  const denied = await requireDashboard(request, "media");
  if (denied) return denied;
  const c = cloudinaryConfig();
  const usage: CloudinaryUsage = c ? await cloudinaryUsage(c) : { configured: false };
  return Response.json(usage);
}
