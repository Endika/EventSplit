-- supabase/migrations/0008_pin_guard_lock.sql
--
-- eventsplit_pin_guard read `fails` without a lock, so a burst of parallel guesses all
-- passed the guard before any of their fails committed. The guard now makes sure the
-- attempts row exists and locks it: the lock lasts to the end of the calling RPC's
-- transaction, so each caller's compare + eventsplit_pin_fail runs after the previous
-- one committed. A correct attempt only takes the lock; it never changes the count.
--
-- The guard may now leave a fails=0 row behind. eventsplit_pin_fail treats such a row
-- as no row at all (count 1, window starts now), so a 0-fails row placed by an earlier
-- correct attempt can't start the 15-minute window early.

create or replace function public.eventsplit_pin_guard(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_fails int; v_start timestamptz;
begin
  insert into public.event_pin_attempts (event_id, fails, window_start)
  values (p_id, 0, now())
  on conflict do nothing;
  select fails, window_start into v_fails, v_start
  from public.event_pin_attempts where event_id = p_id
  for update;
  if now() - v_start <= interval '15 minutes' and v_fails >= 10 then
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
    set fails = case when event_pin_attempts.fails = 0
                       or now() - event_pin_attempts.window_start > interval '15 minutes'
                     then 1 else event_pin_attempts.fails + 1 end,
        window_start = case when event_pin_attempts.fails = 0
                              or now() - event_pin_attempts.window_start > interval '15 minutes'
                            then now() else event_pin_attempts.window_start end;
end;
$$;

revoke all on function public.eventsplit_pin_guard(text) from public, anon, authenticated;
revoke all on function public.eventsplit_pin_fail(text) from public, anon, authenticated;
