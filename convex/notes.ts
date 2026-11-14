import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { can, requireUser } from "./lib/auth";
import { displayName, fail } from "./lib/util";

const vEntity = v.union(v.literal("lead"), v.literal("application"));

export const add = mutation({
  args: { token: v.string(), entity: vEntity, entityId: v.string(), body: v.string() },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token, a.entity === "lead" ? "leads" : "careers");
    const body = a.body.trim().slice(0, 4000);
    if (!body) fail("Write something first.", "body");
    const id = a.entity === "lead" ? ctx.db.normalizeId("leads", a.entityId) : ctx.db.normalizeId("applications", a.entityId);
    if (!id) fail("This record no longer exists.");
    await ctx.db.insert("notes", {
      entity: a.entity,
      entityId: a.entityId,
      kind: "note",
      body,
      authorId: user._id,
      authorName: displayName(user),
    });
  },
});

export const remove = mutation({
  args: { token: v.string(), noteId: v.id("notes") },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx, a.token);
    const note = await ctx.db.get("notes", a.noteId);
    if (!note || note.kind !== "note") return;
    if (note.authorId !== user._id && !can(user.role, "users")) {
      fail("You can only delete your own notes.");
    }
    await ctx.db.delete("notes", a.noteId);
  },
});
