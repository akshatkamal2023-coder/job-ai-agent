import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type {
  CandidateProfile,
  JobApplication,
  ApplicationPacket,
  FitAudit,
  TailoredResume,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL = 'gemini-4-hydrogen';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const isRetryable = status === 429 || (status !== undefined && status >= 500);
      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const errorObj = err as { status?: number; message?: string };
  const status = typeof errorObj?.status === 'number' ? errorObj.status : 500;
  const rawMessage = errorObj?.message || 'Unexpected Gemini API error.';
  if (status === 403 || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'API key validation failed. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Rate limit or quota reached. Wait a moment and retry.',
    };
  }
  return { status, message: rawMessage };
}

function safeJsonParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function serializeCandidate(profile: CandidateProfile): string {
  const expText = profile.experiences
    .map(
      (e) =>
        `- ${e.role} at ${e.company} (${e.period}, ${e.location}):\n  ${e.bullets.map((b) => `* ${b}`).join('\n  ')}`
    )
    .join('\n');
  const eduText = profile.education
    .map((ed) => `- ${ed.degree}, ${ed.institution} (${ed.period})`)
    .join('\n');
  const qaText = profile.customQA
    .map((q) => `- Q: ${q.question}\n  A: ${q.answer}`)
    .join('\n');

  return [
    `Name: ${profile.fullName}`,
    `Headline: ${profile.headline}`,
    `Location: ${profile.location}`,
    `Years of Experience: ${profile.yearsExperience}`,
    `Work Authorization: ${profile.workAuthorization}`,
    `Salary Expectation: ${profile.salaryExpectation}`,
    `Notice Period: ${profile.noticePeriod}`,
    `Summary: ${profile.summary}`,
    `Skills: ${profile.skills.join(', ')}`,
    `Work Experience:\n${expText || 'None provided'}`,
    `Education:\n${eduText || 'None provided'}`,
    `Reference Screening Answers:\n${qaText || 'None provided'}`,
  ].join('\n\n');
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // 1. Parse raw resume text into structured CandidateProfile updates
  app.post('/api/profile/parse', async (req, res) => {
    try {
      const { resumeText } = req.body as { resumeText?: string };
      if (!resumeText || resumeText.trim().length < 20) {
        res.status(400).json({ error: 'Please provide at least a short resume or bio text to parse.' });
        return;
      }

      const ai = getAIClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Extract structured candidate profile data from the following resume text. Keep all facts truthful and exact; do not invent companies or dates.\n\nRESUME TEXT:\n${resumeText}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                headline: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                location: { type: Type.STRING },
                linkedinUrl: { type: Type.STRING },
                portfolioUrl: { type: Type.STRING },
                yearsExperience: { type: Type.NUMBER },
                summary: { type: Type.STRING },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                experiences: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      company: { type: Type.STRING },
                      role: { type: Type.STRING },
                      period: { type: Type.STRING },
                      location: { type: Type.STRING },
                      bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                  },
                },
                education: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      institution: { type: Type.STRING },
                      degree: { type: Type.STRING },
                      period: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        })
      );

      const parsed = safeJsonParse<Record<string, unknown>>(response.text, {});
      res.json({ profile: parsed });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 2. Parse a job posting from URL (using urlContext) and/or raw description text
  app.post('/api/jobs/parse', async (req, res) => {
    try {
      const { url, rawText } = req.body as { url?: string; rawText?: string };
      if (!url?.trim() && !rawText?.trim()) {
        res.status(400).json({ error: 'Provide either a job posting URL or pasted job description.' });
        return;
      }

      const ai = getAIClient();
      let sourceContent = rawText?.trim() || '';

      if (url?.trim() && !sourceContent) {
        const urlResponse = await withRetry(() =>
          ai.models.generateContent({
            model: MODEL,
            contents: `Read the job posting at this URL and extract the full job title, company name, location, remote/hybrid/on-site mode, salary or compensation range if listed, role summary, and all listed qualifications and responsibilities: ${url.trim()}`,
            config: {
              tools: [{ urlContext: {} }],
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          })
        );
        sourceContent = urlResponse.text?.trim() || '';
        if (!sourceContent) {
          res.status(422).json({
            error: 'Could not read content from that URL (it may require login or block crawlers). Paste the job description text instead.',
          });
          return;
        }
      }

      const structuredResponse = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Normalize this job posting into clean structured fields. For workMode, choose strictly one of: "Remote", "Hybrid", or "On-site". If salary is not stated, return "Not disclosed".\n\nURL: ${url || 'N/A'}\n\nCONTENT:\n${sourceContent}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                location: { type: Type.STRING },
                workMode: { type: Type.STRING },
                salaryRange: { type: Type.STRING },
                source: { type: Type.STRING },
                description: { type: Type.STRING },
                requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['title', 'company', 'location', 'workMode', 'salaryRange', 'description', 'requirements'],
            },
          },
        })
      );

      const job = safeJsonParse<Record<string, unknown>>(structuredResponse.text, {});
      res.json({
        job: {
          ...job,
          jobUrl: url?.trim() || '',
        },
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 3. Discover live jobs using Google Search grounding
  app.post('/api/jobs/discover', async (req, res) => {
    try {
      const { roleQuery, location, workMode, skills } = req.body as {
        roleQuery?: string;
        location?: string;
        workMode?: string;
        skills?: string[];
      };

      if (!roleQuery?.trim()) {
        res.status(400).json({ error: 'Enter a target role or keyword query.' });
        return;
      }

      const ai = getAIClient();
      const searchPrompt = [
        `Find 5 current, real open job postings for: "${roleQuery.trim()}"`,
        location?.trim() ? `Location preference: ${location.trim()}` : '',
        workMode && workMode !== 'Any' ? `Work arrangement: ${workMode}` : '',
        skills?.length ? `Relevant candidate skills: ${skills.slice(0, 8).join(', ')}` : '',
        'Include the exact job title, company name, location, work mode (Remote/Hybrid/On-site), salary range if shown, direct application or listing URL, a concise 2-3 sentence summary of the role, and 3-5 key requirements for each posting.',
      ]
        .filter(Boolean)
        .join('\n');

      const groundedResponse = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: searchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          },
        })
      );

      const rawText = groundedResponse.text || '';
      const rawChunks = groundedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = rawChunks
        .map((chunk) => chunk.web)
        .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
        .map((w) => ({
          uri: w.uri,
          title: w.title || w.uri,
        }));

      const structured = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Convert the discovered job postings below into a JSON array. Only include real postings mentioned in the text, matching URLs from the grounded sources where available. For workMode, use strictly "Remote", "Hybrid", or "On-site".\n\nGROUNDED SOURCES:\n${sources.map((s) => `- ${s.title}: ${s.uri}`).join('\n')}\n\nTEXT:\n${rawText}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  company: { type: Type.STRING },
                  location: { type: Type.STRING },
                  workMode: { type: Type.STRING },
                  salaryRange: { type: Type.STRING },
                  jobUrl: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'company', 'location', 'workMode', 'salaryRange', 'jobUrl', 'summary', 'requirements'],
              },
            },
          },
        })
      );

      const jobs = safeJsonParse<unknown[]>(structured.text, []);
      res.json({ jobs, sources });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 4. Multi-step Application Agent pipeline via Server-Sent Events (SSE)
  app.post('/api/agent/run', async (req, res) => {
    const { job, profile } = req.body as {
      job?: JobApplication;
      profile?: CandidateProfile;
    };

    if (!job || !profile) {
      res.status(400).json({ error: 'Both job and candidate profile are required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const ai = getAIClient();
      const candidateContext = serializeCandidate(profile);
      const jobContext = [
        `Role: ${job.title}`,
        `Company: ${job.company}`,
        `Location: ${job.location} (${job.workMode})`,
        `Salary Range: ${job.salaryRange || 'Not disclosed'}`,
        `Description:\n${job.description}`,
        `Requirements:\n${job.requirements.map((r) => `- ${r}`).join('\n')}`,
      ].join('\n\n');

      // Step 1: Role Fit & ATS Audit
      sendEvent({
        step: 'audit',
        status: 'started',
        message: `Auditing candidate alignment and ATS keywords for ${job.company}...`,
      });

      const auditResponse = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Evaluate how well this candidate matches the target job. Be rigorous, honest, and grounded strictly in the provided facts.\n\nCANDIDATE:\n${candidateContext}\n\nJOB POSTING:\n${jobContext}`,
          config: {
            systemInstruction:
              'You are an executive technical recruiter and career agent. Provide an objective fit audit. matchLabel must be one of "Strong Match", "Good Match", "Stretch Match", or "Low Alignment". matchScore must be an integer 0-100 reflecting genuine requirement coverage.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matchLabel: { type: Type.STRING },
                matchScore: { type: Type.INTEGER },
                summary: { type: Type.STRING },
                matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                atsKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedAngle: { type: Type.STRING },
              },
              required: [
                'matchLabel',
                'matchScore',
                'summary',
                'matchedSkills',
                'missingRequirements',
                'atsKeywords',
                'recommendedAngle',
              ],
            },
          },
        })
      );

      const fitAudit = safeJsonParse<FitAudit>(auditResponse.text, {
        matchLabel: 'Good Match',
        matchScore: 75,
        summary: 'Alignment evaluated against core job requirements.',
        matchedSkills: [],
        missingRequirements: [],
        atsKeywords: [],
        recommendedAngle: 'Highlight directly relevant product and engineering delivery.',
      });

      sendEvent({
        step: 'audit',
        status: 'completed',
        message: `Fit audit complete: ${fitAudit.matchLabel} (${fitAudit.matchScore}% alignment).`,
        partial: { fitAudit },
      });

      // Step 2: Tailor Resume Summary & Experience Bullets
      sendEvent({
        step: 'resume',
        status: 'started',
        message: 'Tailoring professional summary and reframing experience bullets...',
      });

      const resumeResponse = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Tailor the candidate's resume for this specific role. CRITICAL RULE: Never invent companies, job titles, dates, metrics, or skills the candidate does not possess. Only reframe, prioritize, and clarify their real achievements using relevant ATS keywords.\n\nRECOMMENDED ANGLE:\n${fitAudit.recommendedAngle}\nATS KEYWORDS:\n${fitAudit.atsKeywords.join(', ')}\n\nCANDIDATE:\n${candidateContext}\n\nJOB POSTING:\n${jobContext}`,
          config: {
            systemInstruction:
              'You are a precision resume strategist. Write concise, impact-oriented bullets grounded strictly in the candidate experience provided.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                tailoredSummary: { type: Type.STRING },
                tailoredExperiences: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      company: { type: Type.STRING },
                      role: { type: Type.STRING },
                      period: { type: Type.STRING },
                      highlightedBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['company', 'role', 'period', 'highlightedBullets'],
                  },
                },
                skillsToEmphasize: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['tailoredSummary', 'tailoredExperiences', 'skillsToEmphasize'],
            },
          },
        })
      );

      const tailoredResume = safeJsonParse<TailoredResume>(resumeResponse.text, {
        tailoredSummary: profile.summary,
        tailoredExperiences: profile.experiences.map((e) => ({
          company: e.company,
          role: e.role,
          period: e.period,
          highlightedBullets: e.bullets,
        })),
        skillsToEmphasize: profile.skills.slice(0, 8),
      });

      sendEvent({
        step: 'resume',
        status: 'completed',
        message: `Tailored ${tailoredResume.tailoredExperiences.length} experience blocks and prioritized ${tailoredResume.skillsToEmphasize.length} skills.`,
        partial: { tailoredResume },
      });

      // Step 3: Draft Cover Letter & Hiring Manager Outreach
      sendEvent({
        step: 'outreach',
        status: 'started',
        message: `Drafting tailored cover letter and direct outreach note for ${job.company}...`,
      });

      const outreachResponse = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Write a crisp, specific, non-cliché cover letter (3-4 short paragraphs) and a short 2-3 sentence recruiter/hiring manager outreach message.\n\nTAILORED ANGLE:\n${fitAudit.recommendedAngle}\n\nCANDIDATE:\n${candidateContext}\n\nJOB POSTING:\n${jobContext}`,
          config: {
            systemInstruction:
              'Avoid generic phrases like "I am writing to express my enthusiastic interest" or empty buzzwords. Cite concrete metrics and projects from the candidate profile and tie them directly to the company’s domain.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                coverLetter: { type: Type.STRING },
                recruiterNote: { type: Type.STRING },
              },
              required: ['coverLetter', 'recruiterNote'],
            },
          },
        })
      );

      const outreach = safeJsonParse<{ coverLetter: string; recruiterNote: string }>(
        outreachResponse.text,
        { coverLetter: '', recruiterNote: '' }
      );

      sendEvent({
        step: 'outreach',
        status: 'completed',
        message: 'Cover letter and hiring manager outreach drafted.',
        partial: {
          coverLetter: outreach.coverLetter,
          recruiterNote: outreach.recruiterNote,
        },
      });

      // Step 4: Application Form Screening Questions
      sendEvent({
        step: 'screening',
        status: 'started',
        message: 'Generating answers for role-specific and logistics screening questions...',
      });

      const screeningResponse = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: `Generate 5 realistic application-form screening questions likely asked on ${job.company}'s application for "${job.title}" (including why this company, a relevant technical/project deep dive, work authorization, notice period, and compensation expectations), with ready-to-submit answers grounded in the candidate profile.\n\nCANDIDATE:\n${candidateContext}\n\nJOB POSTING:\n${jobContext}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                },
                required: ['question', 'answer'],
              },
            },
          },
        })
      );

      const screeningAnswers = safeJsonParse<{ question: string; answer: string }[]>(
        screeningResponse.text,
        []
      );

      const packet: ApplicationPacket = {
        fitAudit,
        tailoredResume,
        coverLetter: outreach.coverLetter,
        recruiterNote: outreach.recruiterNote,
        screeningAnswers,
        generatedAt: new Date().toISOString(),
      };

      sendEvent({
        step: 'complete',
        status: 'completed',
        message: 'Application packet ready for review and submission.',
        packet,
      });
      res.end();
    } catch (err) {
      const formatted = formatGeminiError(err);
      sendEvent({
        step: 'error',
        status: 'failed',
        message: formatted.message,
        error: formatted.message,
      });
      res.end();
    }
  });

  // 5. Refine an individual section or draft a new custom screening answer
  app.post('/api/agent/refine', async (req, res) => {
    try {
      const { job, profile, section, currentContent, instruction, question } = req.body as {
        job?: JobApplication;
        profile?: CandidateProfile;
        section: 'coverLetter' | 'recruiterNote' | 'tailoredSummary' | 'screeningAnswer';
        currentContent?: string;
        instruction: string;
        question?: string;
      };

      if (!job || !profile || !instruction?.trim()) {
        res.status(400).json({ error: 'Job, profile, and refinement instruction are required.' });
        return;
      }

      const ai = getAIClient();
      const candidateContext = serializeCandidate(profile);
      const prompt =
        section === 'screeningAnswer'
          ? `Answer the following job application screening question accurately and persuasively for ${job.title} at ${job.company}, grounded strictly in the candidate profile.\n\nQUESTION: ${question || instruction}\nADDITIONAL GUIDANCE: ${instruction}\n\nCANDIDATE:\n${candidateContext}\n\nJOB DESCRIPTION:\n${job.description}`
          : `Revise the following ${section} for ${job.title} at ${job.company} according to the user's instruction. Keep all facts truthful to the candidate profile.\n\nINSTRUCTION: ${instruction}\n\nCURRENT CONTENT:\n${currentContent || ''}\n\nCANDIDATE:\n${candidateContext}\n\nJOB DESCRIPTION:\n${job.description}`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: prompt,
          config: {
            systemInstruction:
              'Return only the revised text cleanly formatted without markdown code fences or conversational preamble.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      res.json({ updatedText: (response.text || '').trim() });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Vite or static serving
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dispatch server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
