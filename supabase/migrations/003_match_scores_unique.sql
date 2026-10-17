-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Adds the unique constraint needed for upserting match scores by
-- (resume_id, job_source, job_source_id) from SavedJobsMatchSection.

alter table match_scores
  add constraint match_scores_resume_job_unique
  unique (resume_id, job_source, job_source_id);