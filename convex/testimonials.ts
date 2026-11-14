import { makeCrud } from "./lib/crud";
import { fail } from "./lib/util";
import { testimonialFields } from "./lib/validators";

export const { list, get, create, update, remove, reorder, setPublished, duplicate } = makeCrud({
  table: "testimonials",
  fields: testimonialFields,
  permission: "content",
  entity: "testimonial",
  label: (d) => d.author,
  validate: async (_ctx, d) => {
    if (!d.author.trim()) fail("Add who said it.", "author");
    if (!d.quote.en.trim() && !d.quote.ar.trim()) fail("Add the quote.", "quote");
  },
  duplicate: (doc) => ({
    quote: doc.quote,
    author: `${doc.author} (copy)`,
    role: doc.role,
    clientId: doc.clientId,
    photo: doc.photo,
    photoPath: doc.photoPath,
    published: false,
  }),
});
