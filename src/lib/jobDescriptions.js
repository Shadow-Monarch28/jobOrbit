// Pasted job descriptions ("Mission Briefs"). They live in the saved_jobs table with
// job_source = 'pasted', so the ATS Radar, the resume builder pickers and the mock
// interview (which already accepts a saved_jobs id) can all use them.
import { supabase } from './supabase'

export const PASTED = 'pasted'
export const MIN_DESCRIPTION = 40

export async function listBriefs(userId) {
  const { data, error } = await supabase
    .from('saved_jobs')
    .select('id, job_data, saved_at')
    .eq('user_id', userId)
    .eq('job_source', PASTED)
    .order('saved_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function saveBrief({ userId, title, company = '', description }) {
  const text = (description || '').trim()
  if (text.length < MIN_DESCRIPTION) throw new Error(`Paste a little more: at least ${MIN_DESCRIPTION} characters.`)
  const sourceId = crypto.randomUUID()
  const job = { title: (title || '').trim() || 'Untitled role', company: (company || '').trim(), description: text, source: PASTED, sourceId, location: '', url: '' }
  const { data, error } = await supabase
    .from('saved_jobs')
    .insert({ user_id: userId, job_source: PASTED, job_source_id: sourceId, job_data: job })
    .select('id, job_data, saved_at')
    .single()
  if (error) throw error
  return data
}

export async function deleteBriefs(userId, ids) {
  const { error } = await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_source', PASTED).in('id', ids)
  if (error) throw error
}
