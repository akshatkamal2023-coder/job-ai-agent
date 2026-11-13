import type { CandidateProfile, JobApplication } from '../types';

export const CANDIDATE_AVATAR_PATH = '/src/assets/images/candidate_avatar_1794591226792.jpg';

export const INITIAL_PROFILE: CandidateProfile = {
  fullName: 'Daniel Mercer',
  headline: 'Senior Full-Stack & Product Engineer',
  email: 'daniel.mercer@example.com',
  phone: '+1 (415) 555-0192',
  location: 'San Francisco, CA',
  linkedinUrl: 'https://linkedin.com/in/danielmercer',
  portfolioUrl: 'https://danielmercer.dev',
  targetRoles: 'Senior Full-Stack Engineer, Staff Product Engineer, Founding Engineer',
  workAuthorization: 'Authorized to work in the US without sponsorship',
  salaryExpectation: '$185,000 – $215,000 base',
  noticePeriod: '2 weeks notice',
  yearsExperience: 6,
  summary:
    'Product-minded full-stack engineer with 6+ years building high-throughput TypeScript/React web applications, workflow automation tools, and distributed Node.js/PostgreSQL backends. Led zero-to-one product launches and halved p95 API latency across customer-facing dashboards.',
  skills: [
    'TypeScript',
    'React',
    'Node.js',
    'Next.js',
    'PostgreSQL',
    'GraphQL',
    'Tailwind CSS',
    'Python',
    'Redis',
    'AWS',
    'Docker',
    'CI/CD',
    'System Design',
    'LLM Workflows',
  ],
  experiences: [
    {
      id: 'exp-1',
      company: 'Northstar Ops',
      role: 'Senior Software Engineer',
      period: '2023 – Present',
      location: 'San Francisco, CA (Hybrid)',
      bullets: [
        'Architected a real-time workflow orchestration dashboard in React and TypeScript used daily by 14,000+ operations managers.',
        'Designed a Node.js and PostgreSQL queue processor handling 1.2M background automation tasks per day with 99.97% reliability.',
        'Reduced core query p95 latency from 420ms to 165ms via composite indexing, Redis read-through caching, and batched RPC endpoints.',
        'Mentored 4 mid-level engineers through bi-weekly architecture reviews and established end-to-end Playwright test coverage.',
      ],
    },
    {
      id: 'exp-2',
      company: 'Fieldline Systems',
      role: 'Software Engineer II',
      period: '2020 – 2023',
      location: 'Seattle, WA (Remote)',
      bullets: [
        'Built customer onboarding and automated document ingestion pipelines using Next.js, Python FastAPI, and AWS S3.',
        'Shipped a role-based access control and audit logging layer required to close 18 enterprise contracts totaling $2.4M ARR.',
        'Collaborated directly with product design to create an accessible component system adopted across 5 internal engineering squads.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of Washington',
      degree: 'B.S. in Computer Science',
      period: '2016 – 2020',
    },
  ],
  customQA: [
    {
      id: 'qa-1',
      question: 'Why are you exploring new opportunities?',
      answer:
        'I am looking for a high-ownership product engineering role where I can shape core technical architecture, work closely with customers, and build AI-assisted developer or operational workflows at scale.',
    },
    {
      id: 'qa-2',
      question: 'Describe a challenging technical project you led end-to-end.',
      answer:
        'At Northstar Ops, I led the redesign of our async job execution engine and live status console, migrating from polling to event-driven workers and cutting p95 dashboard latency by 60% while supporting 3x job volume.',
    },
  ],
};

export const INITIAL_JOBS: JobApplication[] = [
  {
    id: 'job-1',
    title: 'Senior Product Engineer, Automation',
    company: 'Linearity Labs',
    location: 'San Francisco, CA',
    workMode: 'Hybrid',
    salaryRange: '$180,000 – $220,000',
    jobUrl: 'https://jobs.example.com/linearity-labs/senior-product-engineer',
    source: 'Company Careers',
    description:
      'We are looking for a Senior Product Engineer to build intuitive workflow automation tools for enterprise operations teams. You will own features end-to-end across our React + TypeScript frontend and Node.js + PostgreSQL backend, collaborate closely with design, and integrate reliable LLM-assisted extraction steps into customer pipelines.',
    requirements: [
      '5+ years building production web applications with TypeScript and React',
      'Strong backend experience with Node.js, PostgreSQL, and asynchronous job queues',
      'Track record of owning ambiguous product initiatives from spec to launch',
      'Experience designing low-latency UIs for dense operational datasets',
      'Familiarity with structured LLM outputs and evaluation workflows',
    ],
    stage: 'prepared',
    addedAt: '2026-11-12',
    notes: 'High alignment with Northstar Ops queue dashboard work.',
    packet: {
      fitAudit: {
        matchLabel: 'Strong Match',
        matchScore: 91,
        summary:
          'Your 6 years of TypeScript/React product engineering and direct ownership of a 1.2M/day Node.js + PostgreSQL workflow queue at Northstar Ops align directly with Linearity Labs’ core requirements.',
        matchedSkills: [
          'TypeScript',
          'React',
          'Node.js',
          'PostgreSQL',
          'Async Job Queues',
          'LLM Workflows',
        ],
        missingRequirements: [
          'Explicit mention of formal LLM evaluation harnesses in prior metrics',
        ],
        atsKeywords: [
          'Workflow Automation',
          'TypeScript',
          'React',
          'Node.js',
          'PostgreSQL',
          'Asynchronous Queues',
          'Product Ownership',
          'Low-Latency UI',
        ],
        recommendedAngle:
          'Lead with the 14,000-user workflow orchestration dashboard and the 60% p95 latency reduction, framing your Fieldline document ingestion pipeline as proof of end-to-end automation ownership.',
      },
      tailoredResume: {
        tailoredSummary:
          'Senior Product Engineer with 6+ years owning end-to-end workflow automation products in TypeScript, React, Node.js, and PostgreSQL. Proven track record shipping high-density operational UIs for 14,000+ daily users and scaling async execution queues to 1.2M+ daily jobs.',
        tailoredExperiences: [
          {
            company: 'Northstar Ops',
            role: 'Senior Software Engineer',
            period: '2023 – Present',
            highlightedBullets: [
              'Owned end-to-end architecture of a real-time workflow orchestration dashboard in React and TypeScript serving 14,000+ daily operations users.',
              'Built and scaled a Node.js + PostgreSQL asynchronous job queue processing 1.2M+ automation tasks daily at 99.97% reliability.',
              'Cut core operational query p95 latency by 61% (420ms to 165ms) through PostgreSQL composite indexing, Redis caching, and batched RPCs.',
            ],
          },
          {
            company: 'Fieldline Systems',
            role: 'Software Engineer II',
            period: '2020 – 2023',
            highlightedBullets: [
              'Engineered automated document ingestion and onboarding workflows using Next.js, Python FastAPI, and AWS S3.',
              'Delivered enterprise RBAC and audit logging capabilities that unlocked $2.4M in new ARR across 18 enterprise accounts.',
            ],
          },
        ],
        skillsToEmphasize: [
          'TypeScript',
          'React',
          'Node.js',
          'PostgreSQL',
          'Redis',
          'LLM Workflows',
          'System Design',
        ],
      },
      coverLetter:
        'Dear Linearity Labs Hiring Team,\n\nI am excited to apply for the Senior Product Engineer, Automation role. Over the past six years—most recently as a Senior Software Engineer at Northstar Ops—I have specialized in turning complex asynchronous workflows into fast, legible products that operations teams rely on every day.\n\nAt Northstar Ops, I architected our React and TypeScript orchestration console used by over 14,000 daily managers, backed by a Node.js and PostgreSQL queue processing 1.2M tasks per day. By redesigning our data-fetching layer and indexing strategy, I lowered p95 query latency from 420ms to 165ms without compromising reliability. Previously at Fieldline Systems, I built automated document ingestion pipelines and partnered directly with product design to ship an accessible component system across five engineering squads.\n\nLinearity Labs’ focus on combining crisp operational UX with reliable LLM-assisted automation matches the exact intersection where I do my best work. I would welcome the chance to discuss how my background in high-density web interfaces and distributed job pipelines can accelerate your roadmap.\n\nBest regards,\nDaniel Mercer',
      recruiterNote:
        'Hi there — I applied for the Senior Product Engineer (Automation) role at Linearity Labs. Over the last 3 years at Northstar Ops I owned our React/TypeScript workflow console (14k DAU) and Node/Postgres async queue (1.2M jobs/day). Would love to connect if the team is reviewing candidates this week.',
      screeningAnswers: [
        {
          question: 'Why are you interested in Linearity Labs?',
          answer:
            'Linearity Labs sits directly at the intersection of high-craft operational interfaces and practical workflow automation, which mirrors my work building orchestration consoles and async pipelines at Northstar Ops.',
        },
        {
          question: 'Are you legally authorized to work in the United States?',
          answer: 'Yes, I am authorized to work in the US without sponsorship.',
        },
        {
          question: 'What are your base compensation expectations?',
          answer: '$185,000 – $215,000 base, flexible depending on total compensation structure and equity.',
        },
      ],
      generatedAt: '2026-11-12T16:40:00Z',
    },
  },
  {
    id: 'job-2',
    title: 'Staff Frontend Architect, Design Systems & Data Grids',
    company: 'Veridian Cloud',
    location: 'Remote (US)',
    workMode: 'Remote',
    salaryRange: '$195,000 – $235,000',
    jobUrl: 'https://jobs.example.com/veridian/staff-frontend-architect',
    source: 'LinkedIn',
    description:
      'Veridian Cloud is seeking a Staff Frontend Architect to unify our core telemetry explorer and design system. Candidates must have deep expertise in React performance profiling, virtualized tables, accessibility (WCAG AA), and mentoring multiple product teams.',
    requirements: [
      '7+ years of frontend architecture experience with React and TypeScript',
      'Deep knowledge of browser rendering performance, virtualization, and state machines',
      'Experience leading multi-squad design system adoption and WCAG AA compliance',
      'Strong written communication for RFCs and architectural standards',
    ],
    stage: 'queued',
    addedAt: '2026-11-13',
    notes: 'Ready for agent evaluation—check stretch fit on 7+ years requirement.',
  },
  {
    id: 'job-3',
    title: 'Full-Stack Software Engineer, Developer Platform',
    company: 'Harborline Financial',
    location: 'New York, NY',
    workMode: 'Hybrid',
    salaryRange: '$175,000 – $205,000',
    jobUrl: 'https://jobs.example.com/harborline/fullstack-dev-platform',
    source: 'Greenhouse',
    description:
      'Join Harborline’s Developer Platform group to build internal deployment portals, API key management workflows, and compliance audit dashboards. Tech stack includes TypeScript, Next.js, Node.js, PostgreSQL, and AWS.',
    requirements: [
      '4+ years full-stack experience with TypeScript, Next.js, and Node.js',
      'Production PostgreSQL schema design and performance tuning',
      'Experience implementing RBAC, audit logs, and secure developer tooling',
    ],
    stage: 'applied',
    addedAt: '2026-11-09',
    appliedAt: '2026-11-10',
    notes: 'Submitted packet via Greenhouse on Nov 10.',
  },
];
