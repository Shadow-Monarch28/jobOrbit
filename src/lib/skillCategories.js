// Groups for the categorized Skills section in a rebuilt resume. Mirrors the
// groupings in lib/data/skills.js (the matching vocabulary), plus keyword
// fallbacks so a skill outside that list (e.g. an AI-flagged gap like
// "Data Modeling") still lands in a sensible group instead of "Other".
export const SKILL_CATEGORIES = [
  {
    name: 'Programming & Web',
    skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Ruby on Rails', 'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'R', 'MATLAB', 'HTML', 'CSS', 'Tailwind CSS', 'React', 'Next.js', 'Vue', 'Nuxt.js', 'Angular', 'Redux', 'Node.js', 'Django', 'Flask', 'Spring Boot', 'GraphQL', 'REST APIs'],
  },
  {
    name: 'Data & Infrastructure',
    skills: ['SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka', 'RabbitMQ', 'Firebase', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'CI/CD', 'Git', 'Linux', 'Bash', 'Shell Scripting', 'Microservices', 'API Design'],
  },
  {
    name: 'Data Science & Analytics',
    skills: ['Pandas', 'NumPy', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Data Visualization', 'Statistics', 'A/B Testing', 'Power BI', 'Tableau', 'Excel', 'VBA', 'Google Analytics', 'Product Analytics'],
  },
  { name: 'QA & Tools', skills: ['Selenium', 'Cypress', 'Jest', 'Webpack', 'Jira', 'Confluence'] },
  { name: 'Design', skills: ['Figma', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe XD', 'Sketch', 'CAD', 'AutoCAD', 'SolidWorks'] },
  {
    name: 'Business & Operations',
    skills: ['Agile', 'Scrum', 'Project Management', 'Six Sigma', 'Lean', 'Supply Chain Management', 'Inventory Management', 'Procurement', 'Logistics', 'Budgeting', 'Forecasting', 'Risk Management', 'Compliance', 'Auditing', 'Payroll', 'Recruiting', 'Salesforce', 'SAP', 'Accounting', 'Financial Modeling', 'SEO', 'Content Writing', 'Copywriting', 'Email Marketing', 'Social Media Marketing', 'Manufacturing', 'Quality Assurance', 'Clinical Research', 'Medical Coding', 'Patient Care'],
  },
  {
    name: 'Soft Skills',
    skills: ['Communication', 'Leadership', 'Team Leadership', 'Negotiation', 'Public Speaking', 'Time Management', 'Critical Thinking', 'Customer Service', 'Problem Solving', 'Teamwork'],
  },
]

export const OTHER_CATEGORY = 'Other'

const EXACT = new Map()
for (const cat of SKILL_CATEGORIES) for (const s of cat.skills) EXACT.set(s.toLowerCase(), cat.name)

const KEYWORDS = [
  [/sql|database|\bdb\b|cloud|devops|server|network|api\b|docker|deploy/i, 'Data & Infrastructure'],
  [/data|analytic|statistic|machine|learning|model|\bml\b|\bai\b|visuali/i, 'Data Science & Analytics'],
  [/python|java|script|code|coding|program|develop|framework|react|web|front.?end|back.?end|css|html/i, 'Programming & Web'],
  [/test|qa\b|automation|tool/i, 'QA & Tools'],
  [/design|ui\b|ux\b|photo|illustrat|figma|cad/i, 'Design'],
  [/lead|communicat|team|negotiat|speaking|thinking|solving|collaborat|mentor|time management/i, 'Soft Skills'],
  [/manage|market|sales|finance|account|audit|budget|operation|supply|recruit|compliance|strategy|seo|content/i, 'Business & Operations'],
]

export function categorizeSkill(name) {
  const key = name.trim().toLowerCase()
  if (EXACT.has(key)) return EXACT.get(key)
  for (const [re, cat] of KEYWORDS) if (re.test(key)) return cat
  return OTHER_CATEGORY
}

export const CATEGORY_ORDER = [...SKILL_CATEGORIES.map((c) => c.name), OTHER_CATEGORY]
