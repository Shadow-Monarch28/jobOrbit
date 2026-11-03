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

// layout: 'single' | 'sidebar' (tinted left column) | 'split' (centred header, plain side column) | 'banner' (coloured name band)
// extras: trackName (wide letter-spaced name), rules (lines above and below the header), sideTint:false
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
  { id: 'graduate', name: 'Graduate Bright', blurb: 'Friendly blue layout for campus applications.', font: 'sans', accent: '#0284c7', layout: 'banner', heading: 'bar', align: 'left', order: 'student',
    tags: { vibe: ['Modern', 'Bold'], level: ['Student / Fresher'], industry: ['General', 'Tech & Engineering', 'Business & Finance'], format: ['One-page', 'Functional (Skills-first)'] } },
  { id: 'finance', name: 'Finance Ledger', blurb: 'Quiet navy serif with tidy rules for numbers-led roles.', font: 'serif', accent: '#0f172a', layout: 'single', heading: 'rule', align: 'left', order: 'standard', compact: true,
    tags: { vibe: ['Classic', 'Elegant'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Business & Finance'], format: ['Chronological', 'One-page'] } },
  { id: 'product', name: 'Product Narrative', blurb: 'Violet sidebar that leads with outcomes and skills.', font: 'sans', accent: '#6d28d9', layout: 'sidebar', heading: 'accent', align: 'left', order: 'skillsFirst',
    tags: { vibe: ['Modern', 'Creative'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Tech & Engineering', 'Marketing & Creative'], format: ['Two-column', 'Hybrid'] } },
  { id: 'support', name: 'Support Specialist', blurb: 'Warm, readable layout for service and success roles.', font: 'sans', accent: '#ea580c', layout: 'single', heading: 'bar', align: 'left', order: 'standard',
    tags: { vibe: ['Modern', 'Minimal'], level: ['Early Career', 'Mid-Level'], industry: ['Sales & Customer', 'Operations & HR'], format: ['Chronological', 'One-page'] } },
  { id: 'academic', name: 'Academic CV', blurb: 'Spacious serif CV with small-caps headings.', font: 'serif', accent: '#7f1d1d', layout: 'single', heading: 'small', align: 'left', order: 'standard',
    tags: { vibe: ['Classic', 'Elegant'], level: ['Senior / Executive', 'Career Changer'], industry: ['Healthcare', 'General'], format: ['Long-form CV', 'Chronological'] } },
  { id: 'datapro', name: 'Data Pro Centred', blurb: 'Centred header, teal accents, skills right after the summary.', font: 'sans', accent: '#0d9488', layout: 'single', heading: 'accent', align: 'center', order: 'skillsFirst',
    tags: { vibe: ['Modern', 'Minimal'], level: ['Early Career', 'Mid-Level'], industry: ['Data & Analytics', 'Tech & Engineering'], format: ['Hybrid', 'One-page'] } },
  { id: 'hrpeople', name: 'People & HR', blurb: 'Soft green sidebar for people and operations roles.', font: 'sans', accent: '#15803d', layout: 'sidebar', heading: 'plain', align: 'left', order: 'standard',
    tags: { vibe: ['Modern', 'Classic'], level: ['Early Career', 'Mid-Level'], industry: ['Operations & HR', 'General'], format: ['Two-column', 'One-page'] } },
  { id: 'atsmain', name: 'ATS Straight Shooter', blurb: 'Centred serif header, ruled headings, dates on the right. Built for applicant trackers.', font: 'serif', accent: '#111827', layout: 'single', heading: 'rule', align: 'center', order: 'standard', compact: true,
    tags: { vibe: ['Classic', 'Minimal'], level: ['Early Career', 'Mid-Level', 'Career Changer'], industry: ['Data & Analytics', 'Business & Finance', 'Operations & HR', 'General'], format: ['Chronological', 'One-page'] } },
  { id: 'splitrule', name: 'Tracked Split', blurb: 'Wide-spaced name between thin rules, with a quiet side column.', font: 'sans', accent: '#111827', layout: 'split', heading: 'plain', align: 'center', order: 'standard', trackName: true, rules: true,
    tags: { vibe: ['Minimal', 'Elegant'], level: ['Early Career', 'Career Changer'], industry: ['Data & Analytics', 'Operations & HR', 'General'], format: ['Two-column', 'One-page'] } },
  { id: 'noir', name: 'Noir Banner', blurb: 'Charcoal name band with serif-style ruled sections.', font: 'sans', accent: '#27272a', layout: 'banner', heading: 'rule', align: 'left', order: 'standard',
    tags: { vibe: ['Bold', 'Modern'], level: ['Early Career', 'Mid-Level'], industry: ['Operations & HR', 'Sales & Customer', 'General'], format: ['Chronological', 'One-page'] } },
  { id: 'analystledger', name: 'Analyst Ledger', blurb: 'Skills first, project-heavy, with blue ruled headings.', font: 'sans', accent: '#1d4ed8', layout: 'single', heading: 'accent', align: 'left', order: 'skillsFirst',
    tags: { vibe: ['Modern', 'Minimal'], level: ['Early Career', 'Career Changer'], industry: ['Data & Analytics', 'Tech & Engineering'], format: ['Hybrid', 'One-page'] } },
  { id: 'hrpartner', name: 'HR Business Partner', blurb: 'Slate side column for contact, skills and credentials.', font: 'sans', accent: '#334155', layout: 'sidebar', heading: 'rule', align: 'left', order: 'standard',
    tags: { vibe: ['Classic', 'Modern'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Operations & HR', 'Business & Finance'], format: ['Two-column', 'One-page'] } },
  { id: 'analystcv', name: 'Analyst Long-form CV', blurb: 'Roomy CV for portfolio-led analysts with many projects.', font: 'serif', accent: '#0f766e', layout: 'single', heading: 'small', align: 'left', order: 'standard',
    tags: { vibe: ['Elegant', 'Classic'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Data & Analytics', 'Tech & Engineering'], format: ['Long-form CV', 'Chronological'] } },
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
  { id: 'letter-exec', kind: 'cover', name: 'Executive Letter', blurb: 'Navy band and serif body for senior roles.', font: 'serif', accent: '#1e3a8a', layout: 'banner', align: 'left',
    tags: { vibe: ['Elegant', 'Classic'], level: ['Senior / Executive'], industry: ['Business & Finance', 'Operations & HR'], format: ['Chronological'] } },
  { id: 'letter-tech', kind: 'cover', name: 'Tech Letter', blurb: 'Monospace accents for engineering applications.', font: 'mono', accent: '#16a34a', layout: 'single', align: 'left',
    tags: { vibe: ['Minimal', 'Modern'], level: ['Early Career', 'Mid-Level'], industry: ['Tech & Engineering', 'Data & Analytics'], format: ['One-page'] } },
  { id: 'letter-creative', kind: 'cover', name: 'Creative Letter', blurb: 'Magenta header for design and marketing.', font: 'sans', accent: '#c026d3', layout: 'banner', align: 'left',
    tags: { vibe: ['Creative', 'Bold'], level: ['Early Career', 'Mid-Level'], industry: ['Marketing & Creative'], format: ['One-page'] } },
  { id: 'letter-fresher', kind: 'cover', name: 'Fresher Letter', blurb: 'Simple blue letter for a first application.', font: 'sans', accent: '#2563eb', layout: 'single', align: 'left',
    tags: { vibe: ['Modern', 'Minimal'], level: ['Student / Fresher'], industry: ['General', 'Tech & Engineering'], format: ['One-page'] } },
  { id: 'letter-care', kind: 'cover', name: 'Care Letter', blurb: 'Calm green serif for clinical and care roles.', font: 'serif', accent: '#047857', layout: 'single', align: 'left',
    tags: { vibe: ['Classic'], level: ['Early Career', 'Mid-Level', 'Senior / Executive'], industry: ['Healthcare'], format: ['Chronological'] } },
  { id: 'letter-sales', kind: 'cover', name: 'Sales Letter', blurb: 'Red band that gets attention.', font: 'sans', accent: '#dc2626', layout: 'banner', align: 'left',
    tags: { vibe: ['Bold'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Sales & Customer'], format: ['One-page'] } },
  { id: 'letter-switch', kind: 'cover', name: 'Career Switch Letter', blurb: 'Violet layout that frames transferable skills.', font: 'sans', accent: '#7c3aed', layout: 'single', align: 'left',
    tags: { vibe: ['Modern'], level: ['Career Changer'], industry: ['General', 'Operations & HR'], format: ['Hybrid'] } },
  { id: 'letter-finance', kind: 'cover', name: 'Finance Letter', blurb: 'Slate serif, compact and precise.', font: 'serif', accent: '#0f172a', layout: 'single', align: 'left',
    tags: { vibe: ['Classic', 'Elegant'], level: ['Mid-Level', 'Senior / Executive'], industry: ['Business & Finance'], format: ['One-page'] } },
  { id: 'letter-data', kind: 'cover', name: 'Data Letter', blurb: 'Teal banner for analytics roles.', font: 'sans', accent: '#0e7490', layout: 'banner', align: 'left',
    tags: { vibe: ['Modern'], level: ['Early Career', 'Mid-Level'], industry: ['Data & Analytics'], format: ['One-page'] } },
  { id: 'letter-support', kind: 'cover', name: 'Support Letter', blurb: 'Warm orange accent for service roles.', font: 'sans', accent: '#ea580c', layout: 'single', align: 'left',
    tags: { vibe: ['Modern', 'Minimal'], level: ['Early Career', 'Mid-Level'], industry: ['Sales & Customer', 'Operations & HR'], format: ['One-page'] } },
  { id: 'letter-academic', kind: 'cover', name: 'Academic Letter', blurb: 'Formal maroon serif, long-form friendly.', font: 'serif', accent: '#7f1d1d', layout: 'single', align: 'left',
    tags: { vibe: ['Classic', 'Elegant'], level: ['Senior / Executive', 'Career Changer'], industry: ['Healthcare', 'General'], format: ['Long-form CV'] } },
  { id: 'letter-ats', kind: 'cover', name: 'ATS Plain Letter', blurb: 'Serif, no frills, reads cleanly in any system.', font: 'serif', accent: '#111827', layout: 'single', align: 'left',
    tags: { vibe: ['Classic', 'Minimal'], level: ['Early Career', 'Mid-Level', 'Career Changer'], industry: ['Data & Analytics', 'General'], format: ['One-page'] } },
  { id: 'letter-noir', kind: 'cover', name: 'Noir Letter', blurb: 'Charcoal band to match the Noir resume.', font: 'sans', accent: '#27272a', layout: 'banner', align: 'left',
    tags: { vibe: ['Bold', 'Modern'], level: ['Early Career', 'Mid-Level'], industry: ['Operations & HR', 'Sales & Customer'], format: ['One-page'] } },
  { id: 'letter-ledger', kind: 'cover', name: 'Analyst Letter', blurb: 'Blue rule and tidy sans for analytics applications.', font: 'sans', accent: '#1d4ed8', layout: 'single', align: 'left',
    tags: { vibe: ['Modern', 'Minimal'], level: ['Early Career', 'Career Changer'], industry: ['Data & Analytics', 'Tech & Engineering'], format: ['One-page'] } },
]

export const getResumeTemplate = (id) => RESUME_TEMPLATES.find((t) => t.id === id) || RESUME_TEMPLATES[1]
export const getCoverTemplate = (id) => COVER_TEMPLATES.find((t) => t.id === id) || COVER_TEMPLATES[0]
export const sectionOrder = (template) => ORDER[template.order] || ORDER.standard

// filters: { vibe: string|'', level: '', industry: '', format: '' } - a template matches when
// it carries the chosen value in every group that has one.
export function filterTemplates(list, filters) {
  return list.filter((t) => Object.entries(filters).every(([group, value]) => !value || (t.tags[group] || []).includes(value)))
}
