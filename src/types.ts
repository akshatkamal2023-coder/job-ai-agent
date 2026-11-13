export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  period: string;
}

export interface CustomQA {
  id: string;
  question: string;
  answer: string;
}

export interface CandidateProfile {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  targetRoles: string;
  workAuthorization: string;
  salaryExpectation: string;
  noticePeriod: string;
  yearsExperience: number;
  summary: string;
  skills: string[];
  experiences: ExperienceItem[];
  education: EducationItem[];
  customQA: CustomQA[];
}

export type ApplicationStage =
  | 'queued'
  | 'running'
  | 'prepared'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'archived';

export interface FitAudit {
  matchLabel: 'Strong Match' | 'Good Match' | 'Stretch Match' | 'Low Alignment';
  matchScore: number;
  summary: string;
  matchedSkills: string[];
  missingRequirements: string[];
  atsKeywords: string[];
  recommendedAngle: string;
}

export interface TailoredExperience {
  company: string;
  role: string;
  period: string;
  highlightedBullets: string[];
}

export interface TailoredResume {
  tailoredSummary: string;
  tailoredExperiences: TailoredExperience[];
  skillsToEmphasize: string[];
}

export interface ScreeningAnswer {
  question: string;
  answer: string;
}

export interface ApplicationPacket {
  fitAudit: FitAudit;
  tailoredResume: TailoredResume;
  coverLetter: string;
  recruiterNote: string;
  screeningAnswers: ScreeningAnswer[];
  generatedAt: string;
}

export interface JobApplication {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  salaryRange: string;
  jobUrl: string;
  source: string;
  description: string;
  requirements: string[];
  stage: ApplicationStage;
  addedAt: string;
  appliedAt?: string;
  packet?: ApplicationPacket;
  notes: string;
}

export interface DiscoveredJob {
  title: string;
  company: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  salaryRange: string;
  jobUrl: string;
  summary: string;
  requirements: string[];
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AgentProgressEvent {
  step: 'audit' | 'resume' | 'outreach' | 'screening' | 'complete' | 'error';
  status: 'started' | 'completed' | 'failed';
  message: string;
  partial?: Partial<ApplicationPacket>;
  packet?: ApplicationPacket;
  error?: string;
}
