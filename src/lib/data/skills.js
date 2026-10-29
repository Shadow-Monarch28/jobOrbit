// Shared skill vocabulary — used both for the Search page's skill-filter
// suggestions and as the real extraction vocabulary for resume/job matching.
// Curated, not exhaustive; free-text entry elsewhere still works for
// anything not listed here.
import { SKILL_LIST } from './jobCatalog'

// Shared skill vocabulary: the Search page's skill suggestions and the
// extraction vocabulary for resume/job matching. It is built from the skills
// each job title in jobCatalog.js asks for, plus the general ones below.
const GENERAL_SKILLS = [
  'Communication', 'Leadership', 'Team Leadership', 'Negotiation', 'Public Speaking',
  'Time Management', 'Critical Thinking', 'Customer Service', 'Problem Solving', 'Teamwork',
]

const LEGACY_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Ruby on Rails',
  'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'R', 'MATLAB', 'HTML', 'CSS', 'Tailwind CSS', 'React',
  'Next.js', 'Vue', 'Nuxt.js', 'Angular', 'Redux', 'Node.js', 'Django', 'Flask', 'Spring Boot',
  'GraphQL', 'REST APIs', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka',
  'RabbitMQ', 'Firebase', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  'Jenkins', 'CI/CD', 'Git', 'Linux', 'Bash', 'Shell Scripting', 'Microservices', 'API Design',
  'Pandas', 'NumPy', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
  'Data Visualization', 'Statistics', 'A/B Testing', 'Power BI', 'Tableau', 'Excel', 'VBA',
  'Google Analytics', 'Product Analytics', 'Selenium', 'Cypress', 'Jest', 'Webpack', 'Jira',
  'Confluence', 'Figma', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe XD', 'Sketch', 'CAD',
  'AutoCAD', 'SolidWorks', 'Agile', 'Scrum', 'Project Management', 'Six Sigma', 'Lean',
  'Supply Chain Management', 'Inventory Management', 'Procurement', 'Logistics', 'Budgeting',
  'Forecasting', 'Risk Management', 'Compliance', 'Auditing', 'Payroll', 'Recruiting',
  'Salesforce', 'SAP', 'Accounting', 'Financial Modeling', 'SEO', 'Content Writing', 'Copywriting',
  'Email Marketing', 'Social Media Marketing', 'Manufacturing', 'Quality Assurance',
  'Clinical Research', 'Medical Coding', 'Patient Care',
]

export const SKILL_SUGGESTIONS = [...new Set([...LEGACY_SKILLS, ...SKILL_LIST, ...GENERAL_SKILLS])]
