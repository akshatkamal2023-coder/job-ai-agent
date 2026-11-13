import { Briefcase, Compass, FileUser, Layers, X } from 'lucide-react';
import { useState } from 'react';
import { CANDIDATE_AVATAR_PATH } from '../data/seedData';
import type { CandidateProfile } from '../types';

export type NavSection = 'pipeline' | 'discover' | 'profile';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  profile: CandidateProfile;
  counts: {
    total: number;
    queued: number;
    prepared: number;
    applied: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeSection,
  onSelectSection,
  profile,
  counts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [imgError, setImgError] = useState(false);

  const navItems: {
    id: NavSection;
    label: string;
    icon: typeof Briefcase;
    meta?: string;
  }[] = [
    {
      id: 'pipeline',
      label: 'Application Pipeline',
      icon: Layers,
      meta: `${counts.total}`,
    },
    {
      id: 'discover',
      label: 'Discover Roles',
      icon: Compass,
    },
    {
      id: 'profile',
      label: 'Candidate Dossier',
      icon: FileUser,
    },
  ];

  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const content = (
    <div className="flex h-full w-[252px] flex-col justify-between border-r border-slate-200 bg-white">
      <div>
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Dispatch
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="px-3 py-5" aria-label="Primary navigation">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      onCloseMobile();
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {item.meta !== undefined && (
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        {item.meta}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mx-6 border-t border-slate-200 pt-5">
          <p className="text-xs font-medium text-slate-500">Pipeline Snapshot</p>
          <dl className="mt-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Queued for Agent</dt>
              <dd className="font-mono font-medium text-slate-900 tabular-nums">
                {counts.queued}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Packets Ready</dt>
              <dd className="font-mono font-medium text-blue-600 tabular-nums">
                {counts.prepared}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Submitted</dt>
              <dd className="font-mono font-medium text-emerald-700 tabular-nums">
                {counts.applied}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={() => {
            onSelectSection('profile');
            onCloseMobile();
          }}
          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-50"
        >
          {!imgError ? (
            <img
              src={CANDIDATE_AVATAR_PATH}
              alt={profile.fullName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 font-display text-xs font-semibold text-slate-700">
              {initials || 'DM'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {profile.fullName}
            </p>
            <p className="truncate text-xs text-slate-500">
              {profile.headline}
            </p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block lg:shrink-0 no-print">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          <div
            className="fixed inset-0 bg-slate-900/30"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
