import { Loader2, Plus, Trash2, Upload, Check } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { parseResumeText } from '../api';
import type { CandidateProfile, ExperienceItem } from '../types';

interface ProfileViewProps {
  profile: CandidateProfile;
  onUpdateProfile: (next: CandidateProfile) => void;
}

export function ProfileView({ profile, onUpdateProfile }: ProfileViewProps) {
  const [resumeText, setResumeText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const handleImportResume = async (e: FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) return;
    setImportError('');
    setImportSuccess(false);
    setImporting(true);
    try {
      const parsed = await parseResumeText(resumeText);
      const experiences: ExperienceItem[] = Array.isArray(parsed.experiences)
        ? parsed.experiences.map((exp, idx) => ({
            id: `exp-${Date.now()}-${idx}`,
            company: exp.company || '',
            role: exp.role || '',
            period: exp.period || '',
            location: exp.location || '',
            bullets: Array.isArray(exp.bullets) ? exp.bullets : [],
          }))
        : profile.experiences;

      const education = Array.isArray(parsed.education)
        ? parsed.education.map((ed, idx) => ({
            id: `edu-${Date.now()}-${idx}`,
            institution: ed.institution || '',
            degree: ed.degree || '',
            period: ed.period || '',
          }))
        : profile.education;

      onUpdateProfile({
        ...profile,
        fullName: parsed.fullName || profile.fullName,
        headline: parsed.headline || profile.headline,
        email: parsed.email || profile.email,
        phone: parsed.phone || profile.phone,
        location: parsed.location || profile.location,
        linkedinUrl: parsed.linkedinUrl || profile.linkedinUrl,
        portfolioUrl: parsed.portfolioUrl || profile.portfolioUrl,
        yearsExperience:
          typeof parsed.yearsExperience === 'number'
            ? parsed.yearsExperience
            : profile.yearsExperience,
        summary: parsed.summary || profile.summary,
        skills:
          Array.isArray(parsed.skills) && parsed.skills.length > 0
            ? parsed.skills
            : profile.skills,
        experiences: experiences.length > 0 ? experiences : profile.experiences,
        education: education.length > 0 ? education : profile.education,
      });

      setImportSuccess(true);
      setResumeText('');
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unable to parse resume.');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setResumeText(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const updateField = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    onUpdateProfile({ ...profile, [key]: value });
  };

  const handleAddSkill = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = newSkill.trim();
    if (!cleaned || profile.skills.includes(cleaned)) return;
    updateField('skills', [...profile.skills, cleaned]);
    setNewSkill('');
  };

  const addExperience = () => {
    updateField('experiences', [
      {
        id: `exp-${Date.now()}`,
        company: 'Company Name',
        role: 'Role Title',
        period: '2024 – Present',
        location: 'Remote',
        bullets: ['Key measurable impact or system shipped'],
      },
      ...profile.experiences,
    ]);
  };

  const addCustomQA = () => {
    updateField('customQA', [
      ...profile.customQA,
      {
        id: `qa-${Date.now()}`,
        question: 'New screening question',
        answer: '',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Smart Resume Importer */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
              Candidate Dossier
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Everything the Application Agent tailors and submits is strictly grounded in this dossier.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0">
            <Upload className="h-3.5 w-3.5" />
            <span>Load .txt / .md Resume</span>
            <input
              type="file"
              accept=".txt,.md,.text"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <form onSubmit={handleImportResume} className="mt-4 space-y-3">
          <textarea
            rows={4}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your raw resume text here to auto-populate your skills, work history, and education..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50/40 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {importError && <p className="text-xs text-red-600">{importError}</p>}
              {importSuccess && (
                <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  <span>Dossier updated from resume.</span>
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={importing || resumeText.trim().length < 20}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{importing ? 'Parsing Resume...' : 'Parse & Populate Dossier'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Identity & Application Defaults */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Identity & Application Defaults
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Full Name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Headline</label>
            <input
              type="text"
              value={profile.headline}
              onChange={(e) => updateField('headline', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Phone</label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => updateField('location', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Years of Experience
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={profile.yearsExperience}
              onChange={(e) => updateField('yearsExperience', Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Work Authorization
            </label>
            <input
              type="text"
              value={profile.workAuthorization}
              onChange={(e) => updateField('workAuthorization', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Salary Expectation
            </label>
            <input
              type="text"
              value={profile.salaryExpectation}
              onChange={(e) => updateField('salaryExpectation', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Notice Period</label>
            <input
              type="text"
              value={profile.noticePeriod}
              onChange={(e) => updateField('noticePeriod', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600">Target Roles</label>
            <input
              type="text"
              value={profile.targetRoles}
              onChange={(e) => updateField('targetRoles', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600">
              Core Summary
            </label>
            <textarea
              rows={3}
              value={profile.summary}
              onChange={(e) => updateField('summary', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm leading-relaxed focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Verified Skills & Stack
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() =>
                updateField(
                  'skills',
                  profile.skills.filter((s) => s !== skill)
                )
              }
              title="Click to remove skill"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <span>{skill}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
        <form onSubmit={handleAddSkill} className="mt-4 flex max-w-sm gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add skill (e.g. Kubernetes)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Add Skill
          </button>
        </form>
      </div>

      {/* Work Experience */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Work Experience
          </h2>
          <button
            type="button"
            onClick={addExperience}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Role</span>
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-200">
          {profile.experiences.map((exp, idx) => (
            <div key={exp.id} className="space-y-3 py-5 first:pt-2 last:pb-0">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  value={exp.role}
                  aria-label="Role title"
                  onChange={(e) => {
                    const next = [...profile.experiences];
                    next[idx] = { ...exp, role: e.target.value };
                    updateField('experiences', next);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={exp.company}
                  aria-label="Company"
                  onChange={(e) => {
                    const next = [...profile.experiences];
                    next[idx] = { ...exp, company: e.target.value };
                    updateField('experiences', next);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={exp.period}
                  aria-label="Period"
                  onChange={(e) => {
                    const next = [...profile.experiences];
                    next[idx] = { ...exp, period: e.target.value };
                    updateField('experiences', next);
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs focus:border-blue-600 focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exp.location}
                    aria-label="Location"
                    onChange={(e) => {
                      const next = [...profile.experiences];
                      next[idx] = { ...exp, location: e.target.value };
                      updateField('experiences', next);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Delete experience"
                    onClick={() =>
                      updateField(
                        'experiences',
                        profile.experiences.filter((item) => item.id !== exp.id)
                      )
                    }
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <textarea
                rows={4}
                value={exp.bullets.join('\n')}
                onChange={(e) => {
                  const next = [...profile.experiences];
                  next[idx] = {
                    ...exp,
                    bullets: e.target.value.split('\n'),
                  };
                  updateField('experiences', next);
                }}
                placeholder="One achievement bullet per line..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-sm leading-relaxed text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Reusable Screening Facts */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Reusable Screening Facts
            </h2>
            <p className="text-xs text-slate-500">
              Standard narratives the agent draws from when filling out company application forms.
            </p>
          </div>
          <button
            type="button"
            onClick={addCustomQA}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Fact</span>
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-200">
          {profile.customQA.map((item, idx) => (
            <div key={item.id} className="space-y-2 py-4 first:pt-1 last:pb-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => {
                    const next = [...profile.customQA];
                    next[idx] = { ...item, question: e.target.value };
                    updateField('customQA', next);
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Delete fact"
                  onClick={() =>
                    updateField(
                      'customQA',
                      profile.customQA.filter((q) => q.id !== item.id)
                    )
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                rows={2}
                value={item.answer}
                onChange={(e) => {
                  const next = [...profile.customQA];
                  next[idx] = { ...item, answer: e.target.value };
                  updateField('customQA', next);
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-2.5 text-sm text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
