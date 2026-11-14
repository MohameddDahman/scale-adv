import { makeCrud } from "./lib/crud";
import { fail } from "./lib/util";
import { serviceFields } from "./lib/validators";

export const { list, get, create, update, remove, reorder, setPublished, duplicate } = makeCrud({
  table: "services",
  fields: serviceFields,
  permission: "content",
  entity: "service",
  label: (d) => d.title.en || d.title.ar,
  validate: async (_ctx, d) => {
    if (!d.title.en.trim()) fail("Add the service name in English.", "title");
    return { ...d, deliverables: d.deliverables.filter((x) => x.en.trim() || x.ar.trim()) };
  },
  duplicate: (doc) => ({
    verb: doc.verb,
    title: { en: `${doc.title.en} (copy)`, ar: doc.title.ar },
    summary: doc.summary,
    deliverables: doc.deliverables,
    published: false,
  }),
});
