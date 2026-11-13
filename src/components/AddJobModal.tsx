import { Loader2, Link2, FileText, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { parseJobPosting } from '../api';
import type { JobApplication } from '../types';

interface AddJobModalProps {
  open: boolean;
  onClose: () => void;
  onAddJob: (job: JobApplication, autoRun: boolean) => void;
}

export function AddJobModal({ open, onClose, onAddJob }: AddJobModalProps) {
  const [mode, setMode] = useState<'import' | 'manual'>('import');
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState<'Remote' | 'Hybrid' | 'On-site'>('Remote');
  const [salaryRange, setSalaryRange] = useState('');
  const [description, setDescription] = useState('');
  const [requirementsText, setRequirementsText] = useState('');
  const [autoRun, setAutoRun] = useState(true);

  if (!open) return null;

  const resetForm = () => {
    setUrl('');
    setRawText('');
    setTitle('');
    setCompany('');
    setLocation('');
    setWorkMode('Remote');
    setSalaryRange('');
    setDescription('');
    setRequirementsText('');
    setParseError('');
    setMode('import');
  };

  const handleClose = () => {
    if (parsing) return;
    resetForm();
    onClose();
  };

  const handleParse = async (e: FormEvent) => {
    e.preventDefault();
    setParseError('');
    setParsing(true);
    try {
      const parsed = await parseJobPosting({
        url: url.trim() || undefined,
        rawText: rawText.trim() || undefined,
      });

      const newJob: JobApplication = {
        id: `job-${Date.now()}`,
        title: parsed.title || 'Untitled Role',
        company: parsed.company || 'Unknown Company',
        location: parsed.location || 'Unspecified',
        workMode:
          parsed.workMode === 'Hybrid' || parsed.workMode === 'On-site'
            ? parsed.workMode
            : 'Remote',
        salaryRange: parsed.salaryRange || 'Not disclosed',
        jobUrl: parsed.jobUrl || url.trim(),
        source: parsed.source || (url.trim() ? 'Imported URL' : 'Pasted Posting'),
        description: parsed.description || rawText.trim(),
        requirements: parsed.requirements || [],
        stage: 'queued',
        addedAt: new Date().toISOString().slice(0, 10),
        notes: '',
      };

      onAddJob(newJob, autoRun);
      resetForm();
      onClose();
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'Unable to parse job posting.'
      );
    } finally {
      setParsing(false);
    }
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim()) {
      setParseError('Role title, company name, and job description are required.');
      return;
    }

    const requirements = requirementsText
      .split('\n')
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);

    const newJob: JobApplication = {
      id: `job-${Date.now()}`,
      title: title.trim(),
      company: company.trim(),
      location: location.trim() || 'Remote',
      workMode,
      salaryRange: salaryRange.trim() || 'Not disclosed',
      jobUrl: url.trim(),
      source: 'Manual Entry',
      description: description.trim(),
      requirements,
      stage: 'queued',
      addedAt: new Date().toISOString().slice(0, 10),
      notes: '',
    };

    onAddJob(newJob, autoRun);
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-job-title"
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="add-job-title" className="font-display text-lg font-semibold text-slate-900">
            Add Job to Pipeline
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-3">
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('import');
                setParseError('');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                mode === 'import'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Import URL or Description
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('manual');
                setParseError('');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                mode === 'manual'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual Entry
            </button>
          </div>
        </div>

        {mode === 'import' ? (
          <form onSubmit={handleParse} className="space-y-4 p-6">
            <div>
              <label htmlFor="job-url-input" className="block text-sm font-medium text-slate-700">
                Job Posting URL
              </label>
              <div className="relative mt-1.5">
                <Link2 className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <input
                  id="job-url-input"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://boards.greenhouse.io/company/jobs/..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                The agent reads public job pages automatically. If a page blocks bots, paste the description below.
              </p>
            </div>

            <div>
              <label htmlFor="job-raw-input" className="block text-sm font-medium text-slate-700">
                Job Description Text (Optional if URL is public)
              </label>
              <div className="relative mt-1.5">
                <FileText className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                <textarea
                  id="job-raw-input"
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste the role overview, responsibilities, and qualifications..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>Run Application Agent immediately after importing</span>
            </label>

            {parseError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {parseError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={parsing || (!url.trim() && !rawText.trim())}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{parsing ? 'Extracting Role...' : 'Import & Queue'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Role Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Senior Frontend Engineer"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Company</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Systems"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Work Mode</label>
                  <select
                    value={workMode}
                    onChange={(e) =>
                      setWorkMode(e.target.value as 'Remote' | 'Hybrid' | 'On-site')
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Salary Range</label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="$170k–$200k"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Application URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Job Description</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Role responsibilities and team context..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Key Requirements (one per line)
              </label>
              <textarea
                rows={3}
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                placeholder="5+ years React & TypeScript&#10;PostgreSQL schema design"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>Run Application Agent immediately after adding</span>
            </label>

            {parseError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {parseError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
              >
                Save & Queue
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
