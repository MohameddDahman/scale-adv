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
| Reels | Reels | 3 placeholders using stills from your Instagram grid. Upload the real MP4s (or paste YouTube/Instagram links) and covers. |
| Case studies | Case studies | One **unpublished example** shows the format. The Results section appears once you publish a real one. |
| Testimonials, team photos | Testimonials · Team on site | Empty — the sections appear when you add some. |
| Logo | `src/components/site/Wordmark.tsx` | The wordmark is typeset from the brand's style (heavy wide italic + orange ADV tab). Swap in the official SVG if you have it. |

## Deploying (Vercel recommended)

1. **Deploy the backend**

   ```bash
   npx convex deploy
   ```

   Then protect first-time setup on production:

   ```bash
   npx convex env set SETUP_KEY "<a long random string>" --prod
   ```

2. **Deploy the site.** Import the repo in Vercel and set:
   - `CONVEX_DEPLOY_KEY` — from the Convex dashboard (Settings → Deploy keys), and set the build command to `npx convex deploy --cmd 'npm run build'` so backend and site deploy together; **or** just set `NEXT_PUBLIC_CONVEX_URL` to your production Convex URL if you deploy Convex separately.
   - `NEXT_PUBLIC_SITE_URL` — your domain, e.g. `https://scale-adv.com` (canonical links, sitemap, job structured data).
3. Open `https://your-domain/admin/setup`, enter the setup key, and create the owner account. Load starter content there or with `npx convex run seed:run --prod`.

## How it works

### Website
- Pages are prerendered and cached for about a minute. Saving anything in the dashboard also calls `/api/revalidate`, so edits show up right away.
- Without `NEXT_PUBLIC_CONVEX_URL` the site still renders, using the starter content in `convex/lib/defaults.ts` — handy for previews.
- Share images (WhatsApp, Facebook, LinkedIn) are generated at `/api/og` and `/api/og?job=<slug>` unless you upload one under Site settings → Search & sharing.
- Every role page publishes Google **JobPosting** structured data, so open roles can appear in Google's job search.
- Forms: project briefs and job applications (CV upload up to 10 MB: PDF, Word, images). Both have a hidden bot trap, minimum fill time and per-person rate limits. Unclaimed uploads are deleted daily.

### Dashboard (SCALE Studio)
- **Overview** — 30-day inbound chart, pipeline, applications per role, follow-ups due, latest activity.
- **Leads** — list and board (drag between stages), search, filters, bulk actions, CSV export, detail drawer with WhatsApp/call/email shortcuts, owner, follow-up date, deal value, tags, notes + automatic history. Add phone/WhatsApp leads by hand.
- **Applications** — list and board by stage, filter by role, rating, tags, notes, CV preview/download, other applications from the same person, CSV export.
- **Jobs** — bilingual editor with custom application questions (short answer, paragraph, link, yes/no, choice), drafts/open/closed, closing date, duplicate.
- **Website content** — reels (video upload or link), case studies, clients, services, testimonials, FAQs, team — all bilingual, drag to reorder, publish/hide toggles, duplicate.
- **Media library** — uploads are converted to WebP automatically; reuse files anywhere.
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
