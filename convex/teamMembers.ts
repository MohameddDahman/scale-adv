import { makeCrud } from "./lib/crud";
import { fail, normalizeUrl } from "./lib/util";
import { teamMemberFields } from "./lib/validators";

export const { list, get, create, update, remove, reorder, setPublished, duplicate } = makeCrud({
  table: "teamMembers",
  fields: teamMemberFields,
  permission: "content",
  entity: "team member",
  label: (d) => d.name.en || d.name.ar,
  validate: async (_ctx, d) => {
    if (!d.name.en.trim() && !d.name.ar.trim()) fail("Add a name.", "name");
    return { ...d, instagram: normalizeUrl(d.instagram) };
  },
  duplicate: (doc) => ({
    name: { en: `${doc.name.en} (copy)`, ar: doc.name.ar },
    role: doc.role,
    bio: doc.bio,
    photo: doc.photo,
    photoPath: doc.photoPath,
    instagram: doc.instagram,
    published: false,
  }),
});
