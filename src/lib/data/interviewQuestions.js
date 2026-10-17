// Role-category question banks for the gated mock-interview feature.
// Deterministic, pre-written content — no paid AI API, consistent with how
// the rest of the app (matchingEngine.js) avoids any AI-generated text.
// Each category has real keywords (used to match a job's title/tags) and
// 10 genuine interview questions, each with a "hint" — a short outline of
// what a strong answer actually covers, not a sample answer to memorize.
// These same questions feed the Mock Interview's difficulty/style, so the
// Question Bank is an honest preview of what to expect there.

export const INTERVIEW_CATEGORIES = [
  {
    slug: 'software-engineering',
    label: 'Software Engineering',
    keywords: [
      'engineer', 'developer', 'programmer', 'software', 'sde', 'frontend',
      'front-end', 'backend', 'back-end', 'full stack', 'fullstack', 'devops',
      'sre', 'qa engineer', 'mobile developer', 'ios developer', 'android developer',
    ],
    questions: [
      {
        question: 'Walk me through a project you\'re proud of. What was your specific contribution?',
        hint: 'Name the project, your exact role vs. the team\'s, one technical decision you made and why, and a measurable outcome (performance, users, revenue, time saved).',
      },
      {
        question: 'Describe a time you had to debug a difficult issue in production. How did you approach it?',
        hint: 'Cover how you detected it, your investigation process (logs, metrics, reproducing it), the root cause, the fix, and what you changed afterward to prevent a repeat.',
      },
      {
        question: 'How do you decide between a quick fix and a more thorough solution under a deadline?',
        hint: 'Mention assessing blast radius and risk, communicating the tradeoff to stakeholders, and how you track the "quick fix" so it doesn\'t become permanent tech debt.',
      },
      {
        question: 'Tell me about a time you disagreed with a technical decision. How did you handle it?',
        hint: 'Show you argued with data/reasoning, not just opinion, that you disagreed respectfully, and how you handled the outcome whichever way it went.',
      },
      {
        question: 'How do you approach writing tests for a new feature?',
        hint: 'Talk about what you prioritize testing (critical paths, edge cases), unit vs integration vs e2e tradeoffs, and how you decide "enough" coverage vs over-testing.',
      },
      {
        question: 'Describe a time you had to learn a new technology or language quickly for a project.',
        hint: 'Explain your learning approach (docs, small experiments, asking for help), a mistake you made early on, and how fast you became productive.',
      },
      {
        question: 'How do you handle code review feedback you disagree with?',
        hint: 'Show you ask clarifying questions first, explain your reasoning, and know when to defer vs. push back — and that you don\'t take it personally.',
      },
      {
        question: 'Tell me about a time a project didn\'t go as planned. What did you learn?',
        hint: 'Be honest about what went wrong, your role in it, and a concrete change you made afterward (to your process, communication, or estimation).',
      },
      {
        question: 'How do you balance technical debt against shipping new features?',
        hint: 'Mention making debt visible (tracking it, not hiding it), tying debt paydown to business impact, and negotiating time for it rather than doing it silently.',
      },
      {
        question: 'Describe how you\'d approach onboarding onto a large, unfamiliar codebase.',
        hint: 'Cover reading docs/tests first, making a small safe change early to learn the workflow, asking targeted questions, and building a mental map before big changes.',
      },
    ],
  },
  {
    slug: 'data-analytics',
    label: 'Data & Analytics',
    keywords: [
      'data analyst', 'data scientist', 'data engineer', 'business intelligence',
      'bi analyst', 'analytics', 'reporting analyst', 'sql developer',
    ],
    questions: [
      {
        question: 'Walk me through a data analysis project from start to finish.',
        hint: 'Cover the business question you started with, how you got/cleaned the data, your method, and — most important — what decision or action resulted from it.',
      },
      {
        question: 'How do you handle messy or incomplete data before analysis?',
        hint: 'Mention specific techniques (handling nulls, deduplication, outlier checks) and how you decide whether to fix, flag, or exclude bad data rather than silently dropping it.',
      },
      {
        question: 'Describe a time your analysis changed a business decision.',
        hint: 'Be specific: what was about to happen, what your analysis showed instead, how you presented it, and what actually changed as a result.',
      },
      {
        question: 'How do you decide which metric matters most for a given question?',
        hint: 'Show you start from the business goal, consider what a metric could miss or how it could be gamed, and sometimes use multiple metrics together.',
      },
      {
        question: 'Tell me about a time a stakeholder disagreed with your findings. How did you handle it?',
        hint: 'Explain how you dug into WHY they disagreed (wrong assumption on either side?), whether you re-checked your work, and how you reached resolution.',
      },
      {
        question: 'How do you validate that a dashboard or report is actually correct?',
        hint: 'Mention cross-checking against a known source of truth, spot-checking individual records, and catching logic errors before stakeholders do.',
      },
      {
        question: 'Describe a time you had to explain a technical finding to a non-technical audience.',
        hint: 'Show you led with the "so what" / business impact first, used a simple visual or analogy, and checked they actually understood rather than just nodding.',
      },
      {
        question: 'How do you prioritize multiple data requests with competing deadlines?',
        hint: 'Cover how you estimate effort vs impact, communicate tradeoffs instead of just saying yes to everyone, and push back or renegotiate scope when needed.',
      },
      {
        question: 'Tell me about a mistake you made in an analysis and how you caught or fixed it.',
        hint: 'Own the mistake clearly, explain how you discovered it (ideally before it caused real damage), and what changed in your process afterward.',
      },
      {
        question: 'How do you decide when correlation is (or isn\'t) worth investigating further?',
        hint: 'Mention checking for confounding variables, effect size vs statistical significance, and whether there\'s a plausible causal mechanism before chasing it.',
      },
    ],
  },
  {
    slug: 'product-management',
    label: 'Product Management',
    keywords: ['product manager', 'product owner', 'pm ', 'associate product manager', 'apm'],
    questions: [
      {
        question: 'Walk me through how you prioritized a product roadmap with limited resources.',
        hint: 'Name your prioritization framework (impact/effort, RICE, etc.), what got cut, and how you communicated the "no"s to stakeholders.',
      },
      {
        question: 'Describe a feature you shipped that didn\'t perform as expected. What did you learn?',
        hint: 'Be honest about the gap between expectation and reality, how you found out, and what you\'d validate differently before building next time.',
      },
      {
        question: 'How do you gather and weigh customer feedback against business goals?',
        hint: 'Mention using multiple feedback sources (not just the loudest customer), separating "stated want" from underlying need, and tying it back to strategy.',
      },
      {
        question: 'Tell me about a time you had to say no to a stakeholder\'s request. How did you handle it?',
        hint: 'Show you explained the reasoning (not just "no capacity"), offered an alternative or timeline, and preserved the relationship.',
      },
      {
        question: 'How do you define success metrics for a new feature before launch?',
        hint: 'Cover picking a leading metric that\'s measurable soon after launch, setting a target beforehand (not after seeing results), and defining what "fail" looks like too.',
      },
      {
        question: 'Describe how you\'ve worked with engineering to scope a project realistically.',
        hint: 'Mention involving engineers early (not handing down a spec), discussing tradeoffs openly, and being willing to cut scope rather than slip every deadline.',
      },
      {
        question: 'Tell me about a time you had to make a decision with incomplete information.',
        hint: 'Explain what you did know, how you estimated the rest, your decision criteria, and how you planned to course-correct if you were wrong.',
      },
      {
        question: 'How do you handle competing priorities between different stakeholders?',
        hint: 'Show you get everyone aligned on the actual goal first, make tradeoffs visible and data-backed, and avoid just going with whoever is loudest or most senior.',
      },
      {
        question: 'Describe a time you changed your mind about a product decision based on data.',
        hint: 'Be specific about your original belief, what data changed it, and that you were willing to admit you were wrong rather than defending the original call.',
      },
      {
        question: 'How do you approach writing a product requirements document?',
        hint: 'Mention starting from the problem/user need (not the solution), defining what\'s explicitly out of scope, and involving engineering/design before finalizing it.',
      },
    ],
  },
  {
    slug: 'design',
    label: 'Design',
    keywords: ['designer', 'ux', 'ui designer', 'product design', 'graphic designer', 'visual designer'],
    questions: [
      {
        question: 'Walk me through your design process for a recent project.',
        hint: 'Cover research/problem framing, iteration (not just the final polished screen), how you tested it, and what changed between first draft and final.',
      },
      {
        question: 'Describe a time your design was challenged by a stakeholder or engineer. How did you respond?',
        hint: 'Show you listened to understand the real concern, used data or user needs to defend or revise the design, and stayed collaborative rather than defensive.',
      },
      {
        question: 'How do you balance user needs against business constraints?',
        hint: 'Give a concrete example where the two conflicted, and how you found a solution (or made an explicit tradeoff) rather than ignoring one side.',
      },
      {
        question: 'Tell me about a time user research changed your design direction.',
        hint: 'Name the original assumption, what the research revealed, and what specifically changed in the design as a result — not just "it was helpful."',
      },
      {
        question: 'How do you approach designing for accessibility?',
        hint: 'Mention concrete practices (contrast ratios, keyboard navigation, screen-reader labels) and that you treat it as a design constraint from the start, not an afterthought.',
      },
      {
        question: 'Describe how you handle feedback that conflicts with your design rationale.',
        hint: 'Show you ask what problem the feedback is trying to solve, weigh it against your original reasoning, and are willing to change your mind when it\'s warranted.',
      },
      {
        question: 'Tell me about a project where you had to design within tight technical constraints.',
        hint: 'Explain the constraint, how you worked with engineering to understand what was actually fixed vs flexible, and the creative solution you landed on.',
      },
      {
        question: 'How do you measure whether a design change actually improved the experience?',
        hint: 'Mention both quantitative signals (task completion, conversion, error rate) and qualitative ones (user feedback, usability testing) rather than relying on just one.',
      },
      {
        question: 'Describe a time you had to simplify a complex flow for users.',
        hint: 'Name what made it complex, your approach to cutting/reorganizing steps, and how you validated the simpler version actually worked better.',
      },
      {
        question: 'How do you collaborate with engineers to make sure a design is implemented faithfully?',
        hint: 'Mention involving engineers early, providing clear specs/handoff (not just a static image), and doing a review pass before launch to catch drift.',
      },
    ],
  },
  {
    slug: 'sales',
    label: 'Sales',
    keywords: ['sales', 'account executive', 'business development', 'bdr', 'sdr', 'account manager'],
    questions: [
      {
        question: 'Walk me through how you qualify a lead before investing significant time.',
        hint: 'Name your qualification framework (BANT, MEDDIC, etc.), the specific signals you look for, and an example of walking away from a bad-fit lead.',
      },
      {
        question: 'Describe your toughest deal and how you closed it (or why it didn\'t close).',
        hint: 'Be honest if it didn\'t close — explain what made it hard, what you tried, and what you learned, not just a polished win story.',
      },
      {
        question: 'How do you handle a prospect who goes quiet mid-pipeline?',
        hint: 'Mention a specific re-engagement approach (value-add touch, not just "checking in"), and when you decide to disqualify rather than keep chasing.',
      },
      {
        question: 'Tell me about a time you lost a deal to a competitor. What did you learn?',
        hint: 'Name the real reason you lost (price, feature, relationship, timing), and a specific change you made to your approach afterward.',
      },
      {
        question: 'How do you tailor your pitch for different types of buyers?',
        hint: 'Give an example contrasting two buyer types (e.g. technical vs. economic buyer) and how your messaging and proof points differed.',
      },
      {
        question: 'Describe how you manage a pipeline with deals at very different stages.',
        hint: 'Mention your system for tracking stage/next steps, how you allocate time across early vs. late-stage deals, and how you forecast realistically.',
      },
      {
        question: 'Tell me about a time you had to negotiate on price or terms.',
        hint: 'Show you held value rather than discounting immediately, what you traded for the concession, and the final outcome.',
      },
      {
        question: 'How do you handle rejection, and how often does it happen in your role?',
        hint: 'Be honest about frequency, and show a healthy, non-defensive mindset — what you do right after a "no" to stay productive.',
      },
      {
        question: 'Describe a time you upsold or expanded an existing account.',
        hint: 'Explain how you identified the expansion opportunity (usage signals, stated need) rather than just pushing more product, and how you approached the conversation.',
      },
      {
        question: 'How do you stay organized tracking follow-ups across many prospects?',
        hint: 'Mention your actual system (CRM habits, reminders, cadence rules) with enough specificity that it sounds like a real practice, not a vague answer.',
      },
    ],
  },
  {
    slug: 'marketing',
    label: 'Marketing',
    keywords: ['marketing', 'growth', 'seo', 'content marketing', 'brand manager', 'marketing manager'],
    questions: [
      {
        question: 'Walk me through a campaign you ran from strategy to results.',
        hint: 'Cover the goal, target audience, channel choice and why, and specific results (numbers, not just "it went well").',
      },
      {
        question: 'How do you decide which channel to prioritize for a given goal?',
        hint: 'Mention matching channel to where the audience actually is, cost/reach tradeoffs, and how you\'d test before committing a full budget.',
      },
      {
        question: 'Describe a campaign that underperformed. What did you change?',
        hint: 'Be specific about the shortfall (vs. what metric/target), your diagnosis of why, and the concrete change you made — not just "we learned a lot."',
      },
      {
        question: 'How do you measure the ROI of a marketing initiative?',
        hint: 'Mention attribution challenges you\'re aware of, which metrics you actually trust, and how you connect spend to a business outcome, not just vanity metrics.',
      },
      {
        question: 'Tell me about a time you had to work within a very limited budget.',
        hint: 'Show creative prioritization — what you cut, what you doubled down on, and the result relative to the constraint.',
      },
      {
        question: 'How do you balance brand consistency against channel-specific best practices?',
        hint: 'Give an example of adapting tone/format for a channel while keeping the core brand message intact — show you don\'t treat it as one-size-fits-all.',
      },
      {
        question: 'Describe how you\'ve used customer data to shape messaging.',
        hint: 'Name the specific data source (surveys, support tickets, usage data) and exactly how it changed your messaging or targeting.',
      },
      {
        question: 'Tell me about a time you had to pivot a campaign mid-flight.',
        hint: 'Explain what signal told you it wasn\'t working, how fast you reacted, and the outcome of the pivot vs. staying the course.',
      },
      {
        question: 'How do you stay current with changes in a fast-moving channel like SEO or paid social?',
        hint: 'Mention concrete habits (specific sources you follow, testing on small budgets before committing) rather than a vague "I keep learning."',
      },
      {
        question: 'Describe how you work with sales to align on messaging and lead quality.',
        hint: 'Give an example of a feedback loop you set up with sales (lead scoring, close-loop reporting) and how it changed what marketing produced.',
      },
    ],
  },
  {
    slug: 'customer-support',
    label: 'Customer Support',
    keywords: ['customer support', 'customer service', 'customer success', 'support specialist', 'helpdesk'],
    questions: [
      {
        question: 'Tell me about the most difficult customer interaction you\'ve handled.',
        hint: 'Describe what made it hard, how you stayed calm and listened, the resolution, and the outcome (did the customer stay, escalate, etc.).',
      },
      {
        question: 'How do you prioritize tickets when you have several urgent issues at once?',
        hint: 'Mention your actual triage criteria (impact, SLA, customer tier) and an example of making a hard call between two urgent issues.',
      },
      {
        question: 'Describe a time you had to deliver bad news to a customer.',
        hint: 'Show you were direct and honest rather than vague, explained the "why," and offered whatever alternative or next step was available.',
      },
      {
        question: 'How do you handle a customer who is upset but their request isn\'t something you can grant?',
        hint: 'Show empathy first, clear explanation of the constraint, and an alternative or escalation path rather than a flat no.',
      },
      {
        question: 'Tell me about a time you identified a pattern in support tickets that led to a product fix.',
        hint: 'Name the pattern, how you noticed and documented it, who you escalated it to, and the resulting change.',
      },
      {
        question: 'How do you keep your responses consistent while still sounding personal?',
        hint: 'Mention using templates/macros as a starting point but editing for the specific situation — not copy-pasting robotically.',
      },
      {
        question: 'Describe a time you went beyond the standard process to solve a customer\'s problem.',
        hint: 'Be specific about what the standard process would have been, what you did differently, and why it was justified (not just rule-breaking).',
      },
      {
        question: 'How do you handle repetitive questions without sounding scripted?',
        hint: 'Mention having a few natural variations ready, actually reading the specific context each time, and when you push for a docs/FAQ fix instead of repeating yourself.',
      },
      {
        question: 'Tell me about a time you had to learn a product change quickly to support customers on it.',
        hint: 'Explain how you got up to speed fast (docs, shadowing, testing it yourself) before customers started asking.',
      },
      {
        question: 'How do you measure whether you\'re doing a good job in this role?',
        hint: 'Name specific metrics you track (CSAT, resolution time, escalation rate) and that you look at trends, not just one good or bad day.',
      },
    ],
  },
  {
    slug: 'human-resources',
    label: 'Human Resources',
    keywords: ['hr ', 'human resources', 'recruiter', 'talent acquisition', 'people operations', 'hr consultant'],
    questions: [
      {
        question: 'Walk me through how you\'ve handled a sensitive employee relations issue.',
        hint: 'Without naming identifying details, cover how you investigated fairly, maintained confidentiality, and the resolution process you followed.',
      },
      {
        question: 'Describe a time you had to balance company policy against an employee\'s individual circumstances.',
        hint: 'Show you understood the policy\'s intent, consulted appropriately before deviating (if you did), and treated the situation with both fairness and consistency.',
      },
      {
        question: 'How do you keep sensitive information confidential while still being transparent with stakeholders?',
        hint: 'Mention sharing what\'s needed for a decision without over-disclosing, and how you handle a stakeholder pushing for more than they should know.',
      },
      {
        question: 'Tell me about a time you improved a process (onboarding, payroll, benefits, etc.).',
        hint: 'Name the specific pain point, what you changed, and a measurable improvement (time saved, fewer errors, better satisfaction scores).',
      },
      {
        question: 'How do you handle a disagreement between an employee and their manager?',
        hint: 'Show you stay neutral initially, gather both perspectives, and facilitate rather than simply taking a side.',
      },
      {
        question: 'Describe how you\'ve supported a manager through a difficult performance conversation.',
        hint: 'Mention coaching the manager beforehand (framing, documentation), and your role during/after without personally running the conversation for them.',
      },
      {
        question: 'Tell me about a time you had to explain a policy change to a resistant team.',
        hint: 'Show you explained the "why" clearly, listened to the pushback genuinely, and either adjusted communication or held firm with good reasoning.',
      },
      {
        question: 'How do you prioritize when you have multiple urgent employee cases at once?',
        hint: 'Mention criteria like risk/severity and legal exposure, and an example of triaging competing cases without dropping any of them.',
      },
      {
        question: 'Describe a time data (attendance, satisfaction scores, etc.) changed how you approached a problem.',
        hint: 'Name the specific data, what it revealed that wasn\'t obvious before, and the concrete action you took as a result.',
      },
      {
        question: 'How do you stay current with changing employment regulations in the regions you support?',
        hint: 'Mention specific sources or processes (legal updates, training, counsel check-ins) rather than a vague "I keep up with it."',
      },
    ],
  },
  {
    slug: 'finance',
    label: 'Finance',
    keywords: ['finance', 'accountant', 'accounting', 'financial analyst', 'fp&a', 'controller'],
    questions: [
      {
        question: 'Walk me through how you\'ve built or maintained a financial model.',
        hint: 'Cover the model\'s purpose, key assumptions and how you validated them, and how you kept it usable/updated over time, not just a one-off build.',
      },
      {
        question: 'Describe a time you caught an error in a report before it went out.',
        hint: 'Explain how you caught it (a specific check or review habit), the potential impact if it had gone out wrong, and what you fixed in your process after.',
      },
      {
        question: 'How do you explain a financial variance to a non-finance stakeholder?',
        hint: 'Show you lead with the business driver behind the number (not just "revenue was down"), using plain language and a relevant comparison.',
      },
      {
        question: 'Tell me about a time you had to meet a tight close deadline.',
        hint: 'Mention how you prioritized tasks, what you automated or streamlined, and how you ensured accuracy wasn\'t sacrificed for speed.',
      },
      {
        question: 'How do you approach reconciling discrepancies between systems or reports?',
        hint: 'Name your actual method (tracing transactions, checking timing differences) and an example of finding a root cause, not just forcing numbers to match.',
      },
      {
        question: 'Describe a time your forecast was significantly off. What did you learn?',
        hint: 'Be honest about the gap and why (wrong assumption, missed variable), and what you changed in your forecasting approach afterward.',
      },
      {
        question: 'How do you stay organized during month-end or quarter-end close?',
        hint: 'Mention a specific system (checklist, calendar, task tracking) and how you handle the inevitable last-minute surprise.',
      },
      {
        question: 'Tell me about a time you had to push back on a request that wasn\'t compliant.',
        hint: 'Show you explained the risk clearly and professionally, offered a compliant alternative if possible, and held the line respectfully.',
      },
      {
        question: 'How do you prioritize accuracy against speed when a deadline is tight?',
        hint: 'Mention where you won\'t compromise (core numbers) vs. where you can move faster (less material items), and how you communicate that tradeoff.',
      },
      {
        question: 'Describe how you\'ve communicated financial risk to leadership.',
        hint: 'Name the specific risk, how you quantified or scoped it, and how you framed it so leadership could actually act on it.',
      },
    ],
  },
  {
    slug: 'operations',
    label: 'Operations',
    keywords: ['operations', 'ops ', 'supply chain', 'logistics', 'project coordinator', 'program manager'],
    questions: [
      {
        question: 'Walk me through a process you redesigned to improve efficiency.',
        hint: 'Name the old process\'s specific pain point, what you changed, and a measurable result (time, cost, error rate).',
      },
      {
        question: 'Describe a time something broke in your workflow and you had to fix it under pressure.',
        hint: 'Cover how you diagnosed it quickly, your immediate fix vs. longer-term fix, and what you put in place to prevent a repeat.',
      },
      {
        question: 'How do you handle competing priorities from different teams?',
        hint: 'Mention how you get clarity on true urgency/impact from each team, and an example of negotiating or sequencing rather than just picking favorites.',
      },
      {
        question: 'Tell me about a time you had to coordinate across multiple departments.',
        hint: 'Name the departments, the friction point between them, and specifically how you kept communication clear and the project moving.',
      },
      {
        question: 'How do you track whether a process change actually improved outcomes?',
        hint: 'Mention defining a measurable "before" baseline, the metric you tracked after, and being willing to admit if the change didn\'t help.',
      },
      {
        question: 'Describe a time you identified a bottleneck before it became a bigger problem.',
        hint: 'Show what signal tipped you off (not hindsight), how you confirmed it was real, and the action you took to address it early.',
      },
      {
        question: 'How do you handle a vendor or partner who isn\'t meeting expectations?',
        hint: 'Mention direct, documented communication about the gap, a clear escalation path, and how you decided whether to continue the relationship.',
      },
      {
        question: 'Tell me about a time you had to make a decision with incomplete data.',
        hint: 'Explain your reasoning with what you had, how you estimated the risk of being wrong, and how you planned to adjust if needed.',
      },
      {
        question: 'How do you document processes so others can follow them without you?',
        hint: 'Mention your actual format (step-by-step, screenshots, video), and how you validate someone else can actually follow it correctly.',
      },
      {
        question: 'Describe how you\'ve managed a project with a tight, non-negotiable deadline.',
        hint: 'Cover how you scoped ruthlessly, identified the critical path, and what you communicated to stakeholders about tradeoffs along the way.',
      },
    ],
  },
  {
    slug: 'general',
    label: 'General Professional',
    keywords: [],
    questions: [
      {
        question: 'Tell me about yourself and what led you to apply for this role.',
        hint: 'Keep it brief and relevant: a short career arc, why this specific role/company now, not your full life story.',
      },
      {
        question: 'Describe a time you had to work with a difficult colleague. How did you handle it?',
        hint: 'Stay professional in how you describe them, focus on what YOU did to improve the working relationship, and the outcome.',
      },
      {
        question: 'What\'s an accomplishment you\'re particularly proud of, and why?',
        hint: 'Pick something with a clear personal contribution and measurable impact, and explain genuinely why it mattered to you, not just what looks impressive.',
      },
      {
        question: 'Tell me about a time you failed at something. What did you learn?',
        hint: 'Pick a real failure (not a humble-brag), own your part in it honestly, and show a concrete behavior change that followed.',
      },
      {
        question: 'How do you prioritize when you have multiple deadlines at once?',
        hint: 'Mention your actual method (urgency/impact, communicating tradeoffs) with a specific example, not just "I make a to-do list."',
      },
      {
        question: 'Describe a time you had to adapt to a significant change at work.',
        hint: 'Name the change, your initial reaction honestly, and what you specifically did to adjust and stay effective.',
      },
      {
        question: 'Tell me about a time you took initiative without being asked.',
        hint: 'Show you noticed a real gap or opportunity, the risk you took in acting without being told, and the outcome.',
      },
      {
        question: 'How do you handle feedback that\'s hard to hear?',
        hint: 'Show self-awareness — that your first reaction might be defensive, but how you actually process and act on tough feedback.',
      },
      {
        question: 'Describe a time you had to make a decision without all the information you wanted.',
        hint: 'Explain what you did know, how you filled the gap (judgment, quick research, asking someone), and how it turned out.',
      },
      {
        question: 'Why are you interested in this particular role and company?',
        hint: 'Be specific to THIS company/role (something you researched or genuinely connect with), not a generic answer that could apply anywhere.',
      },
    ],
  },
]

/**
 * Matches a job to the closest interview question category by keyword
 * detection against its title and tags — same deterministic approach used
 * elsewhere (deriveJobType, deriveExperienceLevel). Falls back to 'general'
 * when nothing matches.
 */
export function detectInterviewCategory(job) {
  const haystack = `${job.title ?? ''} ${(job.tags ?? []).join(' ')}`.toLowerCase()

  for (const category of INTERVIEW_CATEGORIES) {
    if (category.keywords.some((kw) => haystack.includes(kw))) {
      return category.slug
    }
  }
  return 'general'
}

export function getCategoryBySlug(slug) {
  return INTERVIEW_CATEGORIES.find((c) => c.slug === slug) ?? null
}
