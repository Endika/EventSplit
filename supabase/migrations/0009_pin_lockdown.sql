-- supabase/migrations/0009_pin_lockdown.sql
--
-- LOCKDOWN: the client that always sends p_pin is live in prod. Drop the one-arg
-- get_event(text) overload that let reads skip the PIN gate entirely.

revoke execute on function public.get_event(text) from public, anon, authenticated;
drop function public.get_event(text);

notify pgrst, 'reload schema';
