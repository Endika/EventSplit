-- supabase/migrations/0002_rpc_layer.sql
--
-- ADDITIVE (safe to apply while the old direct-access client is still live): adds the
-- SECURITY DEFINER RPC layer, server-side PIN (pgcrypto), size caps and PIN throttle.
-- It does NOT yet close direct table access or strip the blob's editPin — that is the
-- lockdown migration 0003, applied only after the RPC-based client is deployed, so there
-- is no downtime and the old client's PIN gate keeps working in the meantime.
--
-- Caps: MAX_EVENT_BYTES=524288. PIN throttle: 10 fails / 15 min. Hash salt: eventsplit-v1.

create extension if not exists pgcrypto with schema extensions;

-- Server-side mirror of the client EditPin hash: sha256("<pin>|<id>|eventsplit-v1") hex.
-- search_path lists extensions+public so digest() resolves wherever pgcrypto lives.
create or replace function public.eventsplit_pin_hash(p_pin text, p_id text)
returns text language sql immutable set search_path = extensions, public as $$
  select encode(digest(p_pin || '|' || p_id || '|eventsplit-v1', 'sha256'), 'hex');
$$;

-- Use the existing (currently unused) edit_pin column as the server-side source of truth.
-- Backfill it from the blob; do NOT strip data.editPin yet (the live old client still reads
-- it for its PIN gate) — 0003 strips it once the new client is live.
update public.events set edit_pin = data->>'editPin'
  where edit_pin is null and (data ? 'editPin') and data->>'editPin' is not null;

-- ---- PIN throttle -------------------------------------------------------------------
create table if not exists public.event_pin_attempts (
  event_id     varchar primary key references public.events(id) on delete cascade,
  fails        int not null default 0,
  window_start timestamptz not null default now()
);
alter table public.event_pin_attempts enable row level security;
revoke all on public.event_pin_attempts from anon, authenticated;

