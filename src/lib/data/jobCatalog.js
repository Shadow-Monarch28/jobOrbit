// One catalogue drives three Discover lists: job titles, industries (the
// category names) and skills. Titles are the roles listed on boards such as
// Indeed, LinkedIn, Naukri, Foundit and Wellfound.
//
// Left out on purpose: Security & Safety (guards), Housekeeping & Cleaning,
// Food Service & Canteen, Facilities & Maintenance, General Labour &
// Warehouse, Education, and Construction & Skilled Trades.
//
// `keywords` are used to place a live job into a category from its title.
export const JOB_CATALOG = [
  {
    industry: 'Software Engineering',
    keywords: ['software', 'developer', 'engineer', 'frontend', 'front-end', 'backend', 'back-end', 'full stack', 'fullstack', 'programmer', 'sde', 'web developer', 'mobile', 'android', 'ios', 'java', 'python', '.net', 'react', 'node', 'golang', 'embedded', 'firmware', 'game developer', 'architect'],
    titles: ['Software Engineer', 'Software Developer', 'Senior Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Web Developer', 'React Developer', 'Angular Developer', 'Node.js Developer', 'Java Developer', 'Python Developer', '.NET Developer', 'PHP Developer', 'Golang Developer', 'Ruby on Rails Developer', 'Mobile App Developer', 'Android Developer', 'iOS Developer', 'Flutter Developer', 'React Native Developer', 'Embedded Software Engineer', 'Firmware Engineer', 'Game Developer', 'Unity Developer', 'Salesforce Developer', 'SAP Consultant', 'ERP Consultant', 'WordPress Developer', 'Solutions Architect', 'Software Architect', 'Engineering Manager', 'Technical Lead', 'Principal Engineer', 'API Developer', 'Blockchain Developer', 'Software Development Engineer in Test'],
    skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Ruby on Rails', 'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'HTML', 'CSS', 'Tailwind CSS', 'React', 'React Native', 'Next.js', 'Vue', 'Nuxt.js', 'Angular', 'Redux', 'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', '.NET', 'ASP.NET', 'Laravel', 'Flutter', 'Android SDK', 'iOS Development', 'GraphQL', 'REST APIs', 'Microservices', 'API Design', 'Data Structures', 'Algorithms', 'Object-Oriented Programming', 'System Design', 'Unity', 'Solidity', 'WordPress'],
  },
  {
    industry: 'Data & Analytics',
    keywords: ['data analyst', 'data engineer', 'data scientist', 'analytics', 'bi ', 'business intelligence', 'reporting', 'etl', 'data warehouse', 'insights', 'data'],
    titles: ['Data Analyst', 'Senior Data Analyst', 'Business Intelligence Analyst', 'BI Developer', 'Power BI Developer', 'Tableau Developer', 'Data Engineer', 'Big Data Engineer', 'ETL Developer', 'Data Warehouse Engineer', 'Analytics Engineer', 'Data Scientist', 'Product Analyst', 'Marketing Analyst', 'Reporting Analyst', 'Insights Analyst', 'Database Administrator', 'SQL Developer', 'Data Architect', 'Data Governance Analyst', 'Data Entry Operator', 'Data Quality Analyst', 'Research Analyst', 'Quantitative Analyst', 'Statistician', 'Operations Analyst', 'MIS Executive'],
    skills: ['SQL', 'PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'MongoDB', 'Redis', 'Elasticsearch', 'Pandas', 'NumPy', 'Excel', 'Advanced Excel', 'VBA', 'Power BI', 'Tableau', 'Looker', 'Google Analytics', 'Data Visualization', 'Data Modeling', 'Data Warehousing', 'ETL', 'Apache Spark', 'Hadoop', 'Airflow', 'dbt', 'Snowflake', 'BigQuery', 'Redshift', 'Databricks', 'Statistics', 'A/B Testing', 'Product Analytics', 'Data Cleaning', 'Data Analysis', 'Hypothesis Testing', 'R', 'MATLAB', 'SAS', 'Kafka'],
  },
  {
    industry: 'AI & Machine Learning',
    keywords: ['machine learning', 'ml ', 'ai ', 'artificial intelligence', 'deep learning', 'nlp', 'computer vision', 'llm', 'prompt', 'mlops', 'research scientist'],
    titles: ['Machine Learning Engineer', 'AI Engineer', 'Deep Learning Engineer', 'NLP Engineer', 'Computer Vision Engineer', 'MLOps Engineer', 'Applied Scientist', 'Research Scientist', 'Generative AI Engineer', 'LLM Engineer', 'Prompt Engineer', 'AI Product Manager', 'Data Annotation Specialist', 'Robotics Engineer'],
    skills: ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Keras', 'NLP', 'Computer Vision', 'LLMs', 'Prompt Engineering', 'Generative AI', 'Hugging Face', 'LangChain', 'MLOps', 'Reinforcement Learning', 'Feature Engineering', 'Model Deployment', 'OpenCV'],
  },
  {
    industry: 'DevOps & Cloud',
    keywords: ['devops', 'cloud', 'sre', 'site reliability', 'platform engineer', 'infrastructure', 'release engineer', 'build engineer', 'kubernetes', 'aws', 'azure'],
    titles: ['DevOps Engineer', 'Senior DevOps Engineer', 'Cloud Engineer', 'Cloud Architect', 'AWS Engineer', 'Azure Engineer', 'GCP Engineer', 'Site Reliability Engineer', 'Platform Engineer', 'Infrastructure Engineer', 'Release Engineer', 'Build Engineer', 'Kubernetes Engineer', 'Systems Reliability Engineer', 'Cloud Support Engineer', 'FinOps Analyst'],
    skills: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'CI/CD', 'Git', 'Linux', 'Bash', 'Shell Scripting', 'Helm', 'Prometheus', 'Grafana', 'Infrastructure as Code', 'Monitoring', 'CloudFormation', 'Serverless'],
  },
  {
    industry: 'IT Security & Cybersecurity',
    keywords: ['cyber', 'infosec', 'information security', 'security analyst', 'security engineer', 'soc ', 'penetration', 'pentest', 'vulnerability', 'grc', 'iam'],
    titles: ['Cybersecurity Analyst', 'Information Security Analyst', 'Security Engineer', 'SOC Analyst', 'Penetration Tester', 'Ethical Hacker', 'Application Security Engineer', 'Cloud Security Engineer', 'Security Architect', 'Vulnerability Analyst', 'GRC Analyst', 'IAM Engineer', 'Incident Response Analyst', 'Threat Intelligence Analyst', 'CISO'],
    skills: ['Network Security', 'SIEM', 'Splunk', 'Penetration Testing', 'Vulnerability Assessment', 'Incident Response', 'Threat Modeling', 'OWASP', 'ISO 27001', 'SOC 2', 'Identity and Access Management', 'Firewalls', 'Cryptography', 'Malware Analysis', 'Burp Suite', 'Wireshark'],
  },
  {
    industry: 'QA & Testing',
    keywords: ['qa ', 'quality assurance', 'tester', 'test engineer', 'testing', 'sdet', 'automation test'],
    titles: ['QA Engineer', 'Manual Tester', 'Automation Test Engineer', 'SDET', 'Performance Test Engineer', 'QA Lead', 'Test Analyst', 'Mobile Test Engineer', 'API Test Engineer', 'UAT Analyst'],
    skills: ['Selenium', 'Cypress', 'Playwright', 'Appium', 'JUnit', 'TestNG', 'Postman', 'JMeter', 'Test Automation', 'Manual Testing', 'Test Cases', 'Regression Testing', 'Bug Tracking', 'Jest', 'Quality Assurance'],
  },
  {
    industry: 'IT Support & Infrastructure',
    keywords: ['it support', 'help desk', 'helpdesk', 'system admin', 'sysadmin', 'network engineer', 'desktop support', 'technical support', 'infrastructure', 'noc ', 'service desk', 'telecom'],
    titles: ['IT Support Specialist', 'Help Desk Technician', 'Service Desk Analyst', 'Desktop Support Engineer', 'System Administrator', 'Network Engineer', 'Network Administrator', 'Windows Administrator', 'Linux Administrator', 'IT Manager', 'IT Administrator', 'NOC Engineer', 'Technical Support Engineer', 'Systems Engineer', 'Storage Engineer', 'VoIP Engineer', 'Telecom Engineer', 'IT Asset Manager', 'ITIL Service Manager'],
    skills: ['Windows Server', 'Active Directory', 'Microsoft 365', 'Networking', 'TCP/IP', 'Cisco', 'VMware', 'Troubleshooting', 'ITIL', 'ServiceNow', 'Help Desk', 'Hardware Support', 'DNS', 'VPN', 'Backup and Recovery', 'Virtualization'],
  },
  {
    industry: 'Product Management',
    keywords: ['product manager', 'product owner', 'product lead', 'product management', 'head of product', 'technical program', 'growth product'],
    titles: ['Product Manager', 'Senior Product Manager', 'Associate Product Manager', 'Technical Product Manager', 'Product Owner', 'Group Product Manager', 'Director of Product', 'Growth Product Manager', 'Product Operations Manager', 'Chief Product Officer'],
    skills: ['Product Management', 'Product Roadmap', 'Product Strategy', 'User Stories', 'Backlog Prioritization', 'Market Research', 'Go-to-Market', 'OKRs', 'Stakeholder Management', 'Wireframing', 'Jira', 'Confluence', 'Product Analytics', 'Mixpanel'],
  },
  {
    industry: 'Design & Creative',
    keywords: ['designer', 'design', 'ux', 'ui ', 'creative', 'illustrator', 'animator', 'motion', 'art director', 'brand'],
    titles: ['UI/UX Designer', 'UX Designer', 'UI Designer', 'Product Designer', 'UX Researcher', 'Interaction Designer', 'Visual Designer', 'Graphic Designer', 'Brand Designer', 'Motion Graphics Designer', '2D Animator', '3D Artist', 'Video Editor', 'Art Director', 'Creative Director', 'Illustrator', 'Packaging Designer', 'Fashion Designer', 'Interior Designer', 'Industrial Designer', 'Design Systems Designer'],
    skills: ['Figma', 'Adobe XD', 'Sketch', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Adobe After Effects', 'Adobe Premiere Pro', 'Canva', 'Wireframing', 'Prototyping', 'User Research', 'Usability Testing', 'Design Systems', 'Typography', 'Visual Design', 'Blender', 'Motion Graphics', 'Video Editing'],
  },
  {
    industry: 'Marketing & Communications',
    keywords: ['marketing', 'seo', 'sem', 'social media', 'brand', 'growth', 'performance marketing', 'communications', 'public relations', 'pr ', 'campaign', 'influencer', 'crm'],
    titles: ['Marketing Manager', 'Digital Marketing Specialist', 'Digital Marketing Manager', 'Performance Marketing Manager', 'SEO Specialist', 'SEM Specialist', 'Social Media Manager', 'Social Media Executive', 'Content Marketing Manager', 'Email Marketing Specialist', 'Growth Marketing Manager', 'Brand Manager', 'Product Marketing Manager', 'Marketing Analyst', 'Marketing Operations Manager', 'Influencer Marketing Manager', 'Public Relations Manager', 'Communications Manager', 'Corporate Communications Specialist', 'Community Manager', 'CRM Manager', 'Affiliate Marketing Manager', 'Event Marketing Manager', 'Chief Marketing Officer'],
    skills: ['SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'Meta Ads', 'LinkedIn Ads', 'Google Analytics', 'Email Marketing', 'Social Media Marketing', 'Content Marketing', 'Marketing Automation', 'HubSpot', 'Mailchimp', 'Brand Management', 'Campaign Management', 'Conversion Rate Optimization', 'Market Research', 'Public Relations', 'Influencer Marketing', 'Affiliate Marketing'],
  },
  {
    industry: 'Sales & Business Development',
    keywords: ['sales', 'business development', 'account executive', 'account manager', 'bdr', 'sdr', 'inside sales', 'territory', 'pre-sales', 'presales', 'channel', 'partnership'],
    titles: ['Sales Executive', 'Sales Manager', 'Inside Sales Representative', 'Business Development Executive', 'Business Development Manager', 'Sales Development Representative', 'Account Executive', 'Account Manager', 'Key Account Manager', 'Enterprise Sales Manager', 'Field Sales Executive', 'Regional Sales Manager', 'Territory Sales Manager', 'Pre-Sales Consultant', 'Solutions Consultant', 'Channel Partner Manager', 'Partnerships Manager', 'Sales Operations Analyst', 'Telesales Executive', 'Sales Engineer', 'Director of Sales', 'VP of Sales'],
    skills: ['Sales', 'B2B Sales', 'Lead Generation', 'Cold Calling', 'CRM', 'Salesforce', 'HubSpot CRM', 'Negotiation', 'Account Management', 'Pipeline Management', 'Sales Forecasting', 'Client Relationship Management', 'Presales', 'Prospecting', 'Closing Deals'],
  },
  {
    industry: 'Customer Support & Success',
    keywords: ['customer support', 'customer service', 'customer success', 'client support', 'support executive', 'support associate', 'call center', 'contact center', 'bpo', 'voice process', 'chat support', 'technical support'],
    titles: ['Customer Support Executive', 'Customer Service Representative', 'Customer Support Specialist', 'Customer Success Manager', 'Customer Success Associate', 'Technical Support Specialist', 'Chat Support Executive', 'Voice Process Executive', 'Call Center Agent', 'Email Support Specialist', 'Client Services Manager', 'Customer Experience Manager', 'Support Team Lead', 'Escalation Manager', 'Onboarding Specialist', 'Implementation Specialist'],
    skills: ['Customer Service', 'Customer Support', 'Zendesk', 'Freshdesk', 'Intercom', 'Ticketing Systems', 'Conflict Resolution', 'Escalation Handling', 'Client Onboarding', 'Customer Retention', 'Live Chat Support', 'Call Handling', 'CSAT'],
  },
  {
    industry: 'Finance & Accounting',
    keywords: ['finance', 'financial', 'accountant', 'accounting', 'audit', 'tax', 'accounts payable', 'accounts receivable', 'controller', 'treasury', 'fp&a', 'bookkeeper', 'payroll', 'cfo', 'investment', 'equity research', 'credit analyst'],
    titles: ['Financial Analyst', 'Senior Financial Analyst', 'FP&A Analyst', 'Finance Manager', 'Accountant', 'Senior Accountant', 'Accounts Payable Executive', 'Accounts Receivable Executive', 'Bookkeeper', 'Auditor', 'Internal Auditor', 'Tax Analyst', 'Tax Consultant', 'Cost Accountant', 'Management Accountant', 'Financial Controller', 'Treasury Analyst', 'Credit Analyst', 'Investment Analyst', 'Equity Research Analyst', 'Payroll Specialist', 'Billing Specialist', 'Finance Business Partner', 'Chartered Accountant', 'Chief Financial Officer', 'Revenue Analyst', 'Collections Executive', 'Treasury Manager'],
    skills: ['Accounting', 'Financial Modeling', 'Financial Reporting', 'Financial Analysis', 'Budgeting', 'Forecasting', 'Variance Analysis', 'Auditing', 'Taxation', 'GST', 'IFRS', 'GAAP', 'Tally', 'QuickBooks', 'SAP FICO', 'Oracle Financials', 'Accounts Payable', 'Accounts Receivable', 'Reconciliation', 'Payroll', 'Valuation', 'Treasury Management', 'Credit Analysis'],
  },
  {
    industry: 'Banking & Insurance',
    keywords: ['bank', 'banking', 'insurance', 'underwriter', 'loan', 'mortgage', 'relationship manager', 'wealth', 'claims', 'actuar', 'kyc', 'aml', 'branch manager', 'trader', 'broker'],
    titles: ['Relationship Manager', 'Bank Branch Manager', 'Personal Banker', 'Loan Officer', 'Mortgage Advisor', 'Credit Underwriter', 'Insurance Underwriter', 'Insurance Agent', 'Claims Adjuster', 'Claims Processor', 'Actuarial Analyst', 'Wealth Manager', 'Financial Advisor', 'Investment Banking Analyst', 'KYC Analyst', 'AML Analyst', 'Fraud Analyst', 'Risk Analyst', 'Operations Associate – Banking', 'Stock Broker', 'Trader', 'Collections Manager'],
    skills: ['Banking Operations', 'KYC', 'AML', 'Credit Risk', 'Underwriting', 'Loan Processing', 'Insurance Claims', 'Actuarial Science', 'Wealth Management', 'Investment Banking', 'Portfolio Management', 'Risk Assessment', 'Fraud Detection', 'Financial Regulations'],
  },
  {
    industry: 'Human Resources & Recruiting',
    keywords: ['hr ', 'human resources', 'recruit', 'talent', 'people operations', 'payroll', 'compensation', 'benefits', 'hrbp', 'talent acquisition', 'learning and development', 'l&d', 'employee relations'],
    titles: ['HR Manager', 'HR Executive', 'HR Generalist', 'HR Business Partner', 'HR Operations Specialist', 'HR Coordinator', 'Talent Acquisition Specialist', 'Technical Recruiter', 'Recruiter', 'Recruitment Consultant', 'Sourcing Specialist', 'People Operations Manager', 'Compensation and Benefits Analyst', 'Payroll Executive', 'Employee Relations Specialist', 'Learning and Development Manager', 'Training Coordinator', 'HR Analyst', 'HRIS Analyst', 'Onboarding Coordinator', 'Head of HR', 'Chief People Officer'],
    skills: ['Recruiting', 'Talent Acquisition', 'Sourcing', 'Interviewing', 'Onboarding', 'Employee Relations', 'Performance Management', 'Compensation and Benefits', 'Payroll Processing', 'HRIS', 'Workday', 'SuccessFactors', 'Labor Law', 'Employee Engagement', 'Learning and Development', 'HR Policies', 'Applicant Tracking Systems'],
  },
  {
    industry: 'Operations & Supply Chain',
    keywords: ['operations', 'supply chain', 'logistics', 'procurement', 'purchasing', 'sourcing', 'inventory', 'planner', 'demand planning', 'vendor', 'fleet', 'dispatch', 'shipping', 'merchandis'],
    titles: ['Operations Manager', 'Operations Executive', 'Operations Analyst', 'Business Operations Manager', 'Supply Chain Analyst', 'Supply Chain Manager', 'Demand Planner', 'Supply Planner', 'Logistics Coordinator', 'Logistics Manager', 'Procurement Specialist', 'Procurement Manager', 'Purchasing Executive', 'Buyer', 'Vendor Manager', 'Inventory Analyst', 'Inventory Planner', 'Import Export Executive', 'Freight Forwarding Executive', 'Fleet Manager', 'Transportation Planner', 'Process Improvement Specialist', 'Production Planner', 'Chief Operating Officer'],
    skills: ['Supply Chain Management', 'Inventory Management', 'Procurement', 'Logistics', 'Demand Planning', 'Vendor Management', 'Process Improvement', 'Six Sigma', 'Lean', 'Kaizen', 'ERP', 'SAP MM', 'Warehouse Management Systems', 'Import and Export', 'Freight Forwarding', 'Operations Management', 'Cost Reduction', 'Contract Negotiation'],
  },
  {
    industry: 'Project & Program Management',
    keywords: ['project manager', 'program manager', 'scrum master', 'agile coach', 'delivery manager', 'pmo', 'project coordinator', 'project lead', 'release manager'],
    titles: ['Project Manager', 'Senior Project Manager', 'IT Project Manager', 'Program Manager', 'Technical Program Manager', 'Scrum Master', 'Agile Coach', 'Delivery Manager', 'PMO Analyst', 'Project Coordinator', 'Project Analyst', 'Release Manager', 'Portfolio Manager', 'Change Manager', 'Transformation Manager'],
    skills: ['Project Management', 'Program Management', 'Agile', 'Scrum', 'Kanban', 'PMP', 'PRINCE2', 'Risk Management', 'Stakeholder Management', 'Project Planning', 'Resource Planning', 'MS Project', 'Jira', 'Asana', 'Change Management', 'Budget Management'],
  },
  {
    industry: 'Business Analysis & Consulting',
    keywords: ['business analyst', 'consultant', 'consulting', 'strategy', 'management trainee', 'functional analyst', 'systems analyst', 'process analyst', 'associate'],
    titles: ['Business Analyst', 'Senior Business Analyst', 'Systems Analyst', 'Functional Analyst', 'Process Analyst', 'Technical Business Analyst', 'Business Systems Analyst', 'Management Consultant', 'Strategy Consultant', 'Strategy Analyst', 'Business Consultant', 'IT Consultant', 'Functional Consultant', 'Corporate Strategy Manager', 'Management Trainee', 'Associate Consultant'],
    skills: ['Business Analysis', 'Requirements Gathering', 'BRD', 'Process Mapping', 'Use Cases', 'UML', 'Gap Analysis', 'Stakeholder Management', 'Business Process Modeling', 'SWOT Analysis', 'Strategic Planning', 'Market Analysis', 'Competitive Analysis', 'Presentation Skills', 'Problem Solving'],
  },
  {
    industry: 'Legal & Compliance',
    keywords: ['legal', 'lawyer', 'attorney', 'counsel', 'paralegal', 'compliance', 'contract', 'regulatory', 'company secretary', 'ip ', 'privacy', 'risk'],
    titles: ['Legal Counsel', 'Corporate Lawyer', 'Associate Attorney', 'Paralegal', 'Legal Assistant', 'Contract Manager', 'Contracts Administrator', 'Compliance Officer', 'Compliance Analyst', 'Regulatory Affairs Specialist', 'Company Secretary', 'Privacy Officer', 'Data Protection Officer', 'Risk Manager', 'Legal Operations Manager', 'Intellectual Property Specialist', 'Trade Compliance Specialist'],
    skills: ['Contract Drafting', 'Contract Management', 'Legal Research', 'Corporate Law', 'Compliance', 'Regulatory Compliance', 'GDPR', 'Risk Management', 'Due Diligence', 'Intellectual Property', 'Litigation', 'Policy Writing', 'Legal Documentation', 'Corporate Governance'],
  },
  {
    industry: 'Healthcare & Life Sciences',
    keywords: ['nurse', 'nursing', 'doctor', 'physician', 'clinical', 'pharma', 'pharmacist', 'medical', 'healthcare', 'therapist', 'lab technician', 'radiology', 'dental', 'biotech', 'patient', 'health'],
    titles: ['Registered Nurse', 'Staff Nurse', 'Nurse Practitioner', 'Physician Assistant', 'General Physician', 'Medical Officer', 'Pharmacist', 'Clinical Research Associate', 'Clinical Research Coordinator', 'Clinical Data Manager', 'Medical Coder', 'Medical Biller', 'Medical Transcriptionist', 'Pharmacovigilance Associate', 'Regulatory Affairs Associate', 'Medical Writer', 'Medical Representative', 'Physiotherapist', 'Occupational Therapist', 'Lab Technician', 'Radiology Technician', 'Healthcare Administrator', 'Health Informatics Analyst', 'Dental Hygienist', 'Biomedical Engineer', 'Research Scientist – Biotech', 'Quality Control Analyst – Pharma', 'Dietitian'],
    skills: ['Patient Care', 'Clinical Research', 'Good Clinical Practice', 'Medical Coding', 'ICD-10', 'CPT Coding', 'Pharmacovigilance', 'Regulatory Affairs', 'Electronic Health Records', 'HIPAA', 'Medical Terminology', 'Clinical Trials', 'Pharmaceutical Sales', 'Lab Testing', 'Basic Life Support', 'Healthcare Compliance'],
  },
  {
    industry: 'Engineering & Manufacturing',
    keywords: ['mechanical', 'electrical', 'electronics', 'manufacturing', 'production', 'process engineer', 'quality engineer', 'design engineer', 'industrial', 'mechatronics', 'chemical engineer', 'plant', 'hardware', 'vlsi', 'cad'],
    titles: ['Mechanical Engineer', 'Design Engineer', 'Electrical Engineer', 'Electronics Engineer', 'Hardware Engineer', 'VLSI Design Engineer', 'Embedded Systems Engineer', 'Manufacturing Engineer', 'Production Engineer', 'Process Engineer', 'Quality Engineer', 'Industrial Engineer', 'Mechatronics Engineer', 'Chemical Engineer', 'Automation Engineer', 'PLC Programmer', 'CAD Designer', 'Project Engineer', 'Test Engineer – Hardware', 'Reliability Engineer', 'Supplier Quality Engineer', 'Plant Manager', 'Production Supervisor', 'R&D Engineer', 'Automotive Engineer', 'Aerospace Engineer'],
    skills: ['AutoCAD', 'SolidWorks', 'CATIA', 'ANSYS', 'CAD', 'PLC Programming', 'SCADA', 'Six Sigma', 'Lean Manufacturing', 'Quality Control', 'Root Cause Analysis', 'GD&T', 'Circuit Design', 'PCB Design', 'Embedded C', 'Verilog', 'MATLAB', 'Failure Analysis', 'ISO 9001', 'Manufacturing Processes'],
  },
  {
    industry: 'Administration & Office Support',
    keywords: ['admin', 'administrative', 'assistant', 'receptionist', 'secretary', 'office', 'coordinator', 'data entry', 'back office', 'front office', 'executive assistant', 'document controller'],
    titles: ['Office Administrator', 'Administrative Assistant', 'Executive Assistant', 'Personal Assistant', 'Receptionist', 'Front Desk Executive', 'Office Manager', 'Back Office Executive', 'Data Entry Operator', 'Document Controller', 'Operations Coordinator', 'Administrative Coordinator', 'Virtual Assistant', 'Records Management Specialist', 'Travel Coordinator', 'Executive Secretary'],
    skills: ['MS Office', 'MS Word', 'MS PowerPoint', 'Google Workspace', 'Calendar Management', 'Typing', 'Data Entry', 'Documentation', 'Scheduling', 'Travel Coordination', 'Record Keeping', 'Email Management', 'Minute Taking', 'Office Administration'],
  },
  {
    industry: 'Content & Media',
    keywords: ['writer', 'editor', 'content', 'copywriter', 'journalist', 'translator', 'technical writer', 'proofread', 'podcast', 'video producer', 'media', 'scriptwriter', 'localization'],
    titles: ['Content Writer', 'Senior Content Writer', 'Copywriter', 'Technical Writer', 'Content Strategist', 'Editor', 'Proofreader', 'Journalist', 'Scriptwriter', 'Social Media Content Creator', 'Video Producer', 'Podcast Producer', 'Translator', 'Localization Specialist', 'Documentation Specialist', 'UX Writer', 'Content Moderator', 'Blog Writer', 'Medical Writer – Content'],
    skills: ['Content Writing', 'Copywriting', 'Technical Writing', 'Editing', 'Proofreading', 'Storytelling', 'Research Skills', 'SEO Writing', 'Content Strategy', 'Scriptwriting', 'Localization', 'Translation', 'WordPress', 'Video Production', 'CMS'],
  },
  {
    industry: 'Retail & E-commerce',
    keywords: ['retail', 'e-commerce', 'ecommerce', 'merchandiser', 'category manager', 'store manager', 'catalog', 'marketplace', 'amazon seller', 'visual merchandising', 'buyer'],
    titles: ['E-commerce Manager', 'Category Manager', 'Merchandiser', 'Visual Merchandiser', 'Retail Store Manager', 'Assistant Store Manager', 'Catalog Executive', 'Marketplace Manager', 'Amazon Account Manager', 'Retail Operations Manager', 'Sales Associate', 'Cashier', 'Area Sales Manager – Retail', 'Buying Assistant', 'Pricing Analyst', 'Order Management Executive'],
    skills: ['Merchandising', 'Category Management', 'Retail Operations', 'E-commerce', 'Shopify', 'Amazon Seller Central', 'Catalog Management', 'Pricing Strategy', 'Inventory Control', 'Visual Merchandising', 'Point of Sale', 'Marketplace Management', 'Customer Engagement'],
  },
  {
    industry: 'Hospitality & Travel',
    keywords: ['hotel', 'hospitality', 'travel', 'tourism', 'front office', 'concierge', 'guest', 'airline', 'cabin crew', 'ticketing', 'reservations', 'event manager', 'revenue manager'],
    titles: ['Hotel Manager', 'Front Office Manager', 'Guest Relations Executive', 'Concierge', 'Reservations Agent', 'Travel Consultant', 'Travel Agent', 'Tour Manager', 'Event Manager', 'Event Coordinator', 'Cabin Crew', 'Airline Ground Staff', 'Revenue Manager – Hospitality', 'Hospitality Sales Manager'],
    skills: ['Guest Relations', 'Hotel Management', 'Reservations', 'Property Management Systems', 'Opera PMS', 'Travel Planning', 'GDS', 'Event Planning', 'Revenue Management', 'Customer Hospitality', 'Tour Operations'],
  },
  {
    industry: 'Real Estate & Property',
    keywords: ['real estate', 'property', 'leasing', 'realtor', 'broker', 'site sales', 'valuation', 'estate'],
    titles: ['Real Estate Agent', 'Property Consultant', 'Leasing Manager', 'Real Estate Sales Manager', 'Property Manager', 'Real Estate Analyst', 'Real Estate Appraiser', 'Mortgage Broker', 'Relationship Manager – Real Estate', 'Asset Manager'],
    skills: ['Real Estate Sales', 'Property Valuation', 'Lease Management', 'Market Analysis', 'Property Management', 'Client Negotiation', 'Real Estate Law', 'CRM'],
  },
]

export const INDUSTRY_OPTIONS = JOB_CATALOG.map((c) => c.industry).sort()

export const JOB_TITLE_LIST = [...new Set(JOB_CATALOG.flatMap((c) => c.titles))].sort((a, b) => a.localeCompare(b))

export const SKILL_LIST = [...new Set(JOB_CATALOG.flatMap((c) => c.skills))]

// Places a live job into one of the industry categories using its title
// (and, if the title says nothing, its tags). Returns null when unclear.
export function categorizeJob(job) {
  const score = (text) => {
    const t = ` ${String(text || '').toLowerCase()} `
    let best = null
    let bestScore = 0
    for (const c of JOB_CATALOG) {
      let s = 0
      for (const k of c.keywords) if (t.includes(k.length <= 3 ? ` ${k.trim()} ` : k)) s += k.length
      if (s > bestScore) { best = c.industry; bestScore = s }
    }
    return best
  }
  return score(job?.title) || score((job?.tags ?? []).join(' ')) || null
}
