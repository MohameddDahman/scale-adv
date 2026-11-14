import { makeCrud } from "./lib/crud";
import { fail } from "./lib/util";
import { faqFields } from "./lib/validators";

export const { list, get, create, update, remove, reorder, setPublished, duplicate } = makeCrud({
  table: "faqs",
  fields: faqFields,
  permission: "content",
  entity: "FAQ",
  label: (d) => d.question.en || d.question.ar,
  validate: async (_ctx, d) => {
    if (!d.question.en.trim() && !d.question.ar.trim()) fail("Write the question.", "question");
    if (!d.answer.en.trim() && !d.answer.ar.trim()) fail("Write the answer.", "answer");
  },
  duplicate: (doc) => ({
    question: { en: `${doc.question.en} (copy)`, ar: doc.question.ar },
    answer: doc.answer,
    scope: doc.scope,
    published: false,
  }),
});
