-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Lets a saved job carry a small note (e.g. "not_applied") when it's moved
-- back from Applications, so the card can show it was previously tracked.

alter table saved_jobs add column if not exists status_note text;
