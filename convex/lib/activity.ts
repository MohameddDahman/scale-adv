import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { displayName } from "./util";

export async function logActivity(
  ctx: MutationCtx,
  actor: Doc<"users"> | null,
  action: string,
  entity: string,
  label: string,
  entityId?: string,
) {
  await ctx.db.insert("activity", {
    actorId: actor?._id,
    actorName: actor ? displayName(actor) : "Website",
    action,
    entity,
    entityId,
    label: label.slice(0, 140),
  });
}

export async function addEvent(
  ctx: MutationCtx,
  entity: "lead" | "application",
  entityId: string,
  actor: Doc<"users"> | null,
  body: string,
) {
  await ctx.db.insert("notes", {
    entity,
    entityId,
    kind: "event",
    body,
    authorId: actor?._id,
    authorName: actor ? displayName(actor) : "Website",
  });
}
