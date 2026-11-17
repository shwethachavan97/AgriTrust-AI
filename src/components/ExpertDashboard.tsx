import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { t } from '../i18n/translations.ts';
import type {
  AppUser,
  CropCase,
  CropCatalogItem,
  KnowledgeRecord,
  LanguageCode,
} from '../types/agritrust.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { CaseDetailPanel } from './CaseDetailPanel.tsx';
import { KnowledgeBrowser } from './KnowledgeBrowser.tsx';

type ExpertSection =
  | 'overview'
  | 'pending'
  | 'in_review'
  | 'completed'
  | 'follow_ups'
  | 'knowledge'
  | 'profile';

interface ExpertDashboardProps {
  user: AppUser;
  cases: CropCase[];
  crops: CropCatalogItem[];
  knowledge: KnowledgeRecord[];
  language: LanguageCode;
  loadingData: boolean;
  onLanguageChange: (lang: LanguageCode) => void;
  onRefreshAll: () => Promise<void>;
  onUserUpdated: (user: AppUser) => void;
  onSignOut: () => void;
  onBackToLanding: () => void;
}

export const ExpertDashboard: React.FC<ExpertDashboardProps> = ({
  user,
  cases,
  crops,
  knowledge,
  language,
  loadingData,
  onLanguageChange,
  onRefreshAll,
  onUserUpdated,
  onSignOut,
  onBackToLanding,
}) => {
  const [section, setSection] = useState<ExpertSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  // Professional profile form
  const [profName, setProfName] = useState(user.fullName);
  const [profPhone, setProfPhone] = useState(user.phone || '');
  const [title, setTitle] = useState(
    user.expertProfile?.title || 'Agricultural Specialist'
  );
  const [specialization, setSpecialization] = useState(
    user.expertProfile?.specialization || ''
  );
  const [yearsExp, setYearsExp] = useState(
    String(user.expertProfile?.yearsExperience ?? 0)
  );
  const [institution, setInstitution] = useState(
    user.expertProfile?.institution || ''
  );
  const [regionServed, setRegionServed] = useState(
    user.expertProfile?.regionServed || ''
  );
  const [languagesSpoken, setLanguagesSpoken] = useState(
    user.expertProfile?.languagesSpoken || 'English, Kannada'
  );
  const [bio, setBio] = useState(user.expertProfile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const isVerified = user.expertProfile?.verificationStatus === 'verified';

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const pendingCases = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.status === 'Submitted' ||
          c.status === 'AI Analysis in Progress' ||
          c.status === 'Awaiting Expert Review'
      ),
    [cases]
  );
  const inReviewCases = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.status === 'Under Expert Review' ||
          c.status === 'Reassessment Required'
      ),
    [cases]
  );
  const completedCases = useMemo(
    () =>
      cases.filter(
        (c) => c.status === 'Expert Verified' || c.status === 'Closed'
      ),
    [cases]
  );
  const followUpCases = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.status === 'Additional Information Required' ||
          c.messages.length > 0
      ),
    [cases]
  );

  const activeList = useMemo(() => {
    let base = cases;
    if (section === 'pending') base = pendingCases;
    else if (section === 'in_review') base = inReviewCases;
    else if (section === 'completed') base = completedCases;
    else if (section === 'follow_ups') base = followUpCases;

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) =>
      `${c.caseCode} ${c.cropName} ${c.location} ${c.symptoms} ${c.farmer?.fullName || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [
    section,
    cases,
    pendingCases,
    inReviewCases,
    completedCases,
    followUpCases,
    search,
  ]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await apiFetch<{ user: AppUser }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: profName,
          phone: profPhone,
          preferredLanguage: language,
          expertDetails: {
            title,
            specialization,
            yearsExperience: Number(yearsExp) || 0,
            institution,
            regionServed,
            languagesSpoken,
            bio,
          },
        }),
      });
      onUserUpdated(res.user);
      setProfileMsg('Professional profile saved.');
    } catch (err) {
      setProfileMsg(
        err instanceof Error ? err.message : 'Failed to update profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const navItems: Array<{
    id: ExpertSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'overview',
      label: t(language, 'overview'),
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'pending',
      label: t(language, 'pendingCases'),
      icon: <Clock className="h-4 w-4" />,
      badge: pendingCases.length,
    },
    {
      id: 'in_review',
      label: t(language, 'inReview'),
      icon: <Eye className="h-4 w-4" />,
      badge: inReviewCases.length,
    },
    {
      id: 'completed',
      label: t(language, 'completedCases'),
      icon: <FileCheck2 className="h-4 w-4" />,
      badge: completedCases.length,
    },
    {
      id: 'follow_ups',
      label: t(language, 'followUps'),
      icon: <MessageSquare className="h-4 w-4" />,
      badge: followUpCases.length,
    },
    {
      id: 'knowledge',
      label: t(language, 'knowledgeResources'),
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: 'profile',
      label: t(language, 'professionalProfile'),
      icon: <Award className="h-4 w-4" />,
    },
  ];

  const handleNavClick = (id: ExpertSection) => {
    setSection(id);
    setSelectedCaseId(null);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#E5E0D5] bg-white">
        <div className="flex items-center justify-between border-b border-[#EFECE4] px-5 py-4">
          <button
            type="button"
            onClick={onBackToLanding}
            className="cursor-pointer text-left"
          >
            <BrandLogo size="sm" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[#EFECE4] bg-[#FAF9F6] space-y-1">
          <div className="text-xs font-semibold text-[#1C241E] truncate">
            {user.fullName}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium">
            {isVerified ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                <span className="text-emerald-800">Verified Expert</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                <span className="text-amber-800">
                  Verification {user.expertProfile?.verificationStatus || 'pending'}
                </span>
              </>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                section === item.id
                  ? 'bg-[#1B4332] text-white'
                  : 'text-[#37423A] hover:bg-[#EFECE4]'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 truncate">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`font-mono-num text-xs px-1.5 py-0.5 rounded ${
                    section === item.id
                      ? 'bg-white/20 text-white'
                      : 'bg-[#EFECE4] text-[#1C241E]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-[#EFECE4] p-3">
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#4A574E] hover:bg-red-50 hover:text-red-800 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>{t(language, 'signOut')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-white h-full flex flex-col border-r border-[#E5E0D5]">
            <div className="flex items-center justify-between border-b border-[#EFECE4] px-4 py-3.5">
              <BrandLogo size="sm" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer ${
                    section === item.id
                      ? 'bg-[#1B4332] text-white'
                      : 'text-[#37423A] hover:bg-[#EFECE4]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="font-mono-num text-xs">{item.badge}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="border-t border-[#EFECE4] p-3">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700"
              >
                <LogOut className="h-4 w-4" />
                <span>{t(language, 'signOut')}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#E5E0D5] bg-white px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 text-[#1C241E] hover:bg-[#EFECE4]"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-[#4A574E] truncate">
              <span>Agriculture Expert</span>
              <span aria-hidden="true"> / </span>
              <span className="font-semibold text-[#1C241E]">
                {navItems.find((n) => n.id === section)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center rounded-lg border border-[#D4CFC2] bg-[#FAF9F6] p-0.5 text-xs shrink-0">
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`rounded-md px-2.5 py-1 font-medium cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-[#1B4332] shadow-sm'
                  : 'text-[#4A574E]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('kn')}
              className={`rounded-md px-2.5 py-1 font-medium cursor-pointer ${
                language === 'kn'
                  ? 'bg-white text-[#1B4332] shadow-sm'
                  : 'text-[#4A574E]'
              }`}
            >
              ಕನ್ನಡ
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {!isVerified && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-sm text-amber-950">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
              <div>
                <div className="font-semibold">
                  Credential Verification Status:{' '}
                  {user.expertProfile?.verificationStatus || 'pending'}
                </div>
                <p className="text-xs mt-0.5">
                  An administrator must verify your professional credentials before you
                  can approve diagnoses or publish official recommendations to farmers.
                </p>
              </div>
            </div>
          )}

          {loadingData && cases.length === 0 ? (
            <div className="rounded-xl border border-[#E5E0D5] bg-white p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#1B4332]" />
              <p className="mt-2 text-sm text-[#4A574E]">
                Loading assigned cases...
              </p>
            </div>
          ) : null}

          {/* SECTION: OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                  Clinical Review Desk — {user.fullName}
                </h1>
                <p className="mt-1 text-sm text-[#4A574E]">
                  Evaluate preliminary AI reports, inspect farmer imagery, and publish
                  evidence-backed agricultural recommendations.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Pending Review</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-amber-800">
                    {pendingCases.length}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Active In Review</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-sky-800">
                    {inReviewCases.length}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Follow-ups Open</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-orange-800">
                    {followUpCases.length}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Verified Completed</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-emerald-800">
                    {completedCases.length}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#1C241E]">
                    Priority Cases Awaiting Your Review
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleNavClick('pending')}
                    className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                  >
                    Open Queue
                  </button>
                </div>

                {pendingCases.length === 0 ? (
                  <p className="text-sm text-[#4A574E] py-4">
                    No pending cases assigned at the moment.
                  </p>
                ) : (
                  <div className="divide-y divide-[#EFECE4]">
                    {pendingCases.map((c) => (
                      <div
                        key={c.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="text-xs text-[#4A574E]">
                            <span className="font-mono-num font-semibold text-[#1B4332]">
                              {c.caseCode}
                            </span>
                            <span aria-hidden="true"> · </span>
                            <span>{c.urgency} Urgency</span>
                            <span aria-hidden="true"> · </span>
                            <span>{c.location}</span>
                          </div>
                          <div className="font-display text-sm font-bold text-[#1C241E]">
                            {c.cropName} ({c.growthStage}) — Preliminary:{' '}
                            {c.aiAnalysis?.possibleDiagnosis || 'Pending'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StatusBadge status={c.status} />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCaseId(c.id);
                              setSection('pending');
                            }}
                            className="rounded-lg bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
                          >
                            Review Case
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTIONS: CASE QUEUES */}
          {(section === 'pending' ||
            section === 'in_review' ||
            section === 'completed' ||
            section === 'follow_ups') && (
            <div className="space-y-5">
              {selectedCase ? (
                <CaseDetailPanel
                  cropCase={selectedCase}
                  viewerRole="expert"
                  isExpertVerified={isVerified}
                  language={language}
                  onCaseUpdated={() => {
                    void onRefreshAll();
                  }}
                  onClose={() => setSelectedCaseId(null)}
                />
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                      {navItems.find((n) => n.id === section)?.label}
                    </h1>
                    <div className="relative w-full sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A574E]" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search assigned cases..."
                        className="w-full rounded-lg border border-[#D4CFC2] bg-white pl-9 pr-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {activeList.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D4CFC2] bg-white p-10 text-center text-sm text-[#4A574E]">
                      No assigned cases in this queue.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeList.map((c) => (
                        <article
                          key={c.id}
                          className="rounded-xl border border-[#DDD7C8] bg-white p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs text-[#4A574E]">
                                <span className="font-mono-num font-semibold text-[#1B4332]">
                                  {c.caseCode}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span>{c.urgency}</span>
                              </div>
                              <StatusBadge status={c.status} />
                            </div>
                            <div className="flex gap-3">
                              {c.images[0] && (
                                <img
                                  src={c.images[0].imageData}
                                  alt={c.cropName}
                                  referrerPolicy="no-referrer"
                                  className="h-20 w-24 shrink-0 rounded-lg object-cover border border-[#E5E0D5]"
                                />
                              )}
                              <div className="min-w-0">
                                <h3 className="font-display text-base font-bold text-[#1C241E]">
                                  {c.cropName} ({c.growthStage})
                                </h3>
                                <p className="text-xs text-[#4A574E]">
                                  Farmer: {c.farmer?.fullName} · {c.location}
                                </p>
                                {c.aiAnalysis && (
                                  <p className="mt-1.5 text-xs text-amber-900">
                                    AI Preliminary: {c.aiAnalysis.possibleDiagnosis} (~
                                    {c.aiAnalysis.confidenceScore}%)
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-[#EFECE4] pt-3 flex items-center justify-between text-xs">
                            <span className="text-[#4A574E] tabular-nums">
                              {c.images.length} photo(s) · {c.messages.length} msgs
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedCaseId(c.id)}
                              className="rounded-lg bg-[#1B4332] px-3.5 py-1.5 font-semibold text-white hover:bg-[#143326] cursor-pointer"
                            >
                              Evaluate Case
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* SECTION: KNOWLEDGE RESOURCES */}
          {section === 'knowledge' && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                  {t(language, 'knowledgeResources')}
                </h1>
                <p className="mt-1 text-sm text-[#4A574E]">
                  {isVerified
                    ? 'Browse and contribute expert-attributed agricultural knowledge entries.'
                    : 'Browse agricultural knowledge entries (publishing requires verified expert status).'}
                </p>
              </div>
              <KnowledgeBrowser
                records={knowledge}
                crops={crops}
                language={language}
                canManage={isVerified}
                onRefresh={onRefreshAll}
              />
            </div>
          )}

          {/* SECTION: PROFESSIONAL PROFILE */}
          {section === 'profile' && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                {t(language, 'professionalProfile')}
              </h1>

              {profileMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>{profileMsg}</span>
                </div>
              )}

              {/* Credentials Audit Box */}
              <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#1C241E]">
                    Verified Academic & Registration Credentials
                  </h2>
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                      isVerified
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    Status: {user.expertProfile?.verificationStatus || 'pending'}
                  </span>
                </div>
                {user.expertProfile?.credentials &&
                user.expertProfile.credentials.length > 0 ? (
                  <div className="space-y-2">
                    {user.expertProfile.credentials.map((cred) => (
                      <div
                        key={cred.id}
                        className="rounded-lg border border-[#E5E0D5] bg-[#FAF9F6] p-3.5 text-xs space-y-1"
                      >
                        <div className="font-semibold text-[#1C241E]">
                          {cred.degreeOrCertification} — {cred.issuingAuthority}
                        </div>
                        <div className="font-mono-num text-[#4A574E]">
                          Registration No: {cred.licenseOrRegistrationNo}{' '}
                          {cred.yearObtained ? `(${cred.yearObtained})` : ''}
                        </div>
                        {cred.reviewedNotes && (
                          <div className="text-[#2D6A4F]">
                            Admin Note: {cred.reviewedNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#4A574E]">
                    No credentials recorded. Contact platform administration to submit
                    documentation.
                  </p>
                )}
              </div>

              <form
                onSubmit={handleSaveProfile}
                className="rounded-xl border border-[#DDD7C8] bg-white p-6 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profName}
                      onChange={(e) => setProfName(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Professional Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      required
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={yearsExp}
                      onChange={(e) => setYearsExp(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Institution / Extension Centre
                    </label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Region Served & Languages
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={regionServed}
                        onChange={(e) => setRegionServed(e.target.value)}
                        placeholder="Region"
                        className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={languagesSpoken}
                        onChange={(e) => setLanguagesSpoken(e.target.value)}
                        placeholder="Languages"
                        className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profPhone}
                      onChange={(e) => setProfPhone(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                    Clinical Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#143326] cursor-pointer"
                  >
                    {savingProfile ? 'Saving...' : 'Save Professional Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
