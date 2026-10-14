# Portfolio

A Next.js (App Router) portfolio site with a built-in admin dashboard. Every piece of public content (hero, home sections, case studies, articles, images, résumé) is editable at `/admin` and stored in Supabase. Saves show up on the public site immediately through on-demand revalidation.

- Public site: Server Components, cached reads tagged `settings`, `sections`, `posts`, `post:<type>:<slug>`, `media`.
- Admin (`/admin`): Supabase magic-link sign-in, allow-list of admin emails, forms validated with the Zod schemas in `src/lib/schema.ts`.
- Without Supabase the site still runs, read-only, from `content/seed.json` and `public/media/`.

Stack: Next 16, React 19, TypeScript, Supabase (Postgres, Auth, Storage), Zod 4. No CSS framework.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

With no environment variables the site reads `content/seed.json` ("local mode"). `/admin` then shows a "Connect Supabase to edit" notice and nothing is editable.

Other scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run seed:legacy` (rebuild `content/seed.json` from the old static HTML in `legacy/`), `npm run seed:push` (see below).

## Supabase setup

1. **Create a project** at <https://supabase.com/dashboard>.
2. **Run the migration.** In the SQL editor paste and run `supabase/migrations/0001_init.sql`. It creates the tables, the `is_admin()` function, row level security policies and the public `media` storage bucket. It is safe to re-run.
3. **Add yourself as an admin.** In the SQL editor (lowercase email, the one you will sign in with):
   ```sql
   insert into public.admins (email) values ('you@example.com') on conflict do nothing;
   ```
4. **Set environment variables.** Copy `.env.example` to `.env.local` and fill in (Project settings, API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (only used by `npm run seed:push` on your machine; never expose it or add it to the browser/`NEXT_PUBLIC_*`)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://your-domain.com`)
5. **Allow the sign-in redirect.** Authentication, URL configuration: set *Site URL* to your site URL and add these to *Redirect URLs*:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
   (Preview deployments: add `https://*-your-team.vercel.app/auth/callback`.) Email auth must be enabled (it is by default).
6. **Push the seed content** (uploads the images and inserts all rows; re-running overwrites seeded rows):
   ```bash
   npm run seed:push
   ```
   Use `npm run seed:push -- --dry-run` to validate without touching the project.
7. Restart `npm run dev`, open `/admin/login`, enter your email and follow the link.

### How access is enforced

- `src/proxy.ts` refreshes the session and redirects signed-out visitors from `/admin/*` to `/admin/login`.
- Every admin page and every Server Action re-verifies on the server: `auth.getUser()` then `select public.is_admin()`. Non-admins see "Not authorised".
- Postgres row level security is the real gate: only `is_admin()` users can write any table or the `media` bucket, whatever the app does. Anyone may request a magic link; only emails in `admins` can do anything with it.

## Using the admin

| Page | What it edits |
| --- | --- |
| Overview | Published / draft counts, new / total messages, last 5 edits |
| Profile & settings | Hero (headline, tags, buttons, stat chips), nav, marquee, contact, footer, SEO / Open Graph, résumé file |
| Home sections | Show/hide and order the home page blocks; one editor per section |
| Case studies / Articles | List, search, filter, reorder, create, edit (block editor body), publish / unpublish, delete, Preview. A post's first publish adds it to the end of the home gallery (case studies) or Writing list (articles); reorder or remove it under Home sections |
| Messages | Contact-form enquiries: read, mark read / new, archive, delete |
| Media | Upload (images up to 15 MB, PDF), alt text, replace, delete (blocked while a file is in use) |

Free-text fields accept a small inline markup: `**bold**`, `*italic*`, `==highlight==` (hero only), `[label](url)`, newline = line break.

**Preview drafts:** the Preview button calls `/api/draft?type=…&slug=…`, which (for admins only) turns on Next Draft Mode and opens the public page. Leave preview with `/api/draft?disable=1`.

## Contact form

The home page contact section has a form. Each submission is stored in `contact_messages` (apply `supabase/migrations/0002_contact_messages.sql`), emailed to you through [Resend](https://resend.com), and listed under **Messages** in the admin. Visitors can only insert through the rate-limited `submit_contact_message()` function (5 per hour per IP and per email); a hidden honeypot field drops most bots. Emailing is best-effort: if it fails or is not configured, the message is still saved.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key. Unset = no email is sent. |
| `CONTACT_NOTIFY_EMAIL` | Where enquiries are sent. Defaults to the contact email in Profile & settings. |
| `CONTACT_FROM_EMAIL` | Sender. Defaults to `Portfolio <onboarding@resend.dev>`. |

The Resend test sender `onboarding@resend.dev` only delivers to the email address of your own Resend account until you verify a domain and set `CONTACT_FROM_EMAIL` to an address on it.

## Deploy to Vercel

1. Import the repository in Vercel (framework preset: Next.js, default build settings).
2. Add the four environment variables from step 4 above to the project (Production and Preview). `SUPABASE_SERVICE_ROLE_KEY` is not needed at runtime and can be left out.
3. Add your production URL and the `/auth/callback` redirect in Supabase (step 5).
4. Deploy. Old `/index.html`, `/case-studies/<slug>.html` and `/articles/<slug>.html` URLs redirect to the new routes.

## How editing reflects live

Public pages read Supabase through cached functions tagged `settings`, `sections`, `posts`, `post:<type>:<slug>` and `media`. Each admin save validates the payload with Zod, writes through the row mappers, then calls `revalidateTag(tag, { expire: 0 })` for the affected tags and `revalidatePath("/", "layout")`. The next visitor request re-reads the database, so a published change is visible right after the "saved" toast. Drafts and hidden sections never reach the public queries (row level security only exposes published posts and visible sections to visitors).

## Project layout

```
content/seed.json            seed data (local mode source, input to seed:push)
legacy/                      the original static site (seed source only)
supabase/migrations/         database schema, RLS, storage bucket
scripts/                     seed-from-legacy.ts, push-seed.ts
src/lib/                     schema (Zod), mappers, data access, Supabase clients
src/lib/admin/               admin-only helpers (auth check, queries, revalidation, slugify)
src/app/admin/               admin pages and Server Actions (_actions/)
src/app/auth/callback/       magic-link code exchange
src/app/api/draft/           draft-mode entry for previews
src/proxy.ts                 session refresh + /admin redirect
```
