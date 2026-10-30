-- Resume Builder: built resumes and cover letters live in the same table as
-- uploaded resumes, so "default resume" (match scores, reviews, interviews)
-- keeps working no matter where the default came from. Safe to re-run.
alter table public.resumes alter column file_path drop not null;

alter table public.resumes add column if not exists source text not null default 'upload';   -- 'upload' | 'builder'
alter table public.resumes add column if not exists doc_type text not null default 'resume'; -- 'resume' | 'cover_letter'
alter table public.resumes add column if not exists title text;
alter table public.resumes add column if not exists content jsonb;       -- structured resume / letter
alter table public.resumes add column if not exists template_id text;
alter table public.resumes add column if not exists target_job jsonb;    -- job this one was tailored for
alter table public.resumes add column if not exists ats_score integer;
alter table public.resumes add column if not exists updated_at timestamptz not null default now();
