import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("expire sessions and rate limits", { hourUTC: 1, minuteUTC: 0 }, internal.maintenance.cleanup);
crons.daily("delete orphaned uploads", { hourUTC: 1, minuteUTC: 30 }, internal.maintenance.orphans);

export default crons;
