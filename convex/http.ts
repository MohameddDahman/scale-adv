import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { CV_TYPES, MAX_CV_BYTES } from "./lib/storage";

const http = httpRouter();

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

/**
 * CV uploads from the careers form. Unlike a raw upload URL, this checks the
 * file type and the 5 MB limit before anything is stored, and rate-limits
 * uploads, so nobody can fill the free plan's 1 GB of storage. Files that
 * never get attached to an application are deleted within a few hours.
 */
http.route({
  path: "/cv",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!CV_TYPES.includes(type)) {
      return reply({ code: "FILE_TYPE", message: "Upload a PDF, Word document or image." }, 415);
    }
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_CV_BYTES) {
      return reply({ code: "FILE_SIZE", message: "The file is larger than 5 MB." }, 413);
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    if (!(await ctx.runMutation(internal.forms.claimUploadSlot, { ip }))) {
      return reply({ code: "RATE_LIMITED", message: "Too many uploads. Wait a little and try again." }, 429);
    }
    const body = await request.arrayBuffer();
    if (body.byteLength === 0) return reply({ code: "EMPTY", message: "The file is empty." }, 400);
    if (body.byteLength > MAX_CV_BYTES) {
      return reply({ code: "FILE_SIZE", message: "The file is larger than 5 MB." }, 413);
    }
    const storageId = await ctx.storage.store(new Blob([body], { type }));
    return reply({ storageId });
  }),
});

http.route({
  path: "/cv",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: cors })),
});

export default http;
