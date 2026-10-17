-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run

-- 1. Resumes: one active resume per user (multiple rows allowed for history)
create table resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  file_path text not null,          -- path in Supabase Storage bucket
  file_name text not null,
  parsed_text text,
  parsed_skills text[],             -- extracted skill keywords
  is_default boolean not null default false, -- the resume used for match scoring elsewhere in the app
  uploaded_at timestamptz default now()
);

-- 2. Saved jobs: jobs the user bookmarked from search results
create table saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_source text not null,         -- 'adzuna' | 'arbeitnow' | 'remoteok' | 'lever'
  job_source_id text not null,      -- the source's own job id
  job_data jsonb not null,          -- snapshot of title/company/location/url/etc
  saved_at timestamptz default now(),
  unique (user_id, job_source, job_source_id)
);

-- 3. Applications: user's tracked applications (in-app tracker, not external status)
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_source text not null,
  job_source_id text not null,
  job_data jsonb not null,
  external_url text not null,       -- link to the real company/portal apply page
  status text not null default 'applied' check (status in ('applied', 'under_review', 'shortlisted', 'not_selected')),
  match_score int,                  -- 0-100, snapshot at time of application
  applied_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Match scores: resume-vs-job scoring results (kept for history/comparison)
create table match_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  resume_id uuid references resumes(id) on delete cascade not null,
  job_source text not null,
  job_source_id text not null,
  score int not null check (score >= 0 and score <= 100),
  matched_skills text[],
  missing_skills text[],
  computed_at timestamptz default now()
);

-- Row Level Security: every table is private to its own user
alter table resumes enable row level security;
alter table saved_jobs enable row level security;
alter table applications enable row level security;
alter table match_scores enable row level security;

create policy "Users manage their own resumes"
  on resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own saved jobs"
  on saved_jobs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own applications"
  on applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own match scores"
  on match_scores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for resume files (run separately if the SQL editor rejects storage DDL —
-- in that case create the bucket manually via Dashboard -> Storage -> New Bucket, name: "resumes", private)
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

create policy "Users manage their own resume files"
  on storage.objects for all
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
