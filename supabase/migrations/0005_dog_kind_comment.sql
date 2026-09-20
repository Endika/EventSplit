-- The GDPR table comment enumerates the participant kinds stored in data.users.
-- A third kind ('dog') now exists and is NOT personal data, so the comment is
-- restated to avoid implying that every kind describes a person.
comment on table public.events is
  'Expense-split events. data jsonb holds PERSONAL DATA of third parties incl. possible MINORS (kind=child): names, optional email/phone, and SPECIAL-CATEGORY health data (allergies). Non-human attendees (kind=dog) carry a name only and are not personal data. Lawful basis: legitimate interest in providing the shared expense tracker; minimized (no accounts). Erasure: delete_event RPC. No time-based retention (financial record the group revisits) — kept until the host deletes it.';
