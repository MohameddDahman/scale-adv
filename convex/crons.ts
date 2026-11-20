import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("expire sessions and rate limits", { hourUTC: 1, minuteUTC: 0 }, internal.maintenance.cleanup);
// Unclaimed uploads: hourly for the recent window, plus a daily catch-all for anything a missed run left behind.
crons.hourly("delete unclaimed uploads", { minuteUTC: 17 }, internal.maintenance.orphans, { fromHoursAgo: 6, toHoursAgo: 2 });
crons.daily("delete unclaimed uploads (catch-all)", { hourUTC: 1, minuteUTC: 30 }, internal.maintenance.orphans, { fromHoursAgo: 24 * 8, toHoursAgo: 2 });
// Cloudinary: videos uploaded from the dashboard that never ended up on a reel.
crons.daily("delete unused Cloudinary videos", { hourUTC: 2, minuteUTC: 0 }, internal.cloudinary.cleanup);

export default crons;
