-- 0001_init.sql
-- Portfolio CMS schema: tables, indexes, updated_at triggers, is_admin(), RLS, `media` storage bucket.
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
--
-- After applying, grant yourself admin (use the email you sign in with, lowercase):
--   insert into public.admins (email) values ('you@example.com') on conflict do nothing;

------------------------------------------------------------------------------
-- helpers
------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

------------------------------------------------------------------------------
-- tables
------------------------------------------------------------------------------

-- Admin allow-list. Emails are matched against the signed-in user's JWT email claim.
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admins_email_lowercase check (email = lower(email))
);

-- Must exist before the tables that reference it.
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,            -- object path inside the `media` storage bucket
  mime text not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt text not null default '',
  blur_data_url text,
  bytes bigint check (bytes is null or bytes >= 0),
  created_at timestamptz not null default now()
);

-- Single-row site configuration (id is pinned to 1).
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  name text not null,
  site_title text not null,
  seo_description text not null default '',
  og_title text,
  og_description text,
  hero jsonb not null default '{}'::jsonb,
  marquee text[] not null default '{}',
  nav jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  footer_tagline text not null default '',
  resume_media_id uuid references public.media (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  key text primary key check (key in (
    'about', 'journey', 'expertise', 'work', 'playbook', 'metrics',
    'gallery', 'testimonials', 'brain', 'writing', 'contact'
  )),
  eyebrow text not null default '',
  heading text not null default '',
  intro text not null default '',
  visible boolean not null default true,
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('case_study', 'article')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  title text not null,
  subtitle text not null default '',
  tag text not null default '',
  card_label text,
  excerpt text,
  read_time_minutes integer check (read_time_minutes is null or read_time_minutes > 0),
  cover_media_id uuid references public.media (id) on delete set null,
  card_aspect text check (card_aspect is null or card_aspect ~ '^[0-9]+/[0-9]+$'),
  meta jsonb not null default '[]'::jsonb,   -- [{label, value}]
  body jsonb not null default '[]'::jsonb,   -- Block[]
  skills text[] not null default '{}',
  takeaway text not null default '',
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (type, slug)
);

------------------------------------------------------------------------------
-- indexes (primary keys / unique constraints already cover id, key, path, (type, slug))
------------------------------------------------------------------------------

create index if not exists posts_listing_idx on public.posts (type, status, sort_order);
create index if not exists posts_cover_media_idx on public.posts (cover_media_id) where cover_media_id is not null;
create index if not exists sections_sort_idx on public.sections (sort_order);
create index if not exists site_settings_resume_media_idx on public.site_settings (resume_media_id) where resume_media_id is not null;

------------------------------------------------------------------------------
-- triggers
------------------------------------------------------------------------------

create or replace function public.posts_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- first publish stamps published_at; unpublishing keeps the original date
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

drop trigger if exists sections_set_updated_at on public.sections;
create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

drop trigger if exists posts_before_write on public.posts;
create trigger posts_before_write
  before insert or update on public.posts
  for each row execute function public.posts_before_write();

------------------------------------------------------------------------------
-- is_admin()
------------------------------------------------------------------------------

-- SECURITY DEFINER so it can read `admins` even though that table is locked down by RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

------------------------------------------------------------------------------
-- row level security
------------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.sections enable row level security;
alter table public.posts enable row level security;
alter table public.media enable row level security;

-- anon / signed-in visitors never write
revoke insert, update, delete, truncate on public.admins, public.site_settings, public.sections, public.posts, public.media from anon;
-- `admins` is only ever read through is_admin() or managed by service_role / admins
revoke all on public.admins from anon;

-- admins: only admins can see or manage the allow-list
drop policy if exists "admins admin all" on public.admins;
create policy "admins admin all" on public.admins
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- site_settings
drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read" on public.site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "site_settings admin all" on public.site_settings;
create policy "site_settings admin all" on public.site_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- sections: visitors see visible sections only
drop policy if exists "sections public read" on public.sections;
create policy "sections public read" on public.sections
  for select to anon, authenticated
  using (visible);

drop policy if exists "sections admin all" on public.sections;
create policy "sections admin all" on public.sections
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- posts: visitors see published posts only
drop policy if exists "posts public read" on public.posts;
create policy "posts public read" on public.posts
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists "posts admin all" on public.posts;
create policy "posts admin all" on public.posts
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- media rows are public (the files are public too)
drop policy if exists "media public read" on public.media;
create policy "media public read" on public.media
  for select to anon, authenticated
  using (true);

drop policy if exists "media admin all" on public.media;
create policy "media admin all" on public.media
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

------------------------------------------------------------------------------
-- storage: public bucket `media`
------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 15 * 1024 * 1024,
  array['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media bucket public read" on storage.objects;
create policy "media bucket public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

drop policy if exists "media bucket admin insert" on storage.objects;
create policy "media bucket admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

drop policy if exists "media bucket admin update" on storage.objects;
create policy "media bucket admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

drop policy if exists "media bucket admin delete" on storage.objects;
create policy "media bucket admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
