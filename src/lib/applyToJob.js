import { supabase } from './supabase'

// Shared by JobCard, JobDetail, and the saved-job cards (Dashboard, My
// Resume) so "Apply" always creates an application record the same way.
// A unique-constraint violation (code 23505) just means it's already
// tracked — treated as success, not an error.
export async function createApplicationIfNeeded({ userId, job, matchScore }) {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: userId,
      job_source: job.source,
      job_source_id: job.sourceId,
      job_data: job,
      external_url: job.url,
      status: 'applied_pending',
      match_score: matchScore ?? null,
    })
    .select()
  if (error && error.code !== '23505') {
    console.error('Failed to create application:', error.message)
    return { error, data: null }
  }
  return { error: null, data: data?.[0] ?? null }
}

// Shared by Dashboard and Tracker: setting an application's status to
// "Not Applied" moves the row back to saved_jobs (tagged so the card shows
// it was previously tracked) instead of just changing a status value.
export async function moveToNotApplied({ userId, application }) {
  const { data, error } = await supabase
    .from('saved_jobs')
    .upsert(
      {
        user_id: userId,
        job_source: application.job_source,
        job_source_id: application.job_source_id,
        job_data: application.job_data,
        status_note: 'not_applied',
      },
      { onConflict: 'user_id,job_source,job_source_id' }
    )
    .select()

  if (error) {
    console.error('Failed to move job back to saved jobs:', error.message)
    return { error, savedJob: null }
  }

  const { error: deleteError } = await supabase.from('applications').delete().eq('id', application.id)
  if (deleteError) {
    console.error('Failed to remove old application row:', deleteError.message)
    return { error: deleteError, savedJob: null }
  }

  return { error: null, savedJob: data?.[0] ?? null }
}
