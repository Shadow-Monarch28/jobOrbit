-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Fixes a typo in the applications_status_check constraint: it currently
-- allows 'applied successfully' instead of 'applied', so the app's
-- "Applied" status update was being rejected by the database.

alter table applications drop constraint if exists applications_status_check;

alter table applications
  add constraint applications_status_check
  check (status in ('not_applied', 'applied_pending', 'applied', 'under_review', 'shortlisted', 'not_selected'));
