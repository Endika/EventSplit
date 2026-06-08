-- supabase/migrations/0001_init.sql
--
-- Baseline schema, captured from the live project (eventsplit-prod) on 2026-06-08.
-- The DB pre-dated versioned migrations; this file documents what was already deployed
-- so later migrations have a reproducible starting point. It is idempotent and matches
-- prod — re-applying it is a no-op.

create table if not exists public.events (
  id         varchar primary key,
  name       varchar not null,
  created_by varchar not null,
  data       jsonb   not null,
  version    integer not null default 1,
  edit_pin   varchar,
  updated_by varchar,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  active     boolean not null default true
);

create index if not exists events_updated_idx on public.events using btree (updated_at desc);

alter table public.events enable row level security;

-- Open posture (the original design): anyone with the anon key can read/insert/update;
-- deletes are blocked. Hardened in later migrations.
create policy events_select_all on public.events for select using (true);
create policy events_insert_all on public.events for insert with check (true);
create policy events_update_all on public.events for update using (true) with check (true);
create policy events_no_delete on public.events for delete using (false);

-- Stale-client write guard: reject an UPDATE whose blob carries a lower _schemaVersion than
-- what is stored. Raises PT426 (PostgREST -> HTTP 426).
create or replace function public.reject_stale_event_writes()
returns trigger language plpgsql set search_path to '' as $$
begin
  if coalesce((new.data->>'_schemaVersion')::int, 0)
   < coalesce((old.data->>'_schemaVersion')::int, 0) then
    raise exception
      'client schema % is older than stored %',
      coalesce((new.data->>'_schemaVersion')::int, 0),
      coalesce((old.data->>'_schemaVersion')::int, 0)
      using errcode = 'PT426',
            hint = 'Reload the app to update to the latest version.';
  end if;
  return new;
end;
$$;

create trigger guard_event_schema_version
  before update on public.events
  for each row execute function public.reject_stale_event_writes();
