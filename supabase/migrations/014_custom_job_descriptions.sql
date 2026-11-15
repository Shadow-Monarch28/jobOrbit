-- Lets a mock interview run against a saved job description (a pasted one has no application row).
alter table ai_sessions
  add column if not exists saved_job_id uuid references saved_jobs(id) on delete cascade;

create index if not exists ai_sessions_saved_job_idx on ai_sessions (saved_job_id);
