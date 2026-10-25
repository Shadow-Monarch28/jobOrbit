-- Lets the app receive live changes to ai_sessions, so a mock interview
-- answered on one device appears on the other almost instantly.
-- Safe to run more than once.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_sessions'
  ) then
    alter publication supabase_realtime add table public.ai_sessions;
  end if;
end $$;

-- Row-level security still applies: each user only receives their own rows.
