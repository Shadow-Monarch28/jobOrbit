-- AI Prep feature: stores mock-interview conversations and resume reviews.
-- mode: 'mock_interview' (multi-turn, messages grows each turn) or
--       'resume_review' (single-shot, result filled immediately).
create table ai_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  application_id uuid references applications(id) on delete cascade,
  mode text not null check (mode in ('mock_interview', 'resume_review')),
  messages jsonb not null default '[]'::jsonb,
  result jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table ai_sessions enable row level security;

create policy "Users manage their own ai sessions"
  on ai_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keeps updated_at current on every turn, mirroring the pattern already
-- used nowhere else in this schema but good practice for a growing row.
create or replace function set_ai_sessions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger ai_sessions_updated_at
  before update on ai_sessions
  for each row execute function set_ai_sessions_updated_at();
