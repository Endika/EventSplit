-- supabase/migrations/0003_lockdown.sql
--
-- LOCKDOWN — apply ONLY after the RPC-based client is live in production. It removes direct
-- table access (closing the open-RLS posture) and strips the leaked PIN hash from the blob.
-- Applying it before the new client is deployed would break the live app, so it is a
-- deliberate post-deploy step.

-- Close direct access. RLS stays enabled with no policies => anon/authenticated get nothing
-- directly; everything goes through the RPCs from 0002.
drop policy if exists events_select_all on public.events;
drop policy if exists events_insert_all on public.events;
drop policy if exists events_update_all on public.events;
drop policy if exists events_no_delete on public.events;
revoke all on public.events from anon, authenticated;

-- Now that no client reads the blob directly, drop the leaked PIN hash from it (the column
-- public.events.edit_pin is the source of truth, backfilled in 0002).
update public.events set data = data - 'editPin' where data ? 'editPin';

-- PII tagging (GDPR): make the personal-data posture explicit for audits.
comment on table public.events is
  'Expense-split events. data jsonb holds PERSONAL DATA of third parties incl. possible MINORS (kind=child): names, optional email/phone, and SPECIAL-CATEGORY health data (allergies). Lawful basis: legitimate interest in providing the shared expense tracker; minimized (no accounts). Erasure: delete_event RPC. No time-based retention (financial record the group revisits) — kept until the host deletes it.';
comment on column public.events.data is 'Personal data incl. special category (health: allergies) and possible minors. See table comment.';
comment on column public.events.edit_pin is 'Server-side edit-PIN hash (sha256, salted eventsplit-v1). Not personal data of guests.';
