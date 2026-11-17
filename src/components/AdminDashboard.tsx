import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { t } from '../i18n/translations.ts';
import type {
  AdminOverview,
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

type AdminSection =
  | 'overview'
  | 'farmers'
  | 'experts'
  | 'cases'
  | 'crops'
  | 'knowledge'
  | 'analytics'
  | 'settings';

interface AdminDashboardProps {
  user: AppUser;
  cases: CropCase[];
  crops: CropCatalogItem[];
  knowledge: KnowledgeRecord[];
  language: LanguageCode;
  aiMode: string;
  onLanguageChange: (lang: LanguageCode) => void;
  onRefreshAll: () => Promise<void>;
  onSignOut: () => void;
  onBackToLanding: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  cases,
  crops,
  knowledge,
  language,
  aiMode,
  onLanguageChange,
  onRefreshAll,
  onSignOut,
  onBackToLanding,
}) => {
  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [directory, setDirectory] = useState<AppUser[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Crop state
  const [newCropName, setNewCropName] = useState('');
  const [newCropNameKn, setNewCropNameKn] = useState('');
  const [newCropCategory, setNewCropCategory] = useState('Vegetables');
  const [newCropVarieties, setNewCropVarieties] = useState('');
  const [savingCrop, setSavingCrop] = useState(false);

  const loadAdminData = async () => {
    setLoadingAdmin(true);
    try {
      const [ov, usersRes] = await Promise.all([
        apiFetch<AdminOverview>('/api/admin/overview'),
        apiFetch<AppUser[]>('/api/admin/users'),
      ]);
      setOverview(ov);
      setDirectory(usersRes);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to load admin metrics.'
      );
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const farmers = useMemo(
    () => directory.filter((u) => u.role === 'farmer'),
    [directory]
  );
  const experts = useMemo(
    () => directory.filter((u) => u.role === 'expert'),
    [directory]
  );
  const verifiedExperts = useMemo(
    () =>
      experts.filter(
        (e) => e.expertProfile?.verificationStatus === 'verified' && e.isActive
      ),
    [experts]
  );

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const handleToggleUserActive = async (targetUser: AppUser) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await apiFetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !targetUser.isActive }),
      });
      setStatusMsg(
        `Account ${targetUser.fullName} is now ${
          !targetUser.isActive ? 'active' : 'deactivated'
        }.`
      );
      await loadAdminData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not update user status.'
      );
    }
  };

  const handleVerifyExpert = async (
    profileId: number,
    decision: 'verified' | 'rejected'
  ) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await apiFetch(`/api/admin/experts/${profileId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          reviewedNotes:
            decision === 'verified'
              ? `Credentials verified by administrator ${user.fullName}.`
              : `Credentials declined by administrator ${user.fullName}.`,
        }),
      });
      setStatusMsg(`Expert verification updated to "${decision}".`);
      await Promise.all([loadAdminData(), onRefreshAll()]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to verify expert.'
      );
    }
  };

  const handleAssignCase = async (caseId: number, expertUserId: number) => {
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await apiFetch(`/api/admin/cases/${caseId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ expertUserId }),
      });
      setStatusMsg('Case assigned to verified specialist.');
      await onRefreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to assign case.');
    }
  };

  const handleAddCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCrop(true);
    setErrorMsg(null);
    try {
      await apiFetch('/api/admin/crops', {
        method: 'POST',
        body: JSON.stringify({
          name: newCropName,
          nameKn: newCropNameKn,
          category: newCropCategory,
          commonVarieties: newCropVarieties,
        }),
      });
      setNewCropName('');
      setNewCropNameKn('');
      setNewCropVarieties('');
      setStatusMsg('New crop added to platform catalog.');
      await onRefreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add crop.');
    } finally {
      setSavingCrop(false);
    }
  };

  const handleToggleCrop = async (crop: CropCatalogItem) => {
    try {
      await apiFetch(`/api/admin/crops/${crop.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !crop.isActive }),
      });
      await onRefreshAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update crop.');
    }
  };

  const navItems: Array<{
    id: AdminSection;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'overview',
      label: t(language, 'dashboardOverview'),
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'farmers',
      label: t(language, 'farmerManagement'),
      icon: <Users className="h-4 w-4" />,
      badge: farmers.length,
    },
    {
      id: 'experts',
      label: t(language, 'expertVerification'),
      icon: <ShieldCheck className="h-4 w-4" />,
      badge: overview?.pendingExperts || undefined,
    },
    {
      id: 'cases',
      label: t(language, 'caseManagement'),
      icon: <ClipboardList className="h-4 w-4" />,
      badge: cases.length,
    },
    {
      id: 'crops',
      label: t(language, 'cropManagement'),
      icon: <Sprout className="h-4 w-4" />,
    },
    {
      id: 'knowledge',
      label: t(language, 'knowledgeDatabase'),
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: 'analytics',
      label: t(language, 'analytics'),
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      id: 'settings',
      label: t(language, 'systemSettings'),
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  const handleNavClick = (id: AdminSection) => {
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

        <div className="px-4 py-3 border-b border-[#EFECE4] bg-[#FAF9F6]">
          <div className="text-xs font-semibold text-[#1C241E] truncate">
            {user.fullName}
          </div>
          <div className="text-[11px] text-[#4A574E]">
            Platform Administration
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
                className="p-1.5"
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
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${
                    section === item.id
                      ? 'bg-[#1B4332] text-white'
                      : 'text-[#37423A]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </nav>
            <div className="border-t border-[#EFECE4] p-3">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700"
              >
                <LogOut className="h-4 w-4" />
                <span>{t(language, 'signOut')}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[#E5E0D5] bg-white px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden rounded-lg p-2 text-[#1C241E]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-[#4A574E] truncate">
              <span>Admin</span>
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
          {statusMsg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {statusMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {errorMsg}
            </div>
          )}

          {loadingAdmin && !overview ? (
            <div className="rounded-xl border border-[#E5E0D5] bg-white p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#1B4332]" />
            </div>
          ) : null}

          {/* OVERVIEW */}
          {section === 'overview' && overview && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                  Platform Governance Overview
                </h1>
                <p className="mt-1 text-sm text-[#4A574E]">
                  Verify agricultural expert credentials, assign crop cases, and monitor
                  human-in-the-loop quality across the platform.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Registered Farmers</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-[#1C241E]">
                    {overview.totalFarmers}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Verified Experts</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-emerald-800">
                    {overview.verifiedExperts}{' '}
                    <span className="text-xs font-normal text-[#4A574E]">
                      ({overview.pendingExperts} pending)
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Total Crop Cases</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-[#1B4332]">
                    {overview.totalCases}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Farmer Rating Avg</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-[#1C241E]">
                    {overview.averageFeedbackRating !== null
                      ? `${overview.averageFeedbackRating}/5`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Pending Expert Verification Alert */}
              {overview.pendingExperts > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-amber-950">
                      {overview.pendingExperts} Expert Credential Application(s) Pending
                    </div>
                    <p className="text-xs text-amber-900">
                      Review academic degrees and registration numbers before granting
                      verification authority.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavClick('experts')}
                    className="rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                  >
                    Review Credentials
                  </button>
                </div>
              )}

              {/* Case Status Distribution */}
              <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-4">
                <h2 className="font-display text-base font-bold text-[#1C241E]">
                  Case Pipeline Distribution
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(overview.statusBreakdown).map(([st, cnt]) => (
                    <div
                      key={st}
                      className="rounded-lg border border-[#EFECE4] bg-[#FAF9F6] p-3"
                    >
                      <div className="text-xs text-[#4A574E] truncate">{st}</div>
                      <div className="mt-1 font-mono-num text-xl font-bold text-[#1C241E]">
                        {cnt}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FARMER MANAGEMENT */}
          {section === 'farmers' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                  {t(language, 'farmerManagement')}
                </h1>
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A574E]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search farmers..."
                    className="w-full rounded-lg border border-[#D4CFC2] bg-white pl-9 pr-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#DDD7C8] bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-[#EFECE4] bg-[#FAF9F6] text-xs text-[#4A574E]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Farmer</th>
                      <th className="px-4 py-3 font-semibold">District / State</th>
                      <th className="px-4 py-3 font-semibold">Primary Crops</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE4]">
                    {farmers
                      .filter((f) =>
                        `${f.fullName} ${f.email} ${f.farmerProfile?.district || ''}`
                          .toLowerCase()
                          .includes(search.toLowerCase())
                      )
                      .map((f) => (
                        <tr key={f.id} className="hover:bg-[#FAF9F6]">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#1C241E]">
                              {f.fullName}
                            </div>
                            <div className="text-xs text-[#4A574E]">{f.email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#37423A]">
                            {[f.farmerProfile?.district, f.farmerProfile?.state]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#37423A]">
                            {f.farmerProfile?.primaryCrops || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span
                              className={
                                f.isActive ? 'text-emerald-800 font-semibold' : 'text-red-700 font-semibold'
                              }
                            >
                              {f.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(f)}
                              className="rounded-lg border border-[#D4CFC2] px-3 py-1 text-xs font-medium hover:bg-[#EFECE4] cursor-pointer"
                            >
                              {f.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EXPERT VERIFICATION */}
          {section === 'experts' && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                  {t(language, 'expertVerification')}
                </h1>
                <p className="mt-1 text-sm text-[#4A574E]">
                  Only credential-verified agricultural experts are permitted to review
                  assigned cases and publish recommendations.
                </p>
              </div>

              <div className="space-y-4">
                {experts.map((exp) => {
                  const prof = exp.expertProfile;
                  const status = prof?.verificationStatus || 'pending';
                  return (
                    <div
                      key={exp.id}
                      className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-bold text-[#1C241E]">
                              {exp.fullName}
                            </h3>
                            <span
                              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                                status === 'verified'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                  : status === 'rejected'
                                    ? 'border-red-200 bg-red-50 text-red-900'
                                    : 'border-amber-200 bg-amber-50 text-amber-900'
                              }`}
                            >
                              {status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-[#4A574E]">
                            {exp.email} · {prof?.title} ·{' '}
                            <span className="tabular-nums">
                              {prof?.yearsExperience ?? 0} yrs experience
                            </span>
                          </div>
                          <div className="text-sm text-[#2C362F]">
                            <strong>Specialization:</strong>{' '}
                            {prof?.specialization || 'Not listed'}
                          </div>
                          {prof?.institution && (
                            <div className="text-xs text-[#4A574E]">
                              Institution: {prof.institution} · Region:{' '}
                              {prof.regionServed || 'Karnataka'}
                            </div>
                          )}
                        </div>

                        {prof && (
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {status !== 'verified' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleVerifyExpert(prof.id, 'verified')
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#143326] cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Approve & Verify</span>
                              </button>
                            )}
                            {status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleVerifyExpert(prof.id, 'rejected')
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 cursor-pointer"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {prof?.credentials && prof.credentials.length > 0 && (
                        <div className="rounded-lg border border-[#EFECE4] bg-[#FAF9F6] p-3.5 space-y-1.5 text-xs">
                          <div className="font-semibold text-[#1C241E]">
                            Submitted Credentials
                          </div>
                          {prof.credentials.map((cr) => (
                            <div key={cr.id} className="text-[#37423A]">
                              <strong>{cr.degreeOrCertification}</strong> —{' '}
                              {cr.issuingAuthority} ·{' '}
                              <span className="font-mono-num">
                                Reg: {cr.licenseOrRegistrationNo}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CASE MANAGEMENT */}
          {section === 'cases' && (
            <div className="space-y-5">
              {selectedCase ? (
                <CaseDetailPanel
                  cropCase={selectedCase}
                  viewerRole="admin"
                  language={language}
                  onCaseUpdated={() => {
                    void onRefreshAll();
                  }}
                  onClose={() => setSelectedCaseId(null)}
                />
              ) : (
                <>
                  <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                    {t(language, 'caseManagement')}
                  </h1>

                  <div className="overflow-x-auto rounded-xl border border-[#DDD7C8] bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-[#EFECE4] bg-[#FAF9F6] text-xs text-[#4A574E]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Case Code</th>
                          <th className="px-4 py-3 font-semibold">Crop & Farmer</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">
                            Assigned Verified Expert
                          </th>
                          <th className="px-4 py-3 font-semibold text-right">
                            Inspect
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFECE4]">
                        {cases.map((c) => (
                          <tr key={c.id} className="hover:bg-[#FAF9F6]">
                            <td className="px-4 py-3 font-mono-num text-xs font-semibold text-[#1B4332]">
                              {c.caseCode}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-[#1C241E]">
                                {c.cropName} ({c.growthStage})
                              </div>
                              <div className="text-xs text-[#4A574E]">
                                {c.farmer?.fullName} · {c.location}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={c.status} />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={c.assignedExpertId ?? ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    void handleAssignCase(
                                      c.id,
                                      Number(e.target.value)
                                    );
                                  }
                                }}
                                className="rounded-lg border border-[#D4CFC2] bg-white px-2.5 py-1.5 text-xs"
                                aria-label={`Assign expert to ${c.caseCode}`}
                              >
                                <option value="">Unassigned</option>
                                {verifiedExperts.map((ve) => (
                                  <option key={ve.id} value={ve.id}>
                                    {ve.fullName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedCaseId(c.id)}
                                className="rounded-lg border border-[#D4CFC2] px-3 py-1 text-xs font-medium hover:bg-[#EFECE4] cursor-pointer"
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* CROP MANAGEMENT */}
          {section === 'crops' && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                {t(language, 'cropManagement')}
              </h1>

              <form
                onSubmit={handleAddCrop}
                className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-4"
              >
                <div className="text-sm font-bold text-[#1C241E]">
                  Add Supported Crop Category
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    value={newCropName}
                    onChange={(e) => setNewCropName(e.target.value)}
                    placeholder="Crop Name (English) *"
                    className="rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    required
                    value={newCropNameKn}
                    onChange={(e) => setNewCropNameKn(e.target.value)}
                    placeholder="Kannada Name *"
                    className="rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    required
                    value={newCropCategory}
                    onChange={(e) => setNewCropCategory(e.target.value)}
                    placeholder="Category (e.g. Pulses)"
                    className="rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={newCropVarieties}
                    onChange={(e) => setNewCropVarieties(e.target.value)}
                    placeholder="Varieties (comma-separated)"
                    className="rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingCrop}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{savingCrop ? 'Adding...' : 'Add Crop'}</span>
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {crops.map((crop) => (
                  <div
                    key={crop.id}
                    className="rounded-xl border border-[#DDD7C8] bg-white p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs text-[#4A574E]">{crop.category}</div>
                      <div className="font-display text-base font-bold text-[#1C241E]">
                        {crop.name} · {crop.nameKn}
                      </div>
                      <div className="mt-1 text-xs text-[#4A574E]">
                        Varieties: {crop.commonVarieties.join(', ') || 'Standard'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#EFECE4] text-xs">
                      <span
                        className={
                          crop.isActive
                            ? 'text-emerald-800 font-semibold'
                            : 'text-[#6B776E]'
                        }
                      >
                        {crop.isActive ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleCrop(crop)}
                        className="rounded-md border border-[#D4CFC2] px-2.5 py-1 hover:bg-[#EFECE4] cursor-pointer"
                      >
                        {crop.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KNOWLEDGE DATABASE */}
          {section === 'knowledge' && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                {t(language, 'knowledgeDatabase')}
              </h1>
              <KnowledgeBrowser
                records={knowledge}
                crops={crops}
                language={language}
                canManage={true}
                onRefresh={onRefreshAll}
              />
            </div>
          )}

          {/* ANALYTICS */}
          {section === 'analytics' && overview && (
            <div className="space-y-6">
              <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                Platform Diagnostic & Quality Analytics
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-3">
                  <h2 className="font-display text-base font-bold text-[#1C241E]">
                    AI Preliminary vs. Expert Verification Decisions
                  </h2>
                  <p className="text-xs text-[#4A574E]">
                    Tracks how often credentialed experts approve, correct, or reject AI
                    preliminary findings.
                  </p>
                  <div className="space-y-2.5 pt-2">
                    {Object.entries(overview.decisionBreakdown).map(([dec, cnt]) => (
                      <div
                        key={dec}
                        className="flex items-center justify-between rounded-lg border border-[#EFECE4] bg-[#FAF9F6] px-3.5 py-2.5 text-sm"
                      >
                        <span className="font-medium text-[#1C241E]">{dec}</span>
                        <span className="font-mono-num font-bold text-[#1B4332]">
                          {cnt}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-3">
                  <h2 className="font-display text-base font-bold text-[#1C241E]">
                    Recent Farmer Feedback ({overview.feedbackCount})
                  </h2>
                  {overview.recentFeedback.length === 0 ? (
                    <p className="text-xs text-[#4A574E] py-4">
                      No farmer feedback submitted yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {overview.recentFeedback.map((fb) => (
                        <div
                          key={fb.id}
                          className="rounded-lg border border-[#EFECE4] bg-[#FAF9F6] p-3 text-xs space-y-1"
                        >
                          <div className="flex justify-between font-semibold">
                            <span>
                              Rating: <span className="font-mono-num">{fb.rating}/5</span> ·{' '}
                              {fb.helpfulness}
                            </span>
                            <span className="font-mono-num text-[#4A574E]">
                              Case #{fb.caseId}
                            </span>
                          </div>
                          {fb.outcomeReported && (
                            <p className="text-[#2C362F]">{fb.outcomeReported}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM SETTINGS */}
          {section === 'settings' && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                {t(language, 'systemSettings')}
              </h1>
              <div className="rounded-xl border border-[#DDD7C8] bg-white p-6 space-y-4 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#EFECE4]">
                  <div>
                    <div className="font-semibold text-[#1C241E]">
                      Preliminary AI Engine Status
                    </div>
                    <div className="text-xs text-[#4A574E]">
                      Controls whether live multimodal Gemini analysis or clearly
                      labelled demonstration triage runs on new submissions.
                    </div>
                  </div>
                  <span className="font-mono-num text-xs font-semibold rounded-md border border-[#D4CFC2] bg-[#FAF9F6] px-3 py-1.5 text-[#1B4332]">
                    {aiMode === 'gemini-4-hydrogen'
                      ? 'Live Gemini 4 Hydrogen Vision'
                      : 'Demonstration Mock Analyzer'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#EFECE4]">
                  <div>
                    <div className="font-semibold text-[#1C241E]">
                      Human-in-the-Loop Safety Policy
                    </div>
                    <div className="text-xs text-[#4A574E]">
                      Enforced at API and database level: unverified experts and AI
                      cannot publish treatment recommendations to farmers.
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800">
                    Strictly Enforced
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[#1C241E]">
                      Regional Localization Policy
                    </div>
                    <div className="text-xs text-[#4A574E]">
                      Supports English and Kannada UI navigation while preserving
                      expert-reviewed clinical guidance in its verified source text.
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#1B4332]">
                    English + ಕನ್ನಡ
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
