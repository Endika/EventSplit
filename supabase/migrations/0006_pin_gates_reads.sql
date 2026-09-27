-- supabase/migrations/0006_pin_gates_reads.sql
--
-- ADDITIVE: the edit PIN now gates reads too. A new get_event(p_id, p_pin) overload
-- returns only {locked, hasPin} for a PIN-protected event unless the right PIN comes
-- with the call. The one-arg get_event(text) stays for the client still live; dropping
-- it is a separate lockdown step once the new client is deployed.
--
-- p_pin has no default on purpose: PostgREST picks an overload by argument names, and a
-- default would make {p_id} alone ambiguous between the two signatures.

-- Must stay VOLATILE (the default): it writes the fail, and PostgREST runs STABLE functions read-only.
create or replace function public.get_event(p_id text, p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.events%rowtype;
begin
  select * into v_row from public.events where id = p_id and active;
  if not found then
    return null;
  end if;
  if v_row.edit_pin is null then
    return jsonb_build_object('data', v_row.data - 'editPin', 'version', v_row.version,
                              'hasPin', false);
  end if;
  -- No PIN offered is not a guess, so it neither counts a fail nor hits the throttle.
  if p_pin is null then
    return jsonb_build_object('locked', true, 'hasPin', true);
  end if;
  perform public.eventsplit_pin_guard(p_id);
  if public.eventsplit_pin_hash(p_pin, p_id) <> v_row.edit_pin then
    perform public.eventsplit_pin_fail(p_id);
    return jsonb_build_object('locked', true, 'hasPin', true);
  end if;
  -- No eventsplit_pin_ok: a device syncing with its stored PIN would keep clearing
  -- the fails and hand a guesser unlimited tries. Only verify_event_pin resets.
  return jsonb_build_object('data', v_row.data - 'editPin', 'version', v_row.version,
                            'hasPin', true);
end;
$$;

grant execute on function public.get_event(text, text) to anon;
