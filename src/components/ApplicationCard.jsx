import { STATUS_OPTIONS, STATUS_COLOR, statusLabel } from '../lib/applicationStatus'

// Shared by Dashboard's Applications view and the Tracker page, so both
// always show the same card and status options.
export default function ApplicationCard({ application, onStatusChange, updating }) {
  const job = application.job_data
  const color = STATUS_COLOR[application.status] ?? 'var(--color-text-muted)'

  return (
    <div
      className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{job.title}</p>
          <span
            className="text-xs px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, ' + color + ' 18%, transparent)', color }}
          >
            {statusLabel(application.status)}
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] truncate">
          {job.company} · {job.location}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <select
          value={application.status}
          disabled={updating}
          onChange={(e) => onStatusChange(application.id, e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg border bg-transparent shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {application.external_url && (
          <a
            href={application.external_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs px-2 py-1 rounded-md shrink-0"
            style={{ color: 'var(--color-accent)', border: '1px solid var(--color-border)' }}
          >
            View listing
          </a>
        )}
      </div>
    </div>
  )
}