create or replace function public.eventsplit_pin_guard(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_fails int; v_start timestamptz;
begin
  select fails, window_start into v_fails, v_start
  from public.event_pin_attempts where event_id = p_id;
  if found and now() - v_start <= interval '15 minutes' and v_fails >= 10 then
    raise exception 'too many pin attempts' using errcode = 'PT429';
  end if;
end;
$$;

create or replace function public.eventsplit_pin_fail(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.event_pin_attempts (event_id, fails, window_start)
  values (p_id, 1, now())
  on conflict (event_id) do update
    set fails = case when now() - event_pin_attempts.window_start > interval '15 minutes'
                     then 1 else event_pin_attempts.fails + 1 end,
        window_start = case when now() - event_pin_attempts.window_start > interval '15 minutes'
                           then now() else event_pin_attempts.window_start end;
end;
$$;

create or replace function public.eventsplit_pin_ok(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.event_pin_attempts where event_id = p_id;
end;
$$;

revoke all on function public.eventsplit_pin_hash(text, text) from public, anon, authenticated;
revoke all on function public.eventsplit_pin_guard(text) from public, anon, authenticated;
revoke all on function public.eventsplit_pin_fail(text) from public, anon, authenticated;
revoke all on function public.eventsplit_pin_ok(text) from public, anon, authenticated;

-- ---- read RPCs ----------------------------------------------------------------------
create or replace function public.get_event(p_id text)
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'data', data - 'editPin',
    'version', version,
    'hasPin', edit_pin is not null
  )
  from public.events where id = p_id and active;
$$;

create or replace function public.get_event_version(p_id text)
returns int language sql security definer set search_path = '' as $$
  select version from public.events where id = p_id and active;
$$;

-- ---- write RPCs ---------------------------------------------------------------------
create or replace function public.create_event(p_id text, p_data jsonb, p_name text, p_created_by text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_clean jsonb;
begin
  if length(p_id) < 1 or length(p_id) > 64 then
    raise exception 'invalid event id' using errcode = 'PT400';
  end if;
  v_clean := p_data - 'editPin';
  if length(v_clean::text) > 524288 then
    raise exception 'event too large' using errcode = 'PT413';
  end if;
  insert into public.events (id, name, created_by, updated_by, data, version, edit_pin, active)
  values (p_id, p_name, p_created_by, p_created_by, v_clean, 1, null, true);
  return 1;
end;
$$;

create or replace function public.update_event(
  p_id text, p_data jsonb, p_name text, p_expected_version int, p_pin text
) returns int language plpgsql security definer set search_path = '' as $$
declare v_pin text; v_clean jsonb; v_new_version int;
begin
  select edit_pin into v_pin from public.events where id = p_id and active;
  if not found then
    raise exception 'event not found' using errcode = 'PT404';
  end if;
  if v_pin is not null then
    perform public.eventsplit_pin_guard(p_id);
    if p_pin is null or public.eventsplit_pin_hash(p_pin, p_id) <> v_pin then
      perform public.eventsplit_pin_fail(p_id);
      raise exception 'invalid pin' using errcode = 'PT401';
    end if;
    perform public.eventsplit_pin_ok(p_id);
  end if;
  v_clean := p_data - 'editPin';
  if length(v_clean::text) > 524288 then
    raise exception 'event too large' using errcode = 'PT413';
  end if;
  update public.events
  set data = v_clean, name = p_name, version = p_expected_version + 1, updated_at = now()
  where id = p_id and active and version = p_expected_version
  returning version into v_new_version;
  if v_new_version is null then
    raise exception 'version conflict' using errcode = 'PT409';
  end if;
  return v_new_version;
end;
$$;

create or replace function public.set_event_pin(p_id text, p_new_pin text, p_current_pin text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_pin text;
begin
  select edit_pin into v_pin from public.events where id = p_id and active;
  if not found then
    raise exception 'event not found' using errcode = 'PT404';
  end if;
  if v_pin is not null then
    perform public.eventsplit_pin_guard(p_id);
    if p_current_pin is null or public.eventsplit_pin_hash(p_current_pin, p_id) <> v_pin then
      perform public.eventsplit_pin_fail(p_id);
      raise exception 'invalid pin' using errcode = 'PT401';
    end if;
    perform public.eventsplit_pin_ok(p_id);
  end if;
  if p_new_pin is not null and p_new_pin !~ '^\d{4,6}$' then
    raise exception 'invalid pin format' using errcode = 'PT400';
  end if;
  update public.events
  set edit_pin = case when p_new_pin is null then null
                      else public.eventsplit_pin_hash(p_new_pin, p_id) end,
      version = version + 1, updated_at = now()
  where id = p_id and active;
end;
$$;

create or replace function public.verify_event_pin(p_id text, p_pin text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_pin text;
begin
  select edit_pin into v_pin from public.events where id = p_id and active;
  if not found then return false; end if;
  if v_pin is null then return true; end if;
  perform public.eventsplit_pin_guard(p_id);
  if public.eventsplit_pin_hash(p_pin, p_id) = v_pin then
    perform public.eventsplit_pin_ok(p_id);
    return true;
  end if;
  perform public.eventsplit_pin_fail(p_id);
  return false;
end;
$$;

-- Erasure (GDPR): hard delete, PIN-gated. SECURITY DEFINER bypasses the events_no_delete
-- policy. Cascades event_pin_attempts.
create or replace function public.delete_event(p_id text, p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_pin text;
begin
  select edit_pin into v_pin from public.events where id = p_id and active;
  if not found then
    raise exception 'event not found' using errcode = 'PT404';
  end if;
  if v_pin is not null then
    perform public.eventsplit_pin_guard(p_id);
    if p_pin is null or public.eventsplit_pin_hash(p_pin, p_id) <> v_pin then
      perform public.eventsplit_pin_fail(p_id);
      raise exception 'invalid pin' using errcode = 'PT401';
    end if;
    perform public.eventsplit_pin_ok(p_id);
  end if;
  delete from public.events where id = p_id;
end;
$$;

grant execute on function public.get_event(text) to anon;
grant execute on function public.get_event_version(text) to anon;
grant execute on function public.create_event(text, jsonb, text, text) to anon;
grant execute on function public.update_event(text, jsonb, text, int, text) to anon;
grant execute on function public.set_event_pin(text, text, text) to anon;
grant execute on function public.verify_event_pin(text, text) to anon;
grant execute on function public.delete_event(text, text) to anon;
