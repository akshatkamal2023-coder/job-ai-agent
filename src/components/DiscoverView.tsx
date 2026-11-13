import { ExternalLink, Loader2, Play, Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { discoverJobs } from '../api';
import type {
  CandidateProfile,
  DiscoveredJob,
  GroundingSource,
  JobApplication,
} from '../types';

interface DiscoverViewProps {
  profile: CandidateProfile;
  existingUrls: Set<string>;
  onAddJob: (job: JobApplication, autoRun: boolean) => void;
}

export function DiscoverView({ profile, existingUrls, onAddJob }: DiscoverViewProps) {
  const [roleQuery, setRoleQuery] = useState(
    profile.targetRoles.split(',')[0]?.trim() || 'Senior Full-Stack Engineer'
  );
  const [location, setLocation] = useState(profile.location || 'United States');
  const [workMode, setWorkMode] = useState('Any');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<DiscoveredJob[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!roleQuery.trim()) return;
    setError('');
    setSearching(true);
    setHasSearched(true);
    try {
      const data = await discoverJobs({
        roleQuery: roleQuery.trim(),
        location: location.trim(),
        workMode,
        skills: profile.skills,
      });
      setResults(data.jobs || []);
      setSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search live job listings.');
    } finally {
      setSearching(false);
    }
  };

  const queueDiscoveredJob = (item: DiscoveredJob, autoRun: boolean) => {
    const newJob: JobApplication = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      company: item.company,
      location: item.location || 'Unspecified',
      workMode:
        item.workMode === 'Hybrid' || item.workMode === 'On-site'
          ? item.workMode
          : 'Remote',
      salaryRange: item.salaryRange || 'Not disclosed',
      jobUrl: item.jobUrl || '',
      source: 'Live Search',
      description: item.summary,
      requirements: item.requirements || [],
      stage: 'queued',
      addedAt: new Date().toISOString().slice(0, 10),
      notes: '',
    };
    onAddJob(newJob, autoRun);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
          Discover Open Roles
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Search current public job listings grounded via Google Search and send matching roles straight to your application agent.
        </p>

        <form onSubmit={handleSearch} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label htmlFor="discover-role" className="block text-xs font-medium text-slate-600">
              Target Role or Keywords
            </label>
            <input
              id="discover-role"
              type="text"
              required
              value={roleQuery}
              onChange={(e) => setRoleQuery(e.target.value)}
              placeholder="Senior Product Engineer TypeScript"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="discover-location" className="block text-xs font-medium text-slate-600">
              Location
            </label>
            <input
              id="discover-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco, CA or US"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="discover-mode" className="block text-xs font-medium text-slate-600">
              Work Mode
            </label>
            <select
              id="discover-mode"
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              <option value="Any">Any</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>

          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              disabled={searching}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>{searching ? 'Searching...' : 'Find Jobs'}</span>
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {searching && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white p-6"
            />
          ))}
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && !error && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="font-display text-base font-semibold text-slate-900">
            No structured listings returned for that query
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try broadening the role title or location, or paste a direct posting URL via Add Job.
          </p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-4">
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {results.map((item, idx) => {
              const alreadyQueued =
                Boolean(item.jobUrl) && existingUrls.has(item.jobUrl.trim());
              return (
                <div key={`${item.company}-${idx}`} className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1.5">
                      <h2 className="font-display text-lg font-semibold text-slate-900">
                        {item.title}
                      </h2>
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{item.company}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{item.location}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{item.workMode}</span>
                        {item.salaryRange && item.salaryRange !== 'Not disclosed' && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="font-mono tabular-nums">{item.salaryRange}</span>
                          </>
                        )}
                      </p>
                      <p className="max-w-3xl pt-1 text-sm leading-relaxed text-slate-700">
                        {item.summary}
                      </p>
                      {item.requirements?.length > 0 && (
                        <p className="pt-1 text-xs text-slate-500">
                          Key skills: {item.requirements.slice(0, 4).join(' · ')}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.jobUrl && (
                        <a
                          href={item.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                        >
                          <span>View Source</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        disabled={alreadyQueued}
                        onClick={() => queueDiscoveredJob(item, false)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{alreadyQueued ? 'In Pipeline' : 'Queue'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={alreadyQueued}
                        onClick={() => queueDiscoveredJob(item, true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Queue & Run Agent</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sources.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-700">Grounded Search Sources</p>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                {sources.slice(0, 8).map((src, i) => (
                  <li key={`${src.uri}-${i}`}>
                    <a
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <span className="max-w-[260px] truncate">{src.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
