// Original, free-to-use resume and cover-letter designs. Each template is
// described by data (font, colour, layout, section order) and tagged in the
// four groups the gallery filters by. The same description drives the on-screen
// preview and the PDF, so what you see is what you download.

export const TEMPLATE_CATEGORIES = {
  vibe: { label: 'Design & Vibe', values: ['Classic', 'Modern', 'Minimal', 'Bold', 'Elegant', 'Creative'] },
  level: { label: 'Career Level / Stage', values: ['Student / Fresher', 'Early Career', 'Mid-Level', 'Senior / Executive', 'Career Changer'] },
  industry: { label: 'Industry & Role', values: ['Tech & Engineering', 'Data & Analytics', 'Business & Finance', 'Marketing & Creative', 'Sales & Customer', 'Healthcare', 'Operations & HR', 'General'] },
  format: { label: 'Format & Structure', values: ['Chronological', 'Functional (Skills-first)', 'Hybrid', 'One-page', 'Two-column', 'Long-form CV'] },
}

const ORDER = {
  standard: ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'extra'],
  student: ['summary', 'education', 'skills', 'projects', 'experience', 'certifications', 'extra'],
  skillsFirst: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'extra'],
}

// layout: 'single' | 'sidebar' (left column) | 'banner' (coloured name band)
// heading: 'rule' | 'plain' | 'bar' | 'accent' | 'small'
export const RESUME_TEMPLATES = [
  { id: 'classic', name: 'Classic Professional', blurb: 'Centred header, serif type, thin rules.', font: 'serif', accent: '#1f2937', layout: 'single', heading: 'rule', align: 'center', order: 'standard',
    tags: { vibe: ['Classic', 'Elegant'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Business & Finance', 'Healthcare', 'General'], format: ['Chronological'] } },
  { id: 'modern', name: 'Modern Clean', blurb: 'Crisp sans-serif with an accent underline.', font: 'sans', accent: '#5b55d9', layout: 'single', heading: 'accent', align: 'left', order: 'standard',
    tags: { vibe: ['Modern', 'Minimal'], level: ['Early Career', 'Mid-Level'], industry: ['Tech & Engineering', 'Marketing & Creative', 'General'], format: ['Chronological', 'One-page'] } },
  { id: 'minimal', name: 'Minimal Compact', blurb: 'Tight, quiet and fits on one page.', font: 'sans', accent: '#374151', layout: 'single', heading: 'plain', align: 'left', order: 'standard', compact: true,
    tags: { vibe: ['Minimal'], level: ['Student / Fresher', 'Early Career'], industry: ['Tech & Engineering', 'Data & Analytics', 'General'], format: ['One-page', 'Chronological'] } },
  { id: 'sidebar', name: 'Sidebar Pro', blurb: 'Skills and contact in a tinted side column.', font: 'sans', accent: '#0f766e', layout: 'sidebar', heading: 'plain', align: 'left', order: 'standard',
    tags: { vibe: ['Modern', 'Bold'], level: ['Early Career', 'Mid-Level'], industry: ['Marketing & Creative', 'Operations & HR', 'General'], format: ['Two-column', 'One-page'] } },
  { id: 'executive', name: 'Executive Banner', blurb: 'Navy name band, confident serif headings.', font: 'serif', accent: '#1e3a8a', layout: 'banner', heading: 'rule', align: 'left', order: 'standard',
    tags: { vibe: ['Elegant', 'Classic'], level: ['Senior / Executive'], industry: ['Business & Finance', 'Operations & HR', 'General'], format: ['Chronological', 'Long-form CV'] } },
  { id: 'fresher', name: 'Fresher Starter', blurb: 'Education and skills first, for first jobs.', font: 'sans', accent: '#2563eb', layout: 'single', heading: 'bar', align: 'left', order: 'student',
    tags: { vibe: ['Modern', 'Minimal'], level: ['Student / Fresher'], industry: ['General', 'Tech & Engineering'], format: ['Functional (Skills-first)', 'One-page'] } },
  { id: 'analyst', name: 'Data Analyst', blurb: 'Skills sidebar in teal, results up front.', font: 'sans', accent: '#0e7490', layout: 'sidebar', heading: 'accent', align: 'left', order: 'skillsFirst',
    tags: { vibe: ['Modern'], level: ['Early Career', 'Mid-Level'], industry: ['Data & Analytics', 'Tech & Engineering'], format: ['Hybrid', 'Two-column'] } },
  { id: 'creative', name: 'Creative Studio', blurb: 'Bold coloured header for design and marketing.', font: 'sans', accent: '#c026d3', layout: 'banner', heading: 'bar', align: 'left', order: 'standard',
    tags: { vibe: ['Creative', 'Bold'], level: ['Early Career', 'Mid-Level'], industry: ['Marketing & Creative'], format: ['Chronological', 'Two-column'] } },
  { id: 'switcher', name: 'Career Switcher', blurb: 'Leads with transferable skills, not job titles.', font: 'sans', accent: '#7c3aed', layout: 'single', heading: 'accent', align: 'left', order: 'skillsFirst',
    tags: { vibe: ['Modern'], level: ['Career Changer'], industry: ['General', 'Operations & HR', 'Sales & Customer'], format: ['Functional (Skills-first)', 'Hybrid'] } },
  { id: 'care', name: 'Healthcare Care', blurb: 'Calm green serif layout for clinical roles.', font: 'serif', accent: '#047857', layout: 'single', heading: 'rule', align: 'left', order: 'standard',
    tags: { vibe: ['Classic'], level: ['Early Career', 'Mid-Level', 'Senior / Executive'], industry: ['Healthcare'], format: ['Chronological'] } },
  { id: 'ops', name: 'Operations & Support', blurb: 'Neat, dense and easy to scan.', font: 'sans', accent: '#475569', layout: 'single', heading: 'bar', align: 'left', order: 'standard', compact: true,
    tags: { vibe: ['Minimal', 'Classic'], level: ['Early Career', 'Mid-Level'], industry: ['Operations & HR', 'Sales & Customer'], format: ['One-page', 'Chronological'] } },
  { id: 'sales', name: 'Sales Impact', blurb: 'Red banner and achievement-led layout.', font: 'sans', accent: '#dc2626', layout: 'banner', heading: 'accent', align: 'left', order: 'skillsFirst',
    tags: { vibe: ['Bold'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Sales & Customer', 'Business & Finance'], format: ['Hybrid'] } },
  { id: 'cv', name: 'Detailed CV', blurb: 'Roomy, multi-page layout for long careers.', font: 'serif', accent: '#334155', layout: 'single', heading: 'small', align: 'left', order: 'standard',
    tags: { vibe: ['Classic', 'Elegant'], level: ['Senior / Executive'], industry: ['Tech & Engineering', 'Healthcare', 'General'], format: ['Long-form CV', 'Chronological'] } },
  { id: 'techlead', name: 'Tech Lead', blurb: 'Monospace accents for engineers.', font: 'mono', accent: '#16a34a', layout: 'single', heading: 'plain', align: 'left', order: 'standard',
    tags: { vibe: ['Minimal', 'Modern'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Tech & Engineering', 'Data & Analytics'], format: ['Chronological', 'One-page'] } },
]

export const COVER_TEMPLATES = [
  { id: 'letter-classic', kind: 'cover', name: 'Classic Letter', blurb: 'Traditional block letter in serif type.', font: 'serif', accent: '#1f2937', layout: 'single', align: 'left',
    tags: { vibe: ['Classic', 'Elegant'], level: ['Mid-Level', 'Senior / Executive'], industry: ['General'], format: ['Chronological'] } },
  { id: 'letter-modern', kind: 'cover', name: 'Modern Letter', blurb: 'Accent bar and clean sans-serif.', font: 'sans', accent: '#5b55d9', layout: 'banner', align: 'left',
    tags: { vibe: ['Modern', 'Bold'], level: ['Early Career', 'Mid-Level'], industry: ['Tech & Engineering', 'Marketing & Creative'], format: ['One-page'] } },
  { id: 'letter-minimal', kind: 'cover', name: 'Minimal Letter', blurb: 'Plain and direct, nothing in the way.', font: 'sans', accent: '#374151', layout: 'single', align: 'left',
    tags: { vibe: ['Minimal'], level: ['Student / Fresher', 'Early Career'], industry: ['General'], format: ['One-page'] } },
  { id: 'letter-bold', kind: 'cover', name: 'Bold Header Letter', blurb: 'Coloured header band that matches your resume.', font: 'sans', accent: '#0f766e', layout: 'banner', align: 'left',
    tags: { vibe: ['Bold', 'Creative'], level: ['Early Career', 'Career Changer'], industry: ['Sales & Customer', 'Marketing & Creative'], format: ['One-page'] } },
]

export const getResumeTemplate = (id) => RESUME_TEMPLATES.find((t) => t.id === id) || RESUME_TEMPLATES[1]
export const getCoverTemplate = (id) => COVER_TEMPLATES.find((t) => t.id === id) || COVER_TEMPLATES[0]
export const sectionOrder = (template) => ORDER[template.order] || ORDER.standard

// filters: { vibe: string|'', level: '', industry: '', format: '' } - a template matches when
// it carries the chosen value in every group that has one.
export function filterTemplates(list, filters) {
  return list.filter((t) => Object.entries(filters).every(([group, value]) => !value || (t.tags[group] || []).includes(value)))
}
