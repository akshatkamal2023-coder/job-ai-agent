import { ArrowUpRight, Play, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ApplicationStage, JobApplication } from '../types';

interface PipelineViewProps {
  jobs: JobApplication[];
  activeJobId: string | null;
  runningJobIds: Set<string>;
  onSelectJob: (jobId: string) => void;
  onRunAgent: (job: JobApplication) => void;
  onRunQueuedBatch: () => void;
  onStageChange: (jobId: string, stage: ApplicationStage) => void;
  onDeleteJob: (jobId: string) => void;
  onOpenAddModal: () => void;
  onNavigateDiscover: () => void;
}

const STAGE_LABELS: Record<ApplicationStage, string> = {
  queued: 'Queued',
  running: 'Agent Running',
  prepared: 'Packet Ready',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  archived: 'Archived',
};

const STAGE_TEXT_COLORS: Record<ApplicationStage, string> = {
  queued: 'text-amber-700',
  running: 'text-blue-700',
  prepared: 'text-blue-700',
  applied: 'text-emerald-700',
  interviewing: 'text-indigo-700',
  offer: 'text-emerald-800',
  archived: 'text-slate-500',
};

type FilterTab = 'all' | 'queued' | 'prepared' | 'applied' | 'interviewing';

export function PipelineView({
  jobs,
  runningJobIds,
  onSelectJob,
  onRunAgent,
  onRunQueuedBatch,
  onStageChange,
  onDeleteJob,
  onOpenAddModal,
  onNavigateDiscover,
}: PipelineViewProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queuedJobs = useMemo(
    () => jobs.filter((j) => j.stage === 'queued' && !runningJobIds.has(j.id)),
    [jobs, runningJobIds]
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filter !== 'all') {
        if (filter === 'queued' && job.stage !== 'queued' && job.stage !== 'running') {
          return false;
        }
        if (filter !== 'queued' && job.stage !== filter) {
          return false;
        }
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q)
      );
    });
  }, [jobs, filter, searchQuery]);

  const filterTabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'all', label: 'All Roles', count: jobs.length },
    {
      id: 'queued',
      label: 'Queued',
      count: jobs.filter((j) => j.stage === 'queued' || j.stage === 'running').length,
    },
    {
      id: 'prepared',
      label: 'Packet Ready',
      count: jobs.filter((j) => j.stage === 'prepared').length,
    },
    {
      id: 'applied',
      label: 'Applied',
      count: jobs.filter((j) => j.stage === 'applied').length,
    },
    {
      id: 'interviewing',
      label: 'Interviewing',
      count: jobs.filter((j) => j.stage === 'interviewing').length,
    },
  ];

  const stats = useMemo(() => {
    const ready = jobs.filter((j) => Boolean(j.packet)).length;
    const applied = jobs.filter(
      (j) => j.stage === 'applied' || j.stage === 'interviewing' || j.stage === 'offer'
    ).length;
    const scored = jobs.filter((j) => j.packet?.fitAudit.matchScore !== undefined);
    const avgScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((acc, j) => acc + (j.packet?.fitAudit.matchScore || 0), 0) /
              scored.length
          )
        : null;
    return { ready, applied, avgScore };
  }, [jobs]);

  return (
    <div className="space-y-6">
      {/* Compact Metrics Strip */}
      <div className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Tracked Roles</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {jobs.length}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Queued for Agent</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {queuedJobs.length}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Tailored Packets</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-blue-600 tabular-nums">
            {stats.ready}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Submitted / Active</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
              {stats.applied}
            </span>
            {stats.avgScore !== null && (
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                · Avg Fit {stats.avgScore}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Filter Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 font-mono text-slate-400 tabular-nums">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by role, company, location"
              aria-label="Filter jobs"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {queuedJobs.length > 0 && (
            <button
              type="button"
              onClick={onRunQueuedBatch}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Run Agent on Queued ({queuedJobs.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* High-Density Pipeline Table */}
      {filteredJobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <h3 className="font-display text-base font-semibold text-slate-900">
            {jobs.length === 0 ? 'No job postings in your pipeline yet' : 'No matching roles found'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            {jobs.length === 0
              ? 'Import a job posting URL, paste a description, or search live roles to let the application agent build your tailored packet.'
              : 'Adjust your status filter or search query to view other roles.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Add Job Posting
            </button>
            <button
              type="button"
              onClick={onNavigateDiscover}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Discover Live Roles
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 pr-4 pl-5">Role & Company</th>
                <th className="px-4 py-3">Alignment</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Added</th>
                <th className="py-3 pr-5 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredJobs.map((job) => {
                const isRunning = runningJobIds.has(job.id) || job.stage === 'running';
                const effectiveStage: ApplicationStage = isRunning ? 'running' : job.stage;
                const score = job.packet?.fitAudit.matchScore;

                return (
                  <tr
                    key={job.id}
                    className="group transition-colors hover:bg-slate-50/80"
                  >
                    <td className="py-3.5 pr-4 pl-5">
                      <button
                        type="button"
                        onClick={() => onSelectJob(job.id)}
                        className="text-left focus:outline-none"
                      >
                        <p className="font-display font-semibold text-slate-900 group-hover:text-blue-600">
                          {job.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{job.company}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{job.location}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{job.workMode}</span>
                          {job.salaryRange && job.salaryRange !== 'Not disclosed' && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono tabular-nums">{job.salaryRange}</span>
                            </>
                          )}
                        </p>
                      </button>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {score !== undefined ? (
                        <div>
                          <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                            {score}%
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            {job.packet?.fitAudit.matchLabel}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Pending audit</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <select
                        aria-label={`Stage for ${job.title}`}
                        value={effectiveStage}
                        disabled={isRunning}
                        onChange={(e) =>
                          onStageChange(job.id, e.target.value as ApplicationStage)
                        }
                        className={`cursor-pointer rounded-md border border-transparent bg-transparent py-1 pr-6 pl-1 text-xs font-semibold focus:border-slate-300 focus:bg-white focus:outline-none ${STAGE_TEXT_COLORS[effectiveStage]}`}
                      >
                        <option value="queued">{STAGE_LABELS.queued}</option>
                        {isRunning && (
                          <option value="running">{STAGE_LABELS.running}</option>
                        )}
                        <option value="prepared">{STAGE_LABELS.prepared}</option>
                        <option value="applied">{STAGE_LABELS.applied}</option>
                        <option value="interviewing">{STAGE_LABELS.interviewing}</option>
                        <option value="offer">{STAGE_LABELS.offer}</option>
                        <option value="archived">{STAGE_LABELS.archived}</option>
                      </select>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {job.addedAt}
                    </td>

                    <td className="py-3.5 pr-5 pl-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        {!job.packet && !isRunning ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectJob(job.id);
                              onRunAgent(job);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
                          >
                            <Play className="h-3 w-3" />
                            <span>Run Agent</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectJob(job.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                          >
                            <span>{isRunning ? 'View Progress' : 'Open Packet'}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteJob(job.id)}
                          aria-label={`Remove ${job.title}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
