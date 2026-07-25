create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  language text not null default 'Luau',
  status text not null default 'Draft' check (status in ('Protected', 'Draft', 'Processing')),
  source_code text default '',
  protected_code text default '',
  protection_options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  endpoint text,
  status text not null default 'Draft',
  created_at timestamptz not null default now()
);

create table if not exists public.protection_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'mopsfl',
  method text not null,
  options jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.deployments enable row level security;
alter table public.protection_jobs enable row level security;
alter table public.api_keys enable row level security;

create policy "Users manage their projects" on public.projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users manage their deployments" on public.deployments for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users manage their protection jobs" on public.protection_jobs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Users manage their API keys" on public.api_keys for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
