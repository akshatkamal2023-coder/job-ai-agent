import { Menu, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { runApplicationAgent } from './api';
import { AddJobModal } from './components/AddJobModal';
import { DiscoverView } from './components/DiscoverView';
import { JobWorkspace, type AgentStepStatus } from './components/JobWorkspace';
import { PipelineView } from './components/PipelineView';
import { ProfileView } from './components/ProfileView';
import { Sidebar, type NavSection } from './components/Sidebar';
import { INITIAL_JOBS, INITIAL_PROFILE } from './data/seedData';
import type {
  ApplicationPacket,
  ApplicationStage,
  CandidateProfile,
  JobApplication,
} from './types';

const STORAGE_PROFILE_KEY = 'dispatch_candidate_profile_v1';
const STORAGE_JOBS_KEY = 'dispatch_job_applications_v1';

function createInitialSteps(): AgentStepStatus[] {
  return [
    { step: 'audit', label: 'Fit & ATS Audit', state: 'pending' },
    { step: 'resume', label: 'Tailor Resume', state: 'pending' },
    { step: 'outreach', label: 'Cover Letter & Note', state: 'pending' },
    { step: 'screening', label: 'Screening Q&A', state: 'pending' },
  ];
}

export default function App() {
  const [profile, setProfile] = useState<CandidateProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      return saved ? (JSON.parse(saved) as CandidateProfile) : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const [jobs, setJobs] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_JOBS_KEY);
      return saved ? (JSON.parse(saved) as JobApplication[]) : INITIAL_JOBS;
    } catch {
      return INITIAL_JOBS;
    }
  });

  const [activeSection, setActiveSection] = useState<NavSection>('pipeline');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [runningJobIds, setRunningJobIds] = useState<Set<string>>(new Set());
  const [stepsByJob, setStepsByJob] = useState<Record<string, AgentStepStatus[]>>({});
  const [errorsByJob, setErrorsByJob] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // ignore storage quota errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_JOBS_KEY, JSON.stringify(jobs));
    } catch {
      // ignore storage quota errors
    }
  }, [jobs]);

  const counts = useMemo(
    () => ({
      total: jobs.length,
      queued: jobs.filter((j) => j.stage === 'queued').length,
      prepared: jobs.filter((j) => j.stage === 'prepared').length,
      applied: jobs.filter(
        (j) =>
          j.stage === 'applied' ||
          j.stage === 'interviewing' ||
          j.stage === 'offer'
      ).length,
    }),
    [jobs]
  );

  const existingUrls = useMemo(
    () => new Set(jobs.map((j) => j.jobUrl.trim()).filter(Boolean)),
    [jobs]
  );

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const handleUpdateJob = useCallback((updated: JobApplication) => {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
  }, []);

  const handleStageChange = useCallback(
    (jobId: string, stage: ApplicationStage) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                stage,
                appliedAt:
                  stage === 'applied' && !j.appliedAt
                    ? new Date().toISOString().slice(0, 10)
                    : j.appliedAt,
              }
            : j
        )
      );
    },
    []
  );

  const handleDeleteJob = useCallback(
    (jobId: string) => {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
      }
    },
    [selectedJobId]
  );

  const executeAgentForJob = useCallback(
    async (job: JobApplication) => {
      setRunningJobIds((prev) => new Set(prev).add(job.id));
      setStepsByJob((prev) => ({ ...prev, [job.id]: createInitialSteps() }));
      setErrorsByJob((prev) => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });

      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, stage: 'running' } : j))
      );

      let partialPacket: Partial<ApplicationPacket> = {};

      try {
        await runApplicationAgent(job, profile, (event) => {
          if (
            event.step === 'audit' ||
            event.step === 'resume' ||
            event.step === 'outreach' ||
            event.step === 'screening'
          ) {
            setStepsByJob((prev) => {
              const current = prev[job.id] || createInitialSteps();
              return {
                ...prev,
                [job.id]: current.map((s) =>
                  s.step === event.step
                    ? {
                        ...s,
                        state:
                          event.status === 'started'
                            ? 'active'
                            : event.status === 'completed'
                            ? 'done'
                            : 'error',
                        detail: event.message,
                      }
                    : s
                ),
              };
            });

            if (event.partial) {
              partialPacket = { ...partialPacket, ...event.partial };
            }
          }

          if (event.step === 'complete' && event.packet) {
            const finalPacket = event.packet;
            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? {
                      ...j,
                      stage: 'prepared',
                      packet: finalPacket,
                    }
                  : j
              )
            );
          }

          if (event.step === 'error') {
            setErrorsByJob((prev) => ({
              ...prev,
              [job.id]: event.error || event.message,
            }));
            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? { ...j, stage: j.packet ? 'prepared' : 'queued' }
                  : j
              )
            );
          }
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Agent execution failed.';
        setErrorsByJob((prev) => ({ ...prev, [job.id]: message }));
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, stage: j.packet ? 'prepared' : 'queued' }
              : j
          )
        );
      } finally {
        setRunningJobIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      }
    },
    [profile]
  );

  const handleRunQueuedBatch = useCallback(async () => {
    const queued = jobs.filter(
      (j) => j.stage === 'queued' && !runningJobIds.has(j.id)
    );
    for (const job of queued) {
      await executeAgentForJob(job);
    }
  }, [jobs, runningJobIds, executeAgentForJob]);

  const handleAddJob = useCallback(
    (newJob: JobApplication, autoRun: boolean) => {
      setJobs((prev) => [newJob, ...prev]);
      setActiveSection('pipeline');
      setSelectedJobId(newJob.id);
      if (autoRun) {
        void executeAgentForJob(newJob);
      }
    },
    [executeAgentForJob]
  );

  const breadcrumb = useMemo(() => {
    if (activeSection === 'discover') return 'Dispatch / Discover Roles';
    if (activeSection === 'profile') return 'Dispatch / Candidate Dossier';
    if (selectedJob) return `Dispatch / Pipeline / ${selectedJob.company}`;
    return 'Dispatch / Application Pipeline';
  }, [activeSection, selectedJob]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(section) => {
          setActiveSection(section);
          if (section !== 'pipeline') {
            setSelectedJobId(null);
          }
        }}
        profile={profile}
        counts={counts}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action button on right */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 lg:px-8 no-print">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-medium text-slate-600">
              {breadcrumb}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Job</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-7 lg:px-8">
          {activeSection === 'pipeline' && !selectedJob && (
            <PipelineView
              jobs={jobs}
              activeJobId={selectedJobId}
              runningJobIds={runningJobIds}
              onSelectJob={(id) => setSelectedJobId(id)}
              onRunAgent={(job) => void executeAgentForJob(job)}
              onRunQueuedBatch={() => void handleRunQueuedBatch()}
              onStageChange={handleStageChange}
              onDeleteJob={handleDeleteJob}
              onOpenAddModal={() => setAddModalOpen(true)}
              onNavigateDiscover={() => setActiveSection('discover')}
            />
          )}

          {activeSection === 'pipeline' && selectedJob && (
            <JobWorkspace
              job={selectedJob}
              profile={profile}
              isRunning={runningJobIds.has(selectedJob.id)}
              steps={stepsByJob[selectedJob.id] || createInitialSteps()}
              runError={errorsByJob[selectedJob.id]}
              onBack={() => setSelectedJobId(null)}
              onRunAgent={(job) => void executeAgentForJob(job)}
              onUpdateJob={handleUpdateJob}
            />
          )}

          {activeSection === 'discover' && (
            <DiscoverView
              profile={profile}
              existingUrls={existingUrls}
              onAddJob={handleAddJob}
            />
          )}

          {activeSection === 'profile' && (
            <ProfileView profile={profile} onUpdateProfile={setProfile} />
          )}
        </main>
      </div>

      <AddJobModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddJob={handleAddJob}
      />
    </div>
  );
}
