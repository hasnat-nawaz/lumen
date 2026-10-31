-- Lumen database schema.
-- Run this whole file once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 280),
  created_by uuid not null default auth.uid() references public.members (id),
  created_at timestamptz not null default now()
);

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  authors text not null default '' check (char_length(authors) <= 300),
  year int check (year between 1900 and 2100),
  pdf_path text,
  external_url text check (external_url is null or external_url ~* '^https?://'),
  created_by uuid not null default auth.uid() references public.members (id),
  created_at timestamptz not null default now(),
  unique (domain_id, slug)
);

create index if not exists papers_domain_created_idx
  on public.papers (domain_id, created_at desc);

create table if not exists public.paper_sections (
  paper_id uuid not null references public.papers (id) on delete cascade,
  key text not null check (
    key in ('overview', 'explanation', 'hardware', 'software', 'gaps', 'notes')
  ),
  body text not null default '' check (char_length(body) <= 50000),
  updated_by uuid not null default auth.uid() references public.members (id),
  updated_at timestamptz not null default now(),
  primary key (paper_id, key)
);

-- Chat messages are permanent: no update/delete policies, plus triggers below.
-- author_id has no ON DELETE action, so a member with messages cannot be removed.
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  client_id uuid not null unique default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.members (id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_created_idx
  on public.messages (created_at desc, id desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members where id = auth.uid() and role = 'admin'
  );
$$;

-- PIN-only login: maps a PIN to the member's login email.
-- The PIN is the member's Supabase Auth password, so this checks it against the stored hash.
create or replace function public.email_for_pin(pin text)
returns text
language plpgsql
stable
security definer
set search_path = public, auth, extensions
as $$
declare
  result text;
begin
  if pin is null or pin !~ '^[0-9]{6,12}$' then
    return null;
  end if;

  select u.email
    into result
    from auth.users u
    join public.members m on m.id = u.id
   where u.encrypted_password = extensions.crypt(pin, u.encrypted_password)
   limit 1;

  return result;
end;
$$;

revoke all on function public.email_for_pin(text) from public;
grant execute on function public.email_for_pin(text) to anon, authenticated;

create or replace function public.stamp_section_edit()
returns trigger
language plpgsql
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists paper_sections_stamp on public.paper_sections;
create trigger paper_sections_stamp
  before insert or update on public.paper_sections
  for each row execute function public.stamp_section_edit();

create or replace function public.messages_are_permanent()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Lumen chat history is permanent and cannot be changed or deleted';
end;
$$;

drop trigger if exists messages_no_change on public.messages;
create trigger messages_no_change
  before update or delete on public.messages
  for each row execute function public.messages_are_permanent();

drop trigger if exists messages_no_truncate on public.messages;
create trigger messages_no_truncate
  before truncate on public.messages
  for each statement execute function public.messages_are_permanent();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.members enable row level security;
alter table public.domains enable row level security;
alter table public.papers enable row level security;
alter table public.paper_sections enable row level security;
alter table public.messages enable row level security;

grant select on public.members to authenticated;
grant select, insert, update, delete on public.domains to authenticated;
grant select, insert, update, delete on public.papers to authenticated;
grant select, insert, update on public.paper_sections to authenticated;
grant select, insert on public.messages to authenticated;

drop policy if exists "members can see members" on public.members;
create policy "members can see members" on public.members
  for select to authenticated using (public.is_member());

drop policy if exists "members read domains" on public.domains;
create policy "members read domains" on public.domains
  for select to authenticated using (public.is_member());
drop policy if exists "members add domains" on public.domains;
create policy "members add domains" on public.domains
  for insert to authenticated
  with check (public.is_member() and created_by = auth.uid());
drop policy if exists "members edit domains" on public.domains;
create policy "members edit domains" on public.domains
  for update to authenticated
  using (public.is_member()) with check (public.is_member());
drop policy if exists "admin deletes domains" on public.domains;
create policy "admin deletes domains" on public.domains
  for delete to authenticated using (public.is_admin());

drop policy if exists "members read papers" on public.papers;
create policy "members read papers" on public.papers
  for select to authenticated using (public.is_member());
drop policy if exists "members add papers" on public.papers;
create policy "members add papers" on public.papers
  for insert to authenticated
  with check (public.is_member() and created_by = auth.uid());
drop policy if exists "members edit papers" on public.papers;
create policy "members edit papers" on public.papers
  for update to authenticated
  using (public.is_member()) with check (public.is_member());
drop policy if exists "admin deletes papers" on public.papers;
create policy "admin deletes papers" on public.papers
  for delete to authenticated using (public.is_admin());

drop policy if exists "members read sections" on public.paper_sections;
create policy "members read sections" on public.paper_sections
  for select to authenticated using (public.is_member());
drop policy if exists "members write sections" on public.paper_sections;
create policy "members write sections" on public.paper_sections
  for insert to authenticated with check (public.is_member());
drop policy if exists "members edit sections" on public.paper_sections;
create policy "members edit sections" on public.paper_sections
  for update to authenticated
  using (public.is_member()) with check (public.is_member());

drop policy if exists "members read chat" on public.messages;
create policy "members read chat" on public.messages
  for select to authenticated using (public.is_member());
drop policy if exists "members send chat" on public.messages;
create policy "members send chat" on public.messages
  for insert to authenticated
  with check (public.is_member() and author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime chat
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- PDF storage (private bucket, 50 MB per file, PDFs only)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('papers', 'papers', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "members read pdfs" on storage.objects;
create policy "members read pdfs" on storage.objects
  for select to authenticated
  using (bucket_id = 'papers' and public.is_member());

drop policy if exists "members upload pdfs" on storage.objects;
create policy "members upload pdfs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'papers' and public.is_member());

drop policy if exists "admin deletes pdfs" on storage.objects;
create policy "admin deletes pdfs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'papers' and public.is_admin());
