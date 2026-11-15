-- Which resume a mock interview was started with (so follow-up questions can use it too).
alter table ai_sessions
  add column if not exists resume_id uuid references resumes(id) on delete set null;
