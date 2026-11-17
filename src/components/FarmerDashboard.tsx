import React, { useMemo, useState } from 'react';
import {
  Bell,
  Camera,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  PlusCircle,
  Search,
  Sprout,
  User as UserIcon,
  X,
} from 'lucide-react';
import { apiFetch, readAndResizeCropImage } from '../lib/api.ts';
import { t } from '../i18n/translations.ts';
import type {
  AppUser,
  CropCase,
  CropCatalogItem,
  KnowledgeRecord,
  LanguageCode,
  NotificationItem,
} from '../types/agritrust.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { CaseDetailPanel } from './CaseDetailPanel.tsx';
import { KnowledgeBrowser } from './KnowledgeBrowser.tsx';

type FarmerSection =
  | 'overview'
  | 'diagnose'
  | 'cases'
  | 'consultation'
  | 'notifications'
  | 'profile'
  | 'support';

interface FarmerDashboardProps {
  user: AppUser;
  cases: CropCase[];
  crops: CropCatalogItem[];
  knowledge: KnowledgeRecord[];
  notifications: NotificationItem[];
  language: LanguageCode;
  loadingData: boolean;
  onLanguageChange: (lang: LanguageCode) => void;
  onRefreshAll: () => Promise<void>;
  onUserUpdated: (user: AppUser) => void;
  onSignOut: () => void;
  onBackToLanding: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  user,
  cases,
  crops,
  knowledge,
  notifications,
  language,
  loadingData,
  onLanguageChange,
  onRefreshAll,
  onUserUpdated,
  onSignOut,
  onBackToLanding,
}) => {
  const [section, setSection] = useState<FarmerSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [caseSearch, setCaseSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Diagnose Crop Form State
  const [selectedCropId, setSelectedCropId] = useState<string>(
    crops[0] ? String(crops[0].id) : ''
  );
  const [customCropName, setCustomCropName] = useState('');
  const [cropVariety, setCropVariety] = useState('');
  const [growthStage, setGrowthStage] = useState(
    crops[0]?.growthStages[1] || 'Vegetative'
  );
  const [symptoms, setSymptoms] = useState('');
  const [location, setLocation] = useState(
    [user.farmerProfile?.villageOrTown, user.farmerProfile?.district, user.farmerProfile?.state]
      .filter(Boolean)
      .join(', ') || ''
  );
  const [symptomOnsetDate, setSymptomOnsetDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [additionalObservations, setAdditionalObservations] = useState('');
  const [urgency, setUrgency] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [uploadedImgs, setUploadedImgs] = useState<
    Array<{
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
      imageData: string;
      caption?: string;
    }>
  >([]);
  const [submittingCase, setSubmittingCase] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Profile edit state
  const [profName, setProfName] = useState(user.fullName);
  const [profPhone, setProfPhone] = useState(user.phone || '');
  const [profVillage, setProfVillage] = useState(
    user.farmerProfile?.villageOrTown || ''
  );
  const [profDistrict, setProfDistrict] = useState(
    user.farmerProfile?.district || ''
  );
  const [profState, setProfState] = useState(
    user.farmerProfile?.state || 'Karnataka'
  );
  const [profAcres, setProfAcres] = useState(
    user.farmerProfile?.farmSizeAcres || ''
  );
  const [profCrops, setProfCrops] = useState(
    user.farmerProfile?.primaryCrops || ''
  );
  const [profSoil, setProfSoil] = useState(user.farmerProfile?.soilType || '');
  const [profIrrigation, setProfIrrigation] = useState(
    user.farmerProfile?.irrigationType || ''
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const selectedCropObj = useMemo(
    () => crops.find((c) => String(c.id) === selectedCropId) || null,
    [crops, selectedCropId]
  );

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) || null,
    [cases, selectedCaseId]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    return cases.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (
        q &&
        !`${c.caseCode} ${c.cropName} ${c.cropVariety || ''} ${c.symptoms} ${c.location}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [cases, caseSearch, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: cases.length,
      verified: cases.filter((c) => c.status === 'Expert Verified').length,
      pending: cases.filter(
        (c) =>
          c.status === 'Awaiting Expert Review' ||
          c.status === 'Under Expert Review' ||
          c.status === 'Submitted'
      ).length,
      actionRequired: cases.filter(
        (c) => c.status === 'Additional Information Required'
      ).length,
    };
  }, [cases]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFormError(null);
    if (uploadedImgs.length + files.length > 4) {
      setFormError('Maximum 4 crop images can be attached to a single case.');
      return;
    }
    try {
      const processed = await Promise.all(files.map(readAndResizeCropImage));
      setUploadedImgs((prev) => [...prev, ...processed]);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to process image file.'
      );
    }
    e.target.value = '';
  };

  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const finalCropName =
      selectedCropId === 'other'
        ? customCropName.trim()
        : selectedCropObj?.name || customCropName.trim();

    if (!finalCropName) {
      setFormError('Please select or enter a crop name.');
      return;
    }

    setSubmittingCase(true);
    try {
      const created = await apiFetch<CropCase>('/api/cases', {
        method: 'POST',
        body: JSON.stringify({
          cropId:
            selectedCropId && selectedCropId !== 'other'
              ? Number(selectedCropId)
              : null,
          cropName: finalCropName,
          cropVariety: cropVariety.trim() || null,
          growthStage,
          symptoms,
          location,
          symptomOnsetDate,
          additionalObservations,
          urgency,
          images: uploadedImgs,
        }),
      });
      setSymptoms('');
      setCropVariety('');
      setAdditionalObservations('');
      setUploadedImgs([]);
      await onRefreshAll();
      setSelectedCaseId(created.id);
      setSection('cases');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to submit crop case.'
      );
    } finally {
      setSubmittingCase(false);
    }
  };

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
          farmerDetails: {
            villageOrTown: profVillage,
            district: profDistrict,
            state: profState,
            farmSizeAcres: profAcres,
            primaryCrops: profCrops,
            soilType: profSoil,
            irrigationType: profIrrigation,
          },
        }),
      });
      onUserUpdated(res.user);
      setProfileMsg('Farmer profile updated successfully.');
    } catch (err) {
      setProfileMsg(
        err instanceof Error ? err.message : 'Could not save profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    await onRefreshAll();
  };

  const handleMarkAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
    await onRefreshAll();
  };

  const navItems: Array<{
    id: FarmerSection;
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
      id: 'diagnose',
      label: t(language, 'diagnoseCrop'),
      icon: <PlusCircle className="h-4 w-4" />,
    },
    {
      id: 'cases',
      label: t(language, 'myCases'),
      icon: <ClipboardList className="h-4 w-4" />,
      badge: cases.length,
    },
    {
      id: 'consultation',
      label: t(language, 'expertConsultation'),
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: 'notifications',
      label: t(language, 'notifications'),
      icon: <Bell className="h-4 w-4" />,
      badge: unreadCount,
    },
    {
      id: 'profile',
      label: t(language, 'profile'),
      icon: <UserIcon className="h-4 w-4" />,
    },
    {
      id: 'support',
      label: t(language, 'helpSupport'),
      icon: <HelpCircle className="h-4 w-4" />,
    },
  ];

  const handleNavClick = (id: FarmerSection) => {
    setSection(id);
    if (id !== 'cases') setSelectedCaseId(null);
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
          <div className="text-[11px] text-[#4A574E] truncate">
            Farmer Workspace {user.isDemo ? '· Sample Account' : ''}
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

        <div className="border-t border-[#EFECE4] p-3 space-y-2">
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[#4A574E] hover:bg-red-50 hover:text-red-800 transition-colors cursor-pointer"
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
                className="p-1.5 rounded-lg text-[#4A574E]"
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
        {/* Top Bar */}
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
              <span>Farmer</span>
              <span aria-hidden="true"> / </span>
              <span className="font-semibold text-[#1C241E]">
                {navItems.find((n) => n.id === section)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center rounded-lg border border-[#D4CFC2] bg-[#FAF9F6] p-0.5 text-xs">
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

            <button
              type="button"
              onClick={() => handleNavClick('diagnose')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#143326] transition-colors cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{t(language, 'diagnoseCrop')}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {loadingData && cases.length === 0 ? (
            <div className="rounded-xl border border-[#E5E0D5] bg-white p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#1B4332]" />
              <p className="mt-2 text-sm text-[#4A574E]">
                Loading your crop advisory workspace...
              </p>
            </div>
          ) : null}

          {/* SECTION: OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                    Welcome, {user.fullName}
                  </h1>
                  <p className="mt-1 text-sm text-[#4A574E]">
                    Submit crop photos for preliminary AI triage and receive guidance
                    verified by qualified agricultural specialists.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavClick('diagnose')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#143326] cursor-pointer whitespace-nowrap"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>New Crop Diagnosis</span>
                </button>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Total Crop Cases</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-[#1C241E]">
                    {stats.total}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Expert Verified</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-emerald-800">
                    {stats.verified}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Awaiting / In Review</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-amber-800">
                    {stats.pending}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
                  <div className="text-xs text-[#4A574E]">Info Requested</div>
                  <div className="mt-2 font-mono-num text-2xl font-bold text-orange-800">
                    {stats.actionRequired}
                  </div>
                </div>
              </div>

              {/* Recent Cases */}
              <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#1C241E]">
                    Recent Crop Diagnosis Cases
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleNavClick('cases')}
                    className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                  >
                    View All Cases
                  </button>
                </div>

                {cases.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D4CFC2] bg-[#FAF9F6] p-8 text-center">
                    <Sprout className="mx-auto h-7 w-7 text-[#2D6A4F]" />
                    <p className="mt-2 text-sm font-semibold text-[#1C241E]">
                      No crop cases submitted yet
                    </p>
                    <p className="mt-1 text-xs text-[#4A574E]">
                      Start by uploading photos and describing your crop symptoms.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleNavClick('diagnose')}
                      className="mt-4 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      Diagnose Your Crop
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#EFECE4]">
                    {cases.slice(0, 5).map((c) => (
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
                            <span>{c.growthStage}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{c.location}</span>
                          </div>
                          <div className="font-display text-sm font-bold text-[#1C241E] truncate">
                            {c.cropName}
                            {c.cropVariety ? ` (${c.cropVariety})` : ''} —{' '}
                            {c.aiAnalysis?.possibleDiagnosis || c.symptoms}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StatusBadge status={c.status} />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCaseId(c.id);
                              setSection('cases');
                            }}
                            className="rounded-lg border border-[#D4CFC2] px-3 py-1.5 text-xs font-medium text-[#1C241E] hover:bg-[#EFECE4] cursor-pointer"
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: DIAGNOSE CROP */}
          {section === 'diagnose' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                  {t(language, 'submitDiagnosis')}
                </h1>
                <p className="mt-1 text-sm text-[#4A574E]">
                  Provide clear leaf/plant photographs and field observations. Our AI
                  system generates a preliminary report, and a credential-verified
                  agricultural expert validates the final guidance.
                </p>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {formError}
                </div>
              )}

              <form
                onSubmit={handleSubmitCase}
                className="rounded-xl border border-[#DDD7C8] bg-white p-5 sm:p-6 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                      Crop *
                    </label>
                    <select
                      value={selectedCropId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCropId(val);
                        const found = crops.find((c) => String(c.id) === val);
                        if (found && found.growthStages.length > 0) {
                          setGrowthStage(found.growthStages[0]);
                        }
                      }}
                      className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                    >
                      {crops
                        .filter((c) => c.isActive)
                        .map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {language === 'kn' ? `${c.nameKn} (${c.name})` : c.name}
                          </option>
                        ))}
                      <option value="other">Other Crop (Specify)</option>
                    </select>
                  </div>

                  {selectedCropId === 'other' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                        Specify Crop Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customCropName}
                        onChange={(e) => setCustomCropName(e.target.value)}
                        placeholder="e.g. Sugarcane, Cotton, Onion"
                        className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                      Crop Variety (Optional)
                    </label>
                    <input
                      type="text"
                      list="crop-varieties-list"
                      value={cropVariety}
                      onChange={(e) => setCropVariety(e.target.value)}
                      placeholder="e.g. Arka Rakshak, Sona Masoori"
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                    {selectedCropObj && (
                      <datalist id="crop-varieties-list">
                        {selectedCropObj.commonVarieties.map((v) => (
                          <option key={v} value={v} />
                        ))}
                      </datalist>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                      Crop Growth Stage *
                    </label>
                    <select
                      value={growthStage}
                      onChange={(e) => setGrowthStage(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                    >
                      {(selectedCropObj?.growthStages.length
                        ? selectedCropObj.growthStages
                        : [
                            'Seedling',
                            'Vegetative',
                            'Flowering',
                            'Fruiting / Grain Filling',
                            'Maturity',
                          ]
                      ).map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                      Approximate Farming Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Village, Taluk, District, State"
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                      Date Symptoms First Appeared *
                    </label>
                    <input
                      type="date"
                      required
                      value={symptomOnsetDate}
                      onChange={(e) => setSymptomOnsetDate(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                      Field Urgency
                    </label>
                    <select
                      value={urgency}
                      onChange={(e) =>
                        setUrgency(e.target.value as 'Low' | 'Normal' | 'High')
                      }
                      className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                    >
                      <option value="Normal">Normal (Localized symptoms)</option>
                      <option value="High">High (Rapid spread across plot)</option>
                      <option value="Low">Low (Early minor observation)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                    Visible Crop Symptoms *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe leaf spots, discoloration, wilting, insect damage, affected plant parts (upper vs lower leaves), and spread pattern..."
                    className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2.5 text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                    Additional Observations (Weather, Irrigation, Recent Inputs)
                  </label>
                  <textarea
                    rows={2}
                    value={additionalObservations}
                    onChange={(e) => setAdditionalObservations(e.target.value)}
                    placeholder="e.g. Heavy rain 3 days ago, urea applied last week, drip irrigation..."
                    className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>

                {/* Image Upload with Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#1C241E]">
                      Upload Crop Images (Up to 4 photos · JPEG, PNG, WebP)
                    </label>
                    <span className="text-[11px] text-[#4A574E]">
                      Include 1 close-up of affected leaf + 1 whole-plant view
                    </span>
                  </div>

                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C7D7CC] bg-[#FAF9F6] p-6 text-center hover:border-[#1B4332] transition-colors cursor-pointer">
                    <Camera className="h-7 w-7 text-[#2D6A4F]" />
                    <span className="mt-2 text-sm font-medium text-[#1C241E]">
                      Click to select crop photos from your phone or computer
                    </span>
                    <span className="mt-0.5 text-xs text-[#4A574E]">
                      Images are automatically resized for fast rural uploads
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>

                  {uploadedImgs.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {uploadedImgs.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative overflow-hidden rounded-lg border border-[#D4CFC2] bg-white"
                        >
                          <img
                            src={img.imageData}
                            alt={img.fileName}
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setUploadedImgs((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="absolute right-1.5 top-1.5 rounded-md bg-black/65 p-1 text-white hover:bg-black cursor-pointer"
                            aria-label="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="p-2 text-[11px] truncate text-[#4A574E]">
                            {img.fileName}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950">
                  <strong>Advisory Transparency:</strong> Submitting generates a
                  preliminary AI assessment for triage only. No treatment recommendations
                  are finalized until reviewed by a verified agricultural expert.
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingCase}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-6 py-3 text-sm font-semibold text-white hover:bg-[#143326] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {submittingCase && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span>
                      {submittingCase
                        ? 'Analyzing & Routing to Expert...'
                        : 'Submit for Preliminary AI & Expert Review'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION: MY CASES */}
          {section === 'cases' && (
            <div className="space-y-5">
              {selectedCase ? (
                <CaseDetailPanel
                  cropCase={selectedCase}
                  viewerRole="farmer"
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
                      {t(language, 'myCases')}
                    </h1>
                    <button
                      type="button"
                      onClick={() => handleNavClick('diagnose')}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>Submit New Case</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A574E]" />
                      <input
                        type="text"
                        value={caseSearch}
                        onChange={(e) => setCaseSearch(e.target.value)}
                        placeholder="Search by case code, crop, location, or symptoms..."
                        className="w-full rounded-lg border border-[#D4CFC2] bg-white pl-9 pr-3 py-2 text-sm"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Awaiting Expert Review">
                        Awaiting Expert Review
                      </option>
                      <option value="Under Expert Review">
                        Under Expert Review
                      </option>
                      <option value="Additional Information Required">
                        Additional Information Required
                      </option>
                      <option value="Expert Verified">Expert Verified</option>
                      <option value="Reassessment Required">
                        Reassessment Required
                      </option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  {filteredCases.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D4CFC2] bg-white p-10 text-center text-sm text-[#4A574E]">
                      No crop cases found matching your criteria.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCases.map((c) => (
                        <article
                          key={c.id}
                          className="rounded-xl border border-[#DDD7C8] bg-white p-5 flex flex-col justify-between gap-4 hover:border-[#1B4332]/50 transition-colors"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-xs text-[#4A574E]">
                                <span className="font-mono-num font-semibold text-[#1B4332]">
                                  {c.caseCode}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span className="tabular-nums">
                                  {c.symptomOnsetDate}
                                </span>
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
                                <h3 className="font-display text-base font-bold text-[#1C241E] truncate">
                                  {c.cropName}
                                  {c.cropVariety ? ` (${c.cropVariety})` : ''}
                                </h3>
                                <p className="text-xs text-[#4A574E] mt-0.5">
                                  {c.growthStage} · {c.location}
                                </p>
                                <p className="mt-1.5 text-xs text-[#2C362F] line-clamp-2">
                                  {c.symptoms}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-[#EFECE4] pt-3 flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#4A574E] truncate">
                              {c.assignedExpert
                                ? `Expert: ${c.assignedExpert.fullName}`
                                : 'Awaiting expert assignment'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedCaseId(c.id)}
                              className="rounded-lg bg-[#1B4332] px-3.5 py-1.5 font-semibold text-white hover:bg-[#143326] cursor-pointer whitespace-nowrap"
                            >
                              Inspect Case
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

          {/* SECTION: EXPERT CONSULTATION */}
          {section === 'consultation' && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                {t(language, 'expertConsultation')}
              </h1>
              <p className="text-sm text-[#4A574E]">
                Select any active case to ask follow-up questions, respond to an
                expert's information request, or upload updated crop photos.
              </p>

              <div className="space-y-3">
                {cases.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D4CFC2] bg-white p-8 text-center text-sm text-[#4A574E]">
                    Submit a crop diagnosis request first to start consulting with an
                    expert.
                  </div>
                ) : (
                  cases.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-[#DDD7C8] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A574E]">
                          <span className="font-mono-num font-semibold text-[#1B4332]">
                            {c.caseCode}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{c.cropName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {c.messages.length} messages
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-[#1C241E]">
                          {c.assignedExpert
                            ? `Specialist: ${c.assignedExpert.fullName}`
                            : 'Awaiting specialist assignment'}
                        </div>
                        {c.messages.length > 0 && (
                          <p className="text-xs text-[#4A574E] line-clamp-1">
                            Latest: "{c.messages[c.messages.length - 1].message}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={c.status} />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCaseId(c.id);
                            setSection('cases');
                          }}
                          className="rounded-lg bg-[#1B4332] px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer"
                        >
                          Open Thread
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION: NOTIFICATIONS */}
          {section === 'notifications' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                  {t(language, 'notifications')}
                </h1>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="rounded-lg border border-[#D4CFC2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1B4332] hover:bg-[#EFECE4] cursor-pointer"
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D4CFC2] bg-white p-8 text-center text-sm text-[#4A574E]">
                  No notifications yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        n.isRead
                          ? 'border-[#E5E0D5] bg-white'
                          : 'border-[#1B4332]/40 bg-[#F4F8F5]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1C241E]">
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="text-[11px] font-semibold text-[#1B4332]">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#37423A]">{n.message}</p>
                        <div className="font-mono-num text-[11px] text-[#4A574E]">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {n.caseId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCaseId(n.caseId);
                              setSection('cases');
                            }}
                            className="rounded-lg bg-[#1B4332] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                          >
                            View Case
                          </button>
                        )}
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkNotificationRead(n.id)}
                            className="rounded-lg border border-[#D4CFC2] bg-white px-3 py-1.5 text-xs font-medium text-[#1C241E] cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION: PROFILE */}
          {section === 'profile' && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                Farmer Profile & Farm Details
              </h1>
              {profileMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>{profileMsg}</span>
                </div>
              )}
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
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profPhone}
                      onChange={(e) => setProfPhone(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Village / Hobli
                    </label>
                    <input
                      type="text"
                      value={profVillage}
                      onChange={(e) => setProfVillage(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      value={profDistrict}
                      onChange={(e) => setProfDistrict(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={profState}
                      onChange={(e) => setProfState(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Farm Area (Acres)
                    </label>
                    <input
                      type="text"
                      value={profAcres}
                      onChange={(e) => setProfAcres(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Primary Crops
                    </label>
                    <input
                      type="text"
                      value={profCrops}
                      onChange={(e) => setProfCrops(e.target.value)}
                      className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                      Soil & Irrigation Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={profSoil}
                        onChange={(e) => setProfSoil(e.target.value)}
                        placeholder="Soil type"
                        className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={profIrrigation}
                        onChange={(e) => setProfIrrigation(e.target.value)}
                        placeholder="Irrigation"
                        className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#143326] cursor-pointer"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION: HELP & SUPPORT */}
          {section === 'support' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#1C241E]">
                  {t(language, 'helpSupport')}
                </h1>
                <p className="mt-1 text-sm text-[#4A574E]">
                  Guidelines for capturing clear diagnostic photographs and browsing
                  expert-verified crop resources.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-2">
                  <div className="font-display text-sm font-bold text-[#1B4332]">
                    01. Capture Clear Daylight Photos
                  </div>
                  <p className="text-xs text-[#37423A] leading-relaxed">
                    Take photos in natural daylight avoiding harsh shadows. Hold the
                    camera steady 15–25 cm from affected leaves and include both upper
                    and lower surfaces.
                  </p>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-2">
                  <div className="font-display text-sm font-bold text-[#1B4332]">
                    02. Wait for Expert Sign-Off
                  </div>
                  <p className="text-xs text-[#37423A] leading-relaxed">
                    Preliminary AI findings are strictly triage tools. Always wait for
                    the green "Expert Verified" indicator before applying crop
                    protection inputs.
                  </p>
                </div>
                <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-2">
                  <div className="font-display text-sm font-bold text-[#1B4332]">
                    03. Respond to Follow-Up Prompts
                  </div>
                  <p className="text-xs text-[#37423A] leading-relaxed">
                    If an agronomist marks your case "Additional Info Required", share
                    recent rainfall, fertilizer dates, and a wider plant photo in the
                    case thread.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="font-display text-lg font-bold text-[#1C241E]">
                  Verified Agricultural Knowledge Reference
                </h2>
                <KnowledgeBrowser
                  records={knowledge}
                  crops={crops}
                  language={language}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
