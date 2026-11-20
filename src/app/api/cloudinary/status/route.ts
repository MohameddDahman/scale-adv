import { cloudinaryConfig, requireDashboard } from "@/lib/cloudinary-server";

/** Whether video uploads are set up (the Cloudinary keys are in the website's environment), and nothing else. */
export async function GET(request: Request) {
  const denied = await requireDashboard(request, "content");
  if (denied) return denied;
  return Response.json({ configured: cloudinaryConfig() !== null });
}
