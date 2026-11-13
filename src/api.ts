import type {
  AgentProgressEvent,
  CandidateProfile,
  DiscoveredJob,
  GroundingSource,
  JobApplication,
} from './types';

export async function parseResumeText(resumeText: string): Promise<Partial<CandidateProfile>> {
  const res = await fetch('/api/profile/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to parse resume text.');
  }
  return data.profile;
}

export async function parseJobPosting(payload: {
  url?: string;
  rawText?: string;
}): Promise<{
  title: string;
  company: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  salaryRange: string;
  source: string;
  description: string;
  requirements: string[];
  jobUrl: string;
}> {
  const res = await fetch('/api/jobs/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to parse job posting.');
  }
  return data.job;
}

export async function discoverJobs(payload: {
  roleQuery: string;
  location: string;
  workMode: string;
  skills: string[];
}): Promise<{ jobs: DiscoveredJob[]; sources: GroundingSource[] }> {
  const res = await fetch('/api/jobs/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to search for open roles.');
  }
  return data;
}

export async function runApplicationAgent(
  job: JobApplication,
  profile: CandidateProfile,
  onEvent: (event: AgentProgressEvent) => void
): Promise<void> {
  const res = await fetch('/api/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job, profile }),
  });

  if (!res.ok) {
    let message = 'Failed to run application agent.';
    try {
      const errData = await res.json();
      message = errData.error || message;
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Streaming response body unavailable.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const block of lines) {
      const dataLine = block
        .split('\n')
        .find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      const jsonStr = dataLine.slice(6).trim();
      if (!jsonStr) continue;
      const parsed = JSON.parse(jsonStr) as AgentProgressEvent;
      onEvent(parsed);
    }
  }
}

export async function refineApplicationSection(payload: {
  job: JobApplication;
  profile: CandidateProfile;
  section: 'coverLetter' | 'recruiterNote' | 'tailoredSummary' | 'screeningAnswer';
  currentContent?: string;
  instruction: string;
  question?: string;
}): Promise<string> {
  const res = await fetch('/api/agent/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to refine content.');
  }
  return data.updatedText;
}
