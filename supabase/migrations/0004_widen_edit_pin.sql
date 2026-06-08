-- supabase/migrations/0004_widen_edit_pin.sql
--
-- The legacy edit_pin column was varchar(60), but the server-side PIN hash (sha256 hex from
-- eventsplit_pin_hash) is 64 chars, so set_event_pin failed with 22001 "value too long".
-- The old client never used this column (it kept the hash in data.editPin), which is why the
-- mismatch only surfaced once 0002 made edit_pin the source of truth. Widen to text.
alter table public.events alter column edit_pin type text;
