-- 0002_contact_messages.sql
-- Public contact form: messages table, admin-only RLS, and two SECURITY DEFINER functions the anon server action calls.
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and position('@' in email) > 0),
  phone text check (phone is null or char_length(phone) <= 40),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  email_sent boolean not null default false,  -- owner notification delivered
  ip_hash text,                               -- salted sha256, for rate limiting only
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages (status);

------------------------------------------------------------------------------
-- row level security: admins read/manage; nobody else touches the table directly
------------------------------------------------------------------------------

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon;

drop policy if exists "contact_messages admin select" on public.contact_messages;
create policy "contact_messages admin select" on public.contact_messages
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "contact_messages admin update" on public.contact_messages;
create policy "contact_messages admin update" on public.contact_messages
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "contact_messages admin delete" on public.contact_messages;
create policy "contact_messages admin delete" on public.contact_messages
  for delete to authenticated
  using ((select public.is_admin()));

------------------------------------------------------------------------------
-- submit_contact_message(): the only way to insert (visitors have no insert policy)
------------------------------------------------------------------------------

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := trim(coalesce(p_email, ''));
  v_id uuid;
begin
  if p_ip_hash is not null and (
    select count(*) from public.contact_messages
    where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many messages from your network. Please try again in an hour.';
  end if;

  if (
    select count(*) from public.contact_messages
    where lower(email) = lower(v_email) and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many messages from this email address. Please try again in an hour.';
  end if;

  insert into public.contact_messages (name, email, phone, message, ip_hash)
  values (trim(coalesce(p_name, '')), v_email, nullif(trim(coalesce(p_phone, '')), ''), trim(coalesce(p_message, '')), p_ip_hash)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text) to anon, authenticated;

------------------------------------------------------------------------------
-- mark_contact_email_sent(): lets the anon server action flag a just-created row
------------------------------------------------------------------------------

create or replace function public.mark_contact_email_sent(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.contact_messages
  set email_sent = true
  where id = p_id and created_at > now() - interval '10 minutes';
$$;

revoke all on function public.mark_contact_email_sent(uuid) from public;
grant execute on function public.mark_contact_email_sent(uuid) to anon, authenticated;
