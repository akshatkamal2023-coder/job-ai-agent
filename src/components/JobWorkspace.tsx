import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { refineApplicationSection } from '../api';
import type {
  ApplicationPacket,
  ApplicationStage,
  CandidateProfile,
  JobApplication,
} from '../types';

export interface AgentStepStatus {
  step: 'audit' | 'resume' | 'outreach' | 'screening';
  label: string;
  state: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

interface JobWorkspaceProps {
  job: JobApplication;
  profile: CandidateProfile;
  isRunning: boolean;
  steps: AgentStepStatus[];
  runError?: string;
  onBack: () => void;
  onRunAgent: (job: JobApplication) => void;
  onUpdateJob: (updated: JobApplication) => void;
}

type PacketTab = 'audit' | 'resume' | 'outreach' | 'screening' | 'posting';

export function JobWorkspace({
  job,
  profile,
  isRunning,
  steps,
  runError,
  onBack,
  onRunAgent,
  onUpdateJob,
}: JobWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<PacketTab>('audit');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refiningSection, setRefiningSection] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [refineError, setRefineError] = useState('');

  const [newQuestion, setNewQuestion] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);

  const packet = job.packet;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const updatePacket = (updater: (prev: ApplicationPacket) => ApplicationPacket) => {
    if (!packet) return;
    onUpdateJob({
      ...job,
      packet: updater(packet),
    });
  };

  const handleRefine = async (
    section: 'coverLetter' | 'recruiterNote' | 'tailoredSummary',
    instruction: string
  ) => {
    if (!packet || !instruction.trim()) return;
    setRefineError('');
    setRefiningSection(section);
    try {
      const currentContent =
        section === 'coverLetter'
          ? packet.coverLetter
          : section === 'recruiterNote'
          ? packet.recruiterNote
          : packet.tailoredResume.tailoredSummary;

      const updatedText = await refineApplicationSection({
        job,
        profile,
        section,
        currentContent,
        instruction,
      });

      updatePacket((prev) => {
        if (section === 'coverLetter') return { ...prev, coverLetter: updatedText };
        if (section === 'recruiterNote') return { ...prev, recruiterNote: updatedText };
        return {
          ...prev,
          tailoredResume: {
            ...prev.tailoredResume,
            tailoredSummary: updatedText,
          },
        };
      });
      if (section === 'coverLetter') setRefinePrompt('');
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Unable to refine section.');
    } finally {
      setRefiningSection(null);
    }
  };

  const handleAddScreeningQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!packet || !newQuestion.trim()) return;
    setRefineError('');
    setAddingQuestion(true);
    try {
      const answer = await refineApplicationSection({
        job,
        profile,
        section: 'screeningAnswer',
        question: newQuestion.trim(),
        instruction: `Draft a clear, truthful application answer for: ${newQuestion.trim()}`,
      });
      updatePacket((prev) => ({
        ...prev,
        screeningAnswers: [
          ...prev.screeningAnswers,
          { question: newQuestion.trim(), answer },
        ],
      }));
      setNewQuestion('');
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Unable to draft answer.');
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleCopyFullPacket = () => {
    if (!packet) return;
    const text = [
      `${job.title} — ${job.company}`,
      `Candidate: ${profile.fullName} (${profile.email})`,
      '',
      '=== TAILORED SUMMARY ===',
      packet.tailoredResume.tailoredSummary,
      '',
      '=== TAILORED EXPERIENCE ===',
      ...packet.tailoredResume.tailoredExperiences.flatMap((exp) => [
        `${exp.role} | ${exp.company} (${exp.period})`,
        ...exp.highlightedBullets.map((b) => `- ${b}`),
        '',
      ]),
      '=== COVER LETTER ===',
      packet.coverLetter,
      '',
      '=== OUTREACH NOTE ===',
      packet.recruiterNote,
      '',
      '=== SCREENING Q&A ===',
      ...packet.screeningAnswers.flatMap((qa) => [`Q: ${qa.question}`, `A: ${qa.answer}`, '']),
    ].join('\n');
    copyText('full-packet', text);
  };

  const tabs: { id: PacketTab; label: string }[] = [
    { id: 'audit', label: 'Fit & ATS Audit' },
    { id: 'resume', label: 'Tailored Resume' },
    { id: 'outreach', label: 'Cover Letter & Outreach' },
    { id: 'screening', label: 'Screening Q&A' },
    { id: 'posting', label: 'Job Posting' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Return & Action Bar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between no-print">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Pipeline</span>
          </button>

          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
            {job.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{job.company}</span>
            <span aria-hidden="true"> · </span>
            <span>{job.location}</span>
            <span aria-hidden="true"> · </span>
            <span>{job.workMode}</span>
            <span aria-hidden="true"> · </span>
            <span className="font-mono tabular-nums">{job.salaryRange}</span>
            {job.jobUrl && (
              <>
                <span aria-hidden="true"> · </span>
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <span>Original Posting</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <select
            aria-label="Application stage"
            value={isRunning ? 'running' : job.stage}
            disabled={isRunning}
            onChange={(e) => {
              const stage = e.target.value as ApplicationStage;
              onUpdateJob({
                ...job,
                stage,
                appliedAt:
                  stage === 'applied' && !job.appliedAt
                    ? new Date().toISOString().slice(0, 10)
                    : job.appliedAt,
              });
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            <option value="queued">Stage: Queued</option>
            {isRunning && <option value="running">Stage: Agent Running</option>}
            <option value="prepared">Stage: Packet Ready</option>
            <option value="applied">Stage: Applied</option>
            <option value="interviewing">Stage: Interviewing</option>
            <option value="offer">Stage: Offer</option>
            <option value="archived">Stage: Archived</option>
          </select>

          {packet && (
            <>
              <button
                type="button"
                onClick={handleCopyFullPacket}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                {copiedKey === 'full-packet' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedKey === 'full-packet' ? 'Copied Packet' : 'Copy Packet'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / PDF</span>
              </button>

              {job.stage !== 'applied' && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateJob({
                      ...job,
                      stage: 'applied',
                      appliedAt: new Date().toISOString().slice(0, 10),
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Applied</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            disabled={isRunning}
            onClick={() => onRunAgent(job)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : packet ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>
              {isRunning
                ? 'Running Agent...'
                : packet
                ? 'Re-run Agent'
                : 'Run Application Agent'}
            </span>
          </button>
        </div>
      </div>

      {/* Live Multi-Step Agent Execution Progress */}
      {(isRunning || steps.some((s) => s.state !== 'pending')) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 no-print">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Application Agent Execution
            </h2>
            {isRunning && (
              <span className="text-xs font-medium text-blue-600">
                Processing steps sequentially
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, idx) => (
              <div
                key={s.step}
                className={`rounded-lg border p-3.5 transition-colors ${
                  s.state === 'active'
                    ? 'border-blue-300 bg-blue-50/40'
                    : s.state === 'done'
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : s.state === 'error'
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                    0{idx + 1}
                  </span>
                  {s.state === 'active' && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  )}
                  {s.state === 'done' && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </div>
                <p className="mt-1.5 text-xs font-semibold text-slate-900">{s.label}</p>
                {s.detail && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{s.detail}</p>
                )}
              </div>
            ))}
          </div>
          {runError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {runError}
            </p>
          )}
        </div>
      )}

      {/* Segmented Navigation Inside Job Workspace */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit no-print">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {refineError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 no-print">
          {refineError}
        </div>
      )}

      {/* Empty Packet State */}
      {!packet && activeTab !== 'posting' ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Application packet has not been generated yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-500">
            Run the Application Agent to audit your fit against {job.company}’s requirements, tailor your resume bullets, draft a cover letter, and answer screening questions.
          </p>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => onRunAgent(job)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{isRunning ? 'Generating Packet...' : 'Run Application Agent'}</span>
          </button>
        </div>
      ) : null}

      {/* Tab 1: Fit & ATS Audit */}
      {packet && activeTab === 'audit' && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Candidate Fit Assessment</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                  {packet.fitAudit.matchScore}%
                </span>
                <span className="font-display text-base font-semibold text-blue-700">
                  {packet.fitAudit.matchLabel}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              Generated {new Date(packet.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Executive Fit Summary
            </h3>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
              {packet.fitAudit.summary}
            </p>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Recommended Positioning Angle
            </h3>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
              {packet.fitAudit.recommendedAngle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 border-t border-slate-200 pt-5 md:grid-cols-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Matched Qualifications
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {packet.fitAudit.matchedSkills.map((skill) => (
                  <li key={skill} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Gaps to Address in Cover Letter / Interview
              </h3>
              {packet.fitAudit.missingRequirements.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No major requirement gaps detected against your dossier.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {packet.fitAudit.missingRequirements.map((gap) => (
                    <li key={gap} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Priority ATS Keywords
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {packet.fitAudit.atsKeywords.join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Tailored Resume */}
      {packet && activeTab === 'resume' && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 no-print">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Role-Tailored Resume Content
              </h2>
              <p className="text-xs text-slate-500">
                Grounded strictly in your verified employment history. Edit directly before exporting.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                copyText(
                  'resume',
                  [
                    profile.fullName,
                    `${profile.email} · ${profile.phone} · ${profile.location}`,
                    '',
                    'SUMMARY',
                    packet.tailoredResume.tailoredSummary,
                    '',
                    'EXPERIENCE',
                    ...packet.tailoredResume.tailoredExperiences.flatMap((exp) => [
                      `${exp.role} — ${exp.company} (${exp.period})`,
                      ...exp.highlightedBullets.map((b) => `• ${b}`),
                      '',
                    ]),
                    `KEY SKILLS: ${packet.tailoredResume.skillsToEmphasize.join(', ')}`,
                  ].join('\n')
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {copiedKey === 'resume' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copiedKey === 'resume' ? 'Copied Resume' : 'Copy Resume Text'}</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="tailored-summary"
                className="font-display text-sm font-semibold text-slate-900"
              >
                Tailored Professional Summary
              </label>
              <button
                type="button"
                disabled={refiningSection === 'tailoredSummary'}
                onClick={() =>
                  handleRefine(
                    'tailoredSummary',
                    'Tighten this summary to 2 impactful sentences emphasizing quantified outcomes.'
                  )
                }
                className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 no-print"
              >
                {refiningSection === 'tailoredSummary'
                  ? 'Refining...'
                  : 'Tighten to 2 sentences'}
              </button>
            </div>
            <textarea
              id="tailored-summary"
              rows={3}
              value={packet.tailoredResume.tailoredSummary}
              onChange={(e) =>
                updatePacket((prev) => ({
                  ...prev,
                  tailoredResume: {
                    ...prev.tailoredResume,
                    tailoredSummary: e.target.value,
                  },
                }))
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-sm leading-relaxed text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-5 border-t border-slate-200 pt-5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Prioritized Experience Bullets
            </h3>
            {packet.tailoredResume.tailoredExperiences.map((exp, expIdx) => (
              <div key={`${exp.company}-${expIdx}`} className="space-y-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-sm font-semibold text-slate-900">
                    {exp.role} <span className="font-normal text-slate-500">at</span> {exp.company}
                  </p>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {exp.period}
                  </span>
                </div>
                <ul className="space-y-2">
                  {exp.highlightedBullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <textarea
                        rows={2}
                        value={bullet}
                        onChange={(e) => {
                          const val = e.target.value;
                          updatePacket((prev) => ({
                            ...prev,
                            tailoredResume: {
                              ...prev.tailoredResume,
                              tailoredExperiences: prev.tailoredResume.tailoredExperiences.map(
                                (item, idx) =>
                                  idx === expIdx
                                    ? {
                                        ...item,
                                        highlightedBullets: item.highlightedBullets.map((b, j) =>
                                          j === bIdx ? val : b
                                        ),
                                      }
                                    : item
                              ),
                            },
                          }));
                        }}
                        className="w-full rounded-md border border-transparent px-2 py-1 text-sm leading-relaxed text-slate-700 hover:border-slate-200 focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Emphasized Core Skills
            </h3>
            <p className="mt-2 text-sm text-slate-700">
              {packet.tailoredResume.skillsToEmphasize.join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Cover Letter & Outreach */}
      {packet && activeTab === 'outreach' && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Cover Letter
                </h2>
                <p className="text-xs text-slate-500">
                  Specific to {job.company}’s role requirements and your concrete project metrics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText('cover-letter', packet.coverLetter)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 no-print"
              >
                {copiedKey === 'cover-letter' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedKey === 'cover-letter' ? 'Copied' : 'Copy Cover Letter'}</span>
              </button>
            </div>

            <textarea
              rows={12}
              value={packet.coverLetter}
              onChange={(e) =>
                updatePacket((prev) => ({ ...prev, coverLetter: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-4 text-sm leading-relaxed text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-2 no-print">
              <span className="text-xs font-medium text-slate-500">Quick Refine:</span>
              {[
                { label: 'More Concise', prompt: 'Shorten by 30% while keeping concrete metrics.' },
                {
                  label: 'More Technical',
                  prompt: 'Emphasize architecture, latency, and systems engineering depth.',
                },
                {
                  label: 'Executive Tone',
                  prompt: 'Shift tone toward product leadership and cross-functional impact.',
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={refiningSection === 'coverLetter'}
                  onClick={() => handleRefine('coverLetter', preset.prompt)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRefine('coverLetter', refinePrompt);
              }}
              className="flex gap-2 pt-1 no-print"
            >
              <input
                type="text"
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                placeholder="Ask the agent to adjust tone, emphasize a specific project, or address a gap..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={refiningSection === 'coverLetter' || !refinePrompt.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {refiningSection === 'coverLetter' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Revise</span>
              </button>
            </form>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Recruiter / Hiring Manager Outreach Note
                </h2>
                <p className="text-xs text-slate-500">
                  Short direct message for LinkedIn InMail or email after submitting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyText('recruiter-note', packet.recruiterNote)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 no-print"
              >
                {copiedKey === 'recruiter-note' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedKey === 'recruiter-note' ? 'Copied' : 'Copy Note'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={packet.recruiterNote}
              onChange={(e) =>
                updatePacket((prev) => ({ ...prev, recruiterNote: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 text-sm leading-relaxed text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Screening Q&A */}
      {packet && activeTab === 'screening' && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Application Form & Screening Answers
            </h2>
            <p className="text-xs text-slate-500">
              Ready-to-paste answers tailored to {job.company}. Add any custom prompt from the application portal below.
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            {packet.screeningAnswers.map((qa, idx) => (
              <div key={idx} className="space-y-2 py-4 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{qa.question}</p>
                  <button
                    type="button"
                    onClick={() => copyText(`qa-${idx}`, qa.answer)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap shrink-0 no-print"
                  >
                    {copiedKey === `qa-${idx}` ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedKey === `qa-${idx}` ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={qa.answer}
                  onChange={(e) => {
                    const val = e.target.value;
                    updatePacket((prev) => ({
                      ...prev,
                      screeningAnswers: prev.screeningAnswers.map((item, j) =>
                        j === idx ? { ...item, answer: val } : item
                      ),
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-sm leading-relaxed text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddScreeningQuestion}
            className="flex flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row no-print"
          >
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Paste another application form question (e.g. 'Tell us about a time you disagreed on architecture')..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={addingQuestion || !newQuestion.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {addingQuestion ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>{addingQuestion ? 'Drafting...' : 'Draft Answer'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Original Job Posting */}
      {activeTab === 'posting' && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Role Overview
            </h2>
            <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {job.description}
            </p>
          </div>

          {job.requirements.length > 0 && (
            <div className="border-t border-slate-200 pt-5">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Extracted Requirements
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {job.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-slate-200 pt-5">
            <label
              htmlFor="job-personal-notes"
              className="font-display text-sm font-semibold text-slate-900"
            >
              Personal Notes
            </label>
            <textarea
              id="job-personal-notes"
              rows={3}
              value={job.notes}
              onChange={(e) => onUpdateJob({ ...job, notes: e.target.value })}
              placeholder="Track referral contacts, recruiter names, or interview dates..."
              className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
