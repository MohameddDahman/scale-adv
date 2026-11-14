import { v, type ObjectType, type PropertyValidators } from "convex/values";
import type { Doc, Id, TableNames } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { logActivity } from "./activity";
import { requireUser, type Permission } from "./auth";

type OrderedTable = Extract<
  TableNames,
  "clients" | "services" | "reels" | "caseStudies" | "faqs" | "testimonials" | "teamMembers" | "jobs"
>;

type CrudOptions<T extends OrderedTable, F extends PropertyValidators> = {
  table: T;
  fields: F;
  permission: Permission;
  /** Name used in the activity log, e.g. "client". */
  entity: string;
  label: (data: ObjectType<F>) => string;
  /** Throw a ConvexError to reject; return a modified copy to normalise input. */
  validate?: (ctx: MutationCtx, data: ObjectType<F>, id?: Id<T>) => Promise<ObjectType<F> | void>;
  afterWrite?: (ctx: MutationCtx, id: Id<T>, data: ObjectType<F>, previous: Doc<T> | null) => Promise<void>;
  onDelete?: (ctx: MutationCtx, doc: Doc<T>) => Promise<void>;
  duplicate?: (doc: Doc<T>) => ObjectType<F>;
};

/**
 * Builds the admin functions every ordered content collection needs:
 * list, get, create, update, remove, reorder, duplicate and a publish toggle.
 * Internals use loose typing because the table is generic; the exported
 * function signatures stay fully typed for the dashboard.
 */
export function makeCrud<T extends OrderedTable, F extends PropertyValidators>(o: CrudOptions<T, F>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (ctx: { db: unknown }) => ctx.db as any;
  const data = v.object(o.fields);

  const list = query({
    args: { token: v.string() },
    handler: async (ctx, args): Promise<Doc<T>[]> => {
      await requireUser(ctx, args.token, o.permission);
      return await db(ctx).query(o.table).withIndex("by_order").collect();
    },
  });

  const get = query({
    args: { token: v.string(), id: v.id(o.table) },
    handler: async (ctx, args): Promise<Doc<T> | null> => {
      await requireUser(ctx, args.token, o.permission);
      return await db(ctx).get(o.table, args.id);
    },
  });

  async function nextOrder(ctx: MutationCtx) {
    const last = await db(ctx).query(o.table).withIndex("by_order").order("desc").first();
    return last ? last.order + 1 : 0;
  }

  const create = mutation({
    args: { token: v.string(), data },
    handler: async (ctx, args): Promise<Id<T>> => {
      const user = await requireUser(ctx, args.token, o.permission);
      const input = ((await o.validate?.(ctx, args.data as ObjectType<F>)) ?? args.data) as ObjectType<F>;
      const id: Id<T> = await db(ctx).insert(o.table, { ...input, order: await nextOrder(ctx) });
      await o.afterWrite?.(ctx, id, input, null);
      await logActivity(ctx, user, "created", o.entity, o.label(input), id);
      return id;
    },
  });

  const update = mutation({
    args: { token: v.string(), id: v.id(o.table), data },
    handler: async (ctx, args) => {
      const user = await requireUser(ctx, args.token, o.permission);
      const previous: Doc<T> | null = await db(ctx).get(o.table, args.id);
      if (!previous) throw new Error("This item no longer exists.");
      const input = ((await o.validate?.(ctx, args.data as ObjectType<F>, args.id)) ?? args.data) as ObjectType<F>;
      // Replace so optional fields cleared in the form are removed.
      await db(ctx).replace(o.table, args.id, { ...input, order: previous.order, ...extraFields(previous, o.fields) });
      await o.afterWrite?.(ctx, args.id, input, previous);
      await logActivity(ctx, user, "updated", o.entity, o.label(input), args.id);
    },
  });

  const remove = mutation({
    args: { token: v.string(), id: v.id(o.table) },
    handler: async (ctx, args) => {
      const user = await requireUser(ctx, args.token, o.permission);
      const doc: Doc<T> | null = await db(ctx).get(o.table, args.id);
      if (!doc) return;
      await o.onDelete?.(ctx, doc);
      await db(ctx).delete(o.table, args.id);
      await logActivity(ctx, user, "deleted", o.entity, o.label(doc as unknown as ObjectType<F>), args.id);
    },
  });

  const reorder = mutation({
    args: { token: v.string(), ids: v.array(v.id(o.table)) },
    handler: async (ctx, args) => {
      const user = await requireUser(ctx, args.token, o.permission);
      for (let i = 0; i < args.ids.length; i++) {
        await db(ctx).patch(o.table, args.ids[i], { order: i });
      }
      await logActivity(ctx, user, "reordered", o.entity, `${args.ids.length} items`);
    },
  });

  const setPublished = mutation({
    args: { token: v.string(), id: v.id(o.table), published: v.boolean() },
    handler: async (ctx, args) => {
      const user = await requireUser(ctx, args.token, o.permission);
      const doc = await db(ctx).get(o.table, args.id);
      if (!doc || !("published" in doc)) return;
      await db(ctx).patch(o.table, args.id, { published: args.published });
      await logActivity(
        ctx,
        user,
        args.published ? "published" : "unpublished",
        o.entity,
        o.label(doc as ObjectType<F>),
        args.id,
      );
    },
  });

  const duplicate = mutation({
    args: { token: v.string(), id: v.id(o.table) },
    handler: async (ctx, args): Promise<Id<T> | null> => {
      const user = await requireUser(ctx, args.token, o.permission);
      const doc: Doc<T> | null = await db(ctx).get(o.table, args.id);
      if (!doc || !o.duplicate) return null;
      const copy = o.duplicate(doc);
      const id: Id<T> = await db(ctx).insert(o.table, { ...copy, order: await nextOrder(ctx) });
      await logActivity(ctx, user, "duplicated", o.entity, o.label(copy), id);
      return id;
    },
  });

  return { list, get, create, update, remove, reorder, setPublished, duplicate };
}

/** Keeps stored fields that are not part of the editable field set (e.g. jobs.publishedAt). */
function extraFields(previous: Record<string, unknown>, fields: PropertyValidators) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(previous)) {
    if (key.startsWith("_") || key === "order" || key in fields) continue;
    out[key] = value;
  }
  return out;
}

/** Strips system fields and order so a document can be fed back into create(). */
export function editable<D extends { _id: unknown; _creationTime: number; order: number }>(doc: D) {
   
  const { _id, _creationTime, order, ...rest } = doc;
  return rest;
}
