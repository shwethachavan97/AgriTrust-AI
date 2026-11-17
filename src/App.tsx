import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './lib/firebase.ts';
import { apiFetch, getAuthToken, setAuthToken } from './lib/api.ts';
import type {
  AppUser,
  CropCase,
  CropCatalogItem,
  KnowledgeRecord,
  LanguageCode,
  NotificationItem,
} from './types/agritrust.ts';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { FarmerDashboard } from './components/FarmerDashboard.tsx';
import { ExpertDashboard } from './components/ExpertDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [aiMode, setAiMode] = useState<string>('demonstration-mock');

  const [crops, setCrops] = useState<CropCatalogItem[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);
  const [cases, setCases] = useState<CropCase[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>(
    'login'
  );
  const [authInitialRole, setAuthInitialRole] = useState<'farmer' | 'expert'>(
    'farmer'
  );

  const loadPublicData = useCallback(async () => {
    try {
      const [cropsRes, knowledgeRes, healthRes] = await Promise.all([
        apiFetch<CropCatalogItem[]>('/api/crops'),
        apiFetch<KnowledgeRecord[]>('/api/knowledge'),
        apiFetch<{ status: string; aiMode: string }>('/api/health'),
      ]);
      setCrops(cropsRes);
      setKnowledge(knowledgeRes);
      setAiMode(healthRes.aiMode);
    } catch (err) {
      console.error('Failed to load initial catalog:', err);
    }
  }, []);

  const loadProtectedData = useCallback(async () => {
    setLoadingData(true);
    setGlobalError(null);
    try {
      const [casesRes, notifRes, cropsRes, knowledgeRes] = await Promise.all([
        apiFetch<CropCase[]>('/api/cases'),
        apiFetch<NotificationItem[]>('/api/notifications'),
        apiFetch<CropCatalogItem[]>('/api/crops'),
        apiFetch<KnowledgeRecord[]>('/api/knowledge'),
      ]);
      setCases(casesRes);
      setNotifications(notifRes);
      setCrops(cropsRes);
      setKnowledge(knowledgeRes);
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : 'Unable to refresh workspace data.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void loadPublicData();

    const existingToken = getAuthToken();
    if (existingToken && existingToken.startsWith('at_')) {
      apiFetch<{ user: AppUser }>('/api/auth/me')
        .then((res) => {
          setUser(res.user);
          if (res.user.preferredLanguage === 'kn') {
            setLanguage('kn');
          }
          setView('dashboard');
          void loadProtectedData();
        })
        .catch(() => {
          setAuthToken(null);
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && !getAuthToken()?.startsWith('at_')) {
        try {
          const idToken = await fbUser.getIdToken();
          setAuthToken(idToken);
          const res = await apiFetch<{ user: AppUser }>('/api/auth/me');
          setUser(res.user);
          setView('dashboard');
          await loadProtectedData();
        } catch {
          // Ignore stale firebase state
        }
      }
    });

    return () => unsubscribe();
  }, [loadPublicData, loadProtectedData]);

  const handleOpenAuth = (
    mode: 'login' | 'register',
    role: 'farmer' | 'expert' = 'farmer'
  ) => {
    setAuthInitialMode(mode);
    setAuthInitialRole(role);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (authenticatedUser: AppUser) => {
    setUser(authenticatedUser);
    if (
      authenticatedUser.preferredLanguage === 'kn' ||
      authenticatedUser.preferredLanguage === 'en'
    ) {
      setLanguage(authenticatedUser.preferredLanguage);
    }
    setAuthModalOpen(false);
    setView('dashboard');
    void loadProtectedData();
  };

  const handleSignOut = async () => {
    setAuthToken(null);
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore if signed in via local session
    }
    setUser(null);
    setCases([]);
    setNotifications([]);
    setView('landing');
  };

  const handleLanguageChange = async (lang: LanguageCode) => {
    setLanguage(lang);
    if (user) {
      try {
        const res = await apiFetch<{ user: AppUser }>('/api/profile', {
          method: 'PATCH',
          body: JSON.stringify({ preferredLanguage: lang }),
        });
        setUser(res.user);
      } catch {
        // Non-blocking UI language preference update
      }
    }
  };

  if (view === 'dashboard' && user) {
    return (
      <>
        {globalError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-900 text-center">
            {globalError}
          </div>
        )}
        {user.role === 'farmer' && (
          <FarmerDashboard
            user={user}
            cases={cases}
            crops={crops}
            knowledge={knowledge}
            notifications={notifications}
            language={language}
            loadingData={loadingData}
            onLanguageChange={handleLanguageChange}
            onRefreshAll={loadProtectedData}
            onUserUpdated={setUser}
            onSignOut={handleSignOut}
            onBackToLanding={() => setView('landing')}
          />
        )}
        {user.role === 'expert' && (
          <ExpertDashboard
            user={user}
            cases={cases}
            crops={crops}
            knowledge={knowledge}
            language={language}
            loadingData={loadingData}
            onLanguageChange={handleLanguageChange}
            onRefreshAll={loadProtectedData}
            onUserUpdated={setUser}
            onSignOut={handleSignOut}
            onBackToLanding={() => setView('landing')}
          />
        )}
        {user.role === 'admin' && (
          <AdminDashboard
            user={user}
            cases={cases}
            crops={crops}
            knowledge={knowledge}
            language={language}
            aiMode={aiMode}
            onLanguageChange={handleLanguageChange}
            onRefreshAll={loadProtectedData}
            onSignOut={handleSignOut}
            onBackToLanding={() => setView('landing')}
          />
        )}
      </>
    );
  }

  return (
    <>
      <LandingPage
        user={user}
        language={language}
        crops={crops}
        knowledge={knowledge}
        onLanguageChange={handleLanguageChange}
        onOpenAuth={handleOpenAuth}
        onOpenDashboard={() => {
          setView('dashboard');
          void loadProtectedData();
        }}
      />
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authInitialMode}
        initialRole={authInitialRole}
        language={language}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </>
  );
}
