import { supabase } from './supabase'
import { extractSkillsFromText } from './matchingEngine'
import { resumeToText, coverLetterToText, linesToModel, emptyResume } from './resumeModel'

// Resumes, built resumes and cover letters share the `resumes` table.
export const isCover = (r) => r?.doc_type === 'cover_letter'
export const isBuilt = (r) => r?.source === 'builder'
export const isResumeDoc = (r) => !isCover(r)

export function docTitle(r) {
  return r.title || r.file_name?.replace(/\.(pdf|docx)$/i, '') || 'Untitled'
}

export async function listDocs(userId) {
  const { data, error } = await supabase.from('resumes').select('*').eq('user_id', userId)
  if (error) throw error
  const rows = data ?? []
  rows.sort((a, b) => new Date(b.updated_at || b.uploaded_at) - new Date(a.updated_at || a.uploaded_at))
  return rows
}

// Saved jobs and applications, merged into one list for the pickers.
export async function listJobs(userId) {
  const [{ data: saved }, { data: apps }] = await Promise.all([
    supabase.from('saved_jobs').select('id, job_data').eq('user_id', userId),
    supabase.from('applications').select('id, job_data').eq('user_id', userId),
  ])
  const seen = new Set()
  const out = []
  for (const [list, kind] of [[apps, 'application'], [saved, 'saved']]) {
    for (const row of list ?? []) {
      const job = row.job_data
      if (!job?.title) continue
      const key = `${job.source}:${job.sourceId}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ key, kind, id: row.id, job })
    }
  }
  return out
}

export async function saveDoc({ userId, id, docType = 'resume', title, content, templateId, targetJob = null, atsScore = null, makeDefault = false, hasAnyResume = false }) {
  const isLetter = docType === 'cover_letter'
  const parsedText = isLetter ? coverLetterToText(content) : resumeToText(content)
  const fields = {
    title,
    file_name: `${title}.pdf`,
    doc_type: docType,
    source: 'builder',
    content,
    template_id: templateId,
    target_job: targetJob,
    ats_score: atsScore,
    parsed_text: parsedText,
    parsed_skills: isLetter ? [] : extractSkillsFromText(parsedText),
    updated_at: new Date().toISOString(),
  }
  if (id) {
    const { data, error } = await supabase.from('resumes').update(fields).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('resumes')
    .insert({ ...fields, user_id: userId, file_path: null, uploaded_at: new Date().toISOString(), is_default: !isLetter && (makeDefault || !hasAnyResume) })
    .select()
    .single()
  if (error) throw error
  if (!isLetter && makeDefault && hasAnyResume) await setDefaultDoc(userId, data.id)
  return data
}

export async function setDefaultDoc(userId, id) {
  const { error: e1 } = await supabase.from('resumes').update({ is_default: false }).eq('user_id', userId)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('resumes').update({ is_default: true }).eq('id', id).eq('user_id', userId)
  if (e2) throw e2
}

// Deletes the file (uploads only) and the row; if the default goes, the newest
// remaining resume (never a cover letter) becomes the default.
export async function deleteDocs(userId, rows, allRows) {
  for (const r of rows) {
    if (r.file_path) {
      const { error } = await supabase.storage.from('resumes').remove([r.file_path])
      if (error) throw new Error(`Couldn't delete the file for "${docTitle(r)}": ${error.message}`)
    }
    const { error } = await supabase.from('resumes').delete().eq('id', r.id).eq('user_id', userId)
    if (error) throw error
  }
  const gone = new Set(rows.map((r) => r.id))
  const remaining = allRows.filter((r) => !gone.has(r.id) && isResumeDoc(r))
  if (rows.some((r) => r.is_default) && remaining.length > 0 && !remaining.some((r) => r.is_default)) {
    await supabase.from('resumes').update({ is_default: true }).eq('id', remaining[0].id).eq('user_id', userId)
  }
}

// An editable model for any resume row: built ones carry it; uploaded files are
// re-read from storage (best effort) and mapped into sections.
export async function loadModel(row) {
  if (row?.content && typeof row.content === 'object') return { model: row.content, imported: false }
  if (!row?.file_path) return { model: emptyResume(), imported: false }
  const { data, error } = await supabase.storage.from('resumes').download(row.file_path)
  if (error || !data) throw new Error("Couldn't open the uploaded file to edit it.")
  const file = new File([data], row.file_name || 'resume.pdf', { type: data.type })
  const { extractStructuredLines } = await import('./resumeExtract')
  const lines = await extractStructuredLines(file)
  return { model: linesToModel(lines), imported: true }
}
