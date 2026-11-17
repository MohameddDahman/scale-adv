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
| Videos | Not stored in Convex. Reels link to the video on Cloudinary, YouTube or Instagram. Cloudinary links (and any direct `.mp4` link) play inside the site. |
| CVs | Capped at 5 MB. A phone photo of a CV is shrunk to a readable JPEG first. Uploads go through a checked endpoint (`convex/http.ts`) that is rate-limited. |
| Leftovers | Files nobody saved (for example, a CV from an application that wasn't sent) are deleted after about two hours. Deleting an image also clears it from wherever it was shown. |
| Downloads | Visitors never load images from Convex. They get resized copies from the website's image cache (`/_next/image`, kept for a month), so the monthly 1 GB of downloads mostly goes to the dashboard. |
| Database reads | Website pages are cached for a day and refreshed right after every dashboard save, so Convex isn't queried on each visit. |

**Storage** in the dashboard shows how full the plan is, with the largest files. You can delete library images that aren't used anywhere, and delete the CV files of old applications (the applications themselves stay). Check the Convex dashboard's Usage page now and then. If the site outgrows the free plan, the paid Starter plan charges only for what goes over.

Resized images are made by the host's image optimizer. On Vercel this has its own monthly allowance; because every copy is cached for a month, a site this size uses little of it.

**Still to do:** connect the Cloudinary account for video hosting. Until then, paste a Cloudinary, YouTube or Instagram link in each reel.

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
