-- supabase/migrations/0007_pin_fails_stick.sql
--
-- The write RPCs recorded a wrong PIN with eventsplit_pin_fail and then raised PT401,
-- which rolled the recorded fail back: wrong PINs on writes never reached the throttle.
-- They now return a wrong-PIN outcome instead of raising, so the fail commits. The
-- PT429 raise from eventsplit_pin_guard stays (nothing to persist there).
--
-- A correct PIN on a write no longer calls eventsplit_pin_ok either: only a successful
-- verify_event_pin (a person typing the PIN) clears the fails.
--
-- Wrong-PIN outcomes:
--   update_event   → 0 (keeps its int return; real versions start at 1)
--   set_event_pin  → false (void → boolean, so drop + create)
--   delete_event   → false (void → boolean, so drop + create)
-- Not a lockdown: the one-arg get_event(text) stays.

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
      return 0;
    end if;
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

drop function public.set_event_pin(text, text, text);
create function public.set_event_pin(p_id text, p_new_pin text, p_current_pin text)
returns boolean language plpgsql security definer set search_path = '' as $$
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
      return false;
    end if;
  end if;
  if p_new_pin is not null and p_new_pin !~ '^\d{4,6}$' then
    raise exception 'invalid pin format' using errcode = 'PT400';
  end if;
  update public.events
  set edit_pin = case when p_new_pin is null then null
                      else public.eventsplit_pin_hash(p_new_pin, p_id) end,
      version = version + 1, updated_at = now()
  where id = p_id and active;
  return true;
end;
$$;

drop function public.delete_event(text, text);
create function public.delete_event(p_id text, p_pin text)
returns boolean language plpgsql security definer set search_path = '' as $$
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
      return false;
    end if;
  end if;
  -- Cascades event_pin_attempts.
  delete from public.events where id = p_id;
  return true;
end;
$$;

grant execute on function public.set_event_pin(text, text, text) to anon;
grant execute on function public.delete_event(text, text) to anon;
