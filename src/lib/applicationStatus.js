// Shared across JobDetail (status editor) and JobCard (synced status badge
// on Search results) so both always agree on labels and colors.

export const STATUS_OPTIONS = [
  { key: 'not_applied', label: 'Not Applied' },
  { key: 'applied_pending', label: 'Applied?' },
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'not_selected', label: 'Not Selected' },
]

export const STATUS_COLOR = {
  not_applied: 'var(--color-text-muted)',
  applied_pending: 'var(--color-warning)',
  applied: 'var(--color-accent)',
  under_review: 'var(--color-warning)',
  shortlisted: 'var(--color-success)',
  not_selected: 'var(--color-danger)',
}

export function statusLabel(key) {
  return STATUS_OPTIONS.find((s) => s.key === key)?.label ?? key
}
