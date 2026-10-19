-- 0003_admin_client_split.sql
-- Admin and public site are separate deployments: draft preview now uses one-time tokens (no admin session on the
-- public site), and uploads are optimised server-side so the original size is recorded.
-- Additive and safe to re-run (IF NOT EXISTS / CREATE OR REPLACE, no destructive statements).

------------------------------------------------------------------------------
-- preview_tokens: created by the admin app, exchanged by the public site's /api/draft
------------------------------------------------------------------------------

create table if not exists public.preview_tokens (
  token text primary key,                                   -- 32 random bytes, base64url
  post_id uuid not null references public.posts (id) on delete cascade,
  created_by text,                                          -- admin email, for the record
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour'
);

alter table public.preview_tokens enable row level security;
revoke all on public.preview_tokens from anon;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'preview_tokens' and policyname = 'preview_tokens admin insert') then
    create policy "preview_tokens admin insert" on public.preview_tokens
      for insert to authenticated
      with check ((select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'preview_tokens' and policyname = 'preview_tokens admin select') then
    create policy "preview_tokens admin select" on public.preview_tokens
      for select to authenticated
      using ((select public.is_admin()));
  end if;
end
$$;

------------------------------------------------------------------------------
-- preview_post(): the only way for visitors to read a draft, and only with a live token
------------------------------------------------------------------------------

create or replace function public.preview_post(p_token text)
returns setof public.posts
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.posts p
  join public.preview_tokens t on t.post_id = p.id
  where t.token = p_token
    and t.expires_at > now();
$$;

revoke all on function public.preview_post(text) from public;
grant execute on function public.preview_post(text) to anon, authenticated;

------------------------------------------------------------------------------
-- media.original_bytes: size of the upload before optimisation (null for older files)
------------------------------------------------------------------------------

alter table public.media add column if not exists original_bytes bigint;
