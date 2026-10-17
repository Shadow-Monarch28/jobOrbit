-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Adds Skill Builder support to the existing ai_sessions table:
--   - 'skill_builder' as a valid mode alongside mock_interview/resume_review
--   - skill_name: which skill gap this session is practicing (skill gaps
--     come from resume_review sessions' result.missingSkills, which are
--     arbitrary free-text strings extracted by the AI from real job
--     descriptions — not a fixed list, so they can't be pre-written content
--     the way the 11 interview categories are)

alter table ai_sessions drop constraint if exists ai_sessions_mode_check;

alter table ai_sessions
  add constraint ai_sessions_mode_check
  check (mode in ('mock_interview', 'resume_review', 'skill_builder'));

alter table ai_sessions add column if not exists skill_name text;
