# SCALE ADV — website + SCALE Studio dashboard

Bilingual (English / Egyptian Arabic) agency website with a careers section, and a
full dashboard ("SCALE Studio") for leads, hiring and every piece of website content.

- **Stack:** Next.js 16 (App Router, Cache Components) · Convex (database, file storage, auth logic) · Tailwind CSS 4 · Radix UI · Phosphor icons
- **Public site:** `/en` and `/ar` (RTL). Home, Work, Services, Careers (+ each role and an open application), Contact.
- **Dashboard:** `/admin` — invite-only, role-based.

---

## Requirements

- **Node.js 22 or newer.** The Convex CLI refuses to run on Node 20. Install the current LTS from nodejs.org (or `nvm install --lts`), then reinstall packages: `npm install`.
- A free Convex account (you create it in step 2).

## First-time setup

1. **Install**

   ```bash
   npm install
   ```

2. **Connect Convex** (creates the database and writes `.env.local` for you)

   ```bash
   npx convex dev
   ```

   Log in when asked and choose **create a new project**. Leave this terminal running — it pushes the backend every time a file in `convex/` changes.

   > This folder was tested against a temporary *local, anonymous* Convex backend. When you run `npx convex dev` and log in, the CLI moves you to your real account; pick a new project. The test data and test account from that local backend don't come with you.

3. **Run the site** (second terminal)

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — you'll be redirected to `/en` or `/ar` based on the browser language.

4. **Create the owner account**: open http://localhost:3000/admin — it redirects to `/admin/setup`. Keep **Load starter content** ticked to fill the site with the services, the 12 clients, sample roles and FAQs. Then invite the team from **Team access**.

   Starter content can also be loaded from the terminal: `npm run seed`.

## Before going live — review the starter content

Everything below is editable in the dashboard; nothing is hard-coded in pages.

| What | Where in the dashboard | Status |
| --- | --- | --- |
| Client names, cities, follower counts, logos | Clients | From the client list you sent (Facebook previews). Follower counts are a snapshot — update them. Logos were cropped from screenshots; upload originals for sharper results. |
| Job posts (6 roles) | Jobs | **Samples.** Edit, close or delete before launch. |
| FAQs, careers perks and hiring steps, numbers on the Services page | FAQs · Site settings → Careers / Numbers | **Samples** written for the brand. Check every claim. |
| Phone, WhatsApp, email, address, social links | Site settings → Contact / Social | Only Instagram is filled in. Empty fields stay hidden on the site. |
| Process steps, reel formats, "Why SCALE" principles, the Agency page | `src/lib/i18n/en.ts` and `ar.ts` (`servicesPage.steps`, `formats`, `why`, `agencyPage`) | Written for the brand from what SCALE offers. Check they match how the team really works. The numbers band uses Site settings → Numbers, and the brand wall uses Clients. |
| Reels | Reels | 3 placeholders using stills from your Instagram grid. Add each real reel as a link (Cloudinary, YouTube or Instagram) and upload its cover. Video files aren't stored in Convex (see below). |
| Case studies | Case studies | One **unpublished example** shows the format. The Results section appears once you publish a real one. |
| Testimonials, team photos | Testimonials · Team on site | Empty — the sections appear when you add some. |
| Logo | `src/components/site/Wordmark.tsx` | The wordmark is typeset from the brand's style (heavy wide italic + orange ADV tab). Swap in the official SVG if you have it. |

## Staying inside the free Convex plan

The free plan includes **1 GB of stored files** and **1 GB of file downloads a month** (plus 0.5 GB of database storage and 1 GB of database reads a month). If a deployment stays over a limit, Convex can start refusing requests, so the site is built to use as little as possible:

| What | How |
| --- | --- |
| Images | Shrunk in the browser before upload, sized for where they're used, and saved as WebP. A logo is at most 512 px (usually under 60 KB), a reel cover 720×1280, and a case-study cover 1920 px. Share images are saved as JPEG at 1200×630 so WhatsApp shows them. Convex refuses any image over 1 MB, any other file type, and all video files. |
| Duplicates | Uploading an image that's already in the library reuses the stored copy. |
| Videos | Never stored in Convex. Uploaded reels go straight from the browser to Cloudinary (see "Video hosting" below); YouTube and Instagram links work too. |
| CVs | Capped at 5 MB. A phone photo of a CV is shrunk to a readable JPEG first. Uploads go through a checked endpoint (`convex/http.ts`) that is rate-limited. |
| Leftovers | Files nobody saved (for example, a CV from an application that wasn't sent) are deleted after about two hours. Deleting an image also clears it from wherever it was shown. |
| Downloads | Visitors never load images from Convex. They get resized copies from the website's image cache (`/_next/image`, kept for a month), so the monthly 1 GB of downloads mostly goes to the dashboard. |
| Database reads | Website pages are cached for a day and refreshed right after every dashboard save, so Convex isn't queried on each visit. |

**Storage** in the dashboard shows how full the plan is, with the largest files. You can delete library images that aren't used anywhere, and delete the CV files of old applications (the applications themselves stay). Check the Convex dashboard's Usage page now and then. If the site outgrows the free plan, the paid Starter plan charges only for what goes over.

Resized images are made by the host's image optimizer. On Vercel this has its own monthly allowance; because every copy is cached for a month, a site this size uses little of it.

## Video hosting (Cloudinary)

Reels are stored on Cloudinary, separate from Convex. The free plan gives 25 credits per rolling 30 days, shared between storage (1 credit is about 1 GB stored), viewing (about 1 GB watched) and processing (about 1,000 transformations). To make that last:

- **Shrunk before upload.** The dashboard re-encodes every video in the browser: H.264 MP4, at most 720×1280 (or 1280×720), about 1.3 Mbps video and 96 kbps AAC audio, at most 30 fps. A 30-second phone export of 60–200 MB becomes about 5 MB. If the video hardware overshoots on very busy footage, a second pass caps the size. A file that's already small is uploaded as it is.
- **No processing on Cloudinary.** Videos are delivered exactly as stored, so they use no transformation credits. If a browser can't encode video, Cloudinary shrinks the file on upload instead (720p, its leanest automatic quality), for files up to 40 MB.
- **Signed uploads.** The Cloudinary secret stays in Convex. Only signed-in dashboard users can upload, and only into the `scale-adv/reels` folder.
- **Nothing left behind.** Replacing or removing a reel's video, or deleting the reel, deletes the file on Cloudinary. A daily job deletes uploads that never got saved to a reel.
- **No autoplay previews.** Videos load only when a visitor opens a reel, and the reel cards show the cover image instead.
- **Covers.** When a reel has no cover, a frame from the video becomes one. It's a small WebP image stored with the other images (Convex), not on Cloudinary.

The Storage page shows the Cloudinary credits used, storage and views for the last 30 days.

**Connect it (once per deployment).** In the Cloudinary console, open Settings → API Keys and copy the **API environment variable** (`CLOUDINARY_URL=cloudinary://…`). Then, in this folder:

```bash
npx convex env set CLOUDINARY_URL "cloudinary://<api_key>:<api_secret>@<cloud_name>"
```

```bash
npx convex env set CLOUDINARY_URL "cloudinary://<api_key>:<api_secret>@<cloud_name>" --prod
```

The first command connects the development database and the second connects the live one. Keep the secret out of git and chat. The upload button in the reel editor appears as soon as the key is set.

## Deploying (Vercel recommended)

1. **Deploy the backend**

   ```bash
   npx convex deploy
   ```

   Then protect first-time setup on production:

   ```bash
   npx convex env set SETUP_KEY "<a long random string>" --prod
   ```

2. **Deploy the site.** Import the repo in Vercel. The build command is already in `vercel.json`: production builds upload the Convex backend first and then build the site, so both always match. Preview builds only build the site. Set these environment variables:
   - `CONVEX_DEPLOY_KEY` (Production). Create it with `npx convex deployment token create vercel-production --prod`, or in the Convex dashboard under Settings → Deploy keys.
   - `NEXT_PUBLIC_CONVEX_URL` (Preview): the development deployment's URL, so preview links show test data.
   - `NEXT_PUBLIC_SITE_URL` (optional): your domain, e.g. `https://scale-adv.com`. Without it, the site uses Vercel's production domain for canonical links, the sitemap and job structured data.
   - `NEXT_PUBLIC_CONVEX_SITE_URL` is optional. CV uploads use the deployment's `.convex.site` address, which is worked out from `NEXT_PUBLIC_CONVEX_URL` when this isn't set.

   Vercel's free Hobby plan is for personal, non-commercial use only. A client's website needs a Pro team.
3. Open `https://your-domain/admin/setup`, enter the setup key, and create the owner account. Load starter content there or with `npx convex run seed:run --prod`.

## How it works

### Website
- Pages are prerendered and cached for a day. Saving anything in the dashboard calls `/api/revalidate`, so edits still show up right away.
- Without `NEXT_PUBLIC_CONVEX_URL` the site still renders, using the starter content in `convex/lib/defaults.ts` — handy for previews.
- Share images (WhatsApp, Facebook, LinkedIn) are generated at `/api/og` and `/api/og?job=<slug>` unless you upload one under Site settings → Search & sharing.
- Every role page publishes Google **JobPosting** structured data, so open roles can appear in Google's job search.
- Forms: project briefs and job applications (CV upload up to 5 MB: PDF, Word, images). Both have a hidden bot trap, minimum fill time and per-person rate limits. Unclaimed uploads are deleted after about two hours.

### Dashboard (SCALE Studio)
- **Overview** — 30-day inbound chart, pipeline, applications per role, follow-ups due, latest activity.
- **Leads** — list and board (drag between stages), search, filters, bulk actions, CSV export, detail drawer with WhatsApp/call/email shortcuts, owner, follow-up date, deal value, tags, notes + automatic history. Add phone/WhatsApp leads by hand.
- **Applications** — list and board by stage, filter by role, rating, tags, notes, CV preview/download, other applications from the same person, CSV export.
- **Jobs** — bilingual editor with custom application questions (short answer, paragraph, link, yes/no, choice), drafts/open/closed, closing date, duplicate.
- **Website content** — reels (video link + cover), case studies, clients, services, testimonials, FAQs, team — all bilingual, drag to reorder, publish/hide toggles, duplicate.
- **Media library** — images are shrunk and converted to WebP before upload; reuse them anywhere. Each file shows where it's used, and a "Not used" filter lists the ones you can delete.
- **Storage** — how much of the free plan's 1 GB is used, the largest files, and one-click clean-up of unused images and old CV files.
- **Site settings** — homepage headline, numbers, contact, social, careers page copy, SEO, announcement bar.
- **Team access** — invite links (shown once; send on WhatsApp), roles, disable access, password-reset links. **Activity log** of every change. Light/dark theme, `Ctrl+K` command palette.

#### Roles
| Role | Can use |
| --- | --- |
| Owner | Everything, including other owners |
| Admin | Everything except managing owners |
| Content editor | Website content, reels, clients, media |
| Recruiter | Jobs and applications |
| Sales | Leads |

There's no email service connected, so invites and password resets are links you copy and send yourself.

## Project layout

```
convex/                 backend (schema, queries, mutations, auth, crons)
  lib/defaults.ts       starter content (also the offline fallback)
  lib/shape.ts          turns database rows into what the website renders
src/app/[locale]/       public website (en / ar)
src/app/admin/          dashboard routes
src/app/api/            revalidation + share images
src/components/site/    website components (hero timeline, reel viewer, forms…)
src/components/admin/   dashboard components (shell, editors, charts, kanban…)
src/lib/i18n/           English and Arabic interface text
public/clients, public/work   client logos and reel stills cropped from the provided screenshots
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Website + dashboard on http://localhost:3000 |
| `npm run convex` | Convex dev backend (keep running alongside `dev`) |
| `npm run seed` | Load starter content into empty collections (never overwrites) |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | Checks |
