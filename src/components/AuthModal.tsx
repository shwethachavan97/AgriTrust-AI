import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sprout,
  Stethoscope,
  UserCog,
  X,
} from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiFetch, setAuthToken } from '../lib/api.ts';
import type { AppUser, LanguageCode, UserRole } from '../types/agritrust.ts';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  initialRole?: 'farmer' | 'expert';
  language: LanguageCode;
  onClose: () => void;
  onAuthenticated: (user: AppUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  initialRole = 'farmer',
  language,
  onClose,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'farmer' | 'expert'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [primaryCrops, setPrimaryCrops] = useState('');
  // Expert registration fields
  const [title, setTitle] = useState('Agricultural Specialist');
  const [specialization, setSpecialization] = useState('');
  const [yearsExperience, setYearsExperience] = useState('5');
  const [institution, setInstitution] = useState('');
  const [degreeOrCertification, setDegreeOrCertification] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [licenseOrRegistrationNo, setLicenseOrRegistrationNo] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: AppUser }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      setAuthToken(data.token);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consentAccepted) {
      setError('Please accept the data privacy and advisory disclaimer to continue.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: AppUser }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            fullName,
            phone,
            role,
            preferredLanguage: language,
            consentAccepted,
            farmerDetails:
              role === 'farmer'
                ? {
                    district,
                    primaryCrops,
                    state: 'Karnataka',
                  }
                : undefined,
            expertDetails:
              role === 'expert'
                ? {
                    title,
                    specialization,
                    yearsExperience: Number(yearsExperience) || 0,
                    institution,
                    degreeOrCertification,
                    issuingAuthority,
                    licenseOrRegistrationNo,
                  }
                : undefined,
          }),
        }
      );
      setAuthToken(data.token);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: AppUser }>(
        '/api/auth/demo-login',
        {
          method: 'POST',
          body: JSON.stringify({ role: demoRole }),
        }
      );
      setAuthToken(data.token);
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setAuthToken(idToken);
      const data = await apiFetch<{ user: AppUser }>('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'x-agritrust-role': role,
        },
      });
      onAuthenticated(data.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In could not be completed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-xl border border-[#DDD7C8] bg-[#FAF9F6] shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-[#E5E0D5] px-6 py-4">
          <div>
            <h2
              id="auth-modal-title"
              className="font-display text-xl font-bold text-[#1C241E]"
            >
              {mode === 'login'
                ? 'Sign In to AgriTrust AI'
                : 'Create Your AgriTrust AI Account'}
            </h2>
            <p className="mt-0.5 text-xs text-[#4A574E]">
              Role-based access for Farmers, Credentialed Agricultural Experts, and Administrators
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#4A574E] hover:bg-[#EFECE4] hover:text-[#1C241E] transition-colors cursor-pointer"
            aria-label="Close authentication modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-[#EFECE4] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-[#1B4332] shadow-sm'
                  : 'text-[#4A574E] hover:text-[#1C241E]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-[#1B4332] shadow-sm'
                  : 'text-[#4A574E] hover:text-[#1C241E]'
              }`}
            >
              Register Account
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1C241E] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3.5 py-2.5 text-sm text-[#1C241E] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1C241E] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3.5 py-2.5 text-sm text-[#1C241E] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#143326] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4CFC2] bg-white px-5 py-2.5 text-sm font-medium text-[#1C241E] hover:bg-[#EFECE4] transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <span>Continue with Google</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Selection */}
              <div>
                <span className="block text-sm font-medium text-[#1C241E] mb-2">
                  Select Account Role
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('farmer')}
                    className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
                      role === 'farmer'
                        ? 'border-[#1B4332] bg-[#1B4332]/5 ring-1 ring-[#1B4332]'
                        : 'border-[#D4CFC2] bg-white hover:border-[#2D6A4F]'
                    }`}
                  >
                    <Sprout className="h-5 w-5 text-[#1B4332] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-[#1C241E]">
                        Farmer
                      </div>
                      <div className="text-xs text-[#4A574E] mt-0.5">
                        Submit crop photos, receive AI triage & expert guidance
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('expert')}
                    className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
                      role === 'expert'
                        ? 'border-[#1B4332] bg-[#1B4332]/5 ring-1 ring-[#1B4332]'
                        : 'border-[#D4CFC2] bg-white hover:border-[#2D6A4F]'
                    }`}
                  >
                    <Stethoscope className="h-5 w-5 text-[#1B4332] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-[#1C241E]">
                        Agriculture Expert
                      </div>
                      <div className="text-xs text-[#4A574E] mt-0.5">
                        Verify AI findings & issue approved advice (credential review required)
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1C241E] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Basavaraj Patil"
                    className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C241E] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C241E] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1C241E] mb-1">
                    Password (min 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                  />
                </div>
              </div>

              {role === 'farmer' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-[#1C241E] mb-1">
                      District / Taluk
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Mandya, Karnataka"
                      className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#1C241E] mb-1">
                      Primary Crops
                    </label>
                    <input
                      type="text"
                      value={primaryCrops}
                      onChange={(e) => setPrimaryCrops(e.target.value)}
                      placeholder="e.g. Paddy, Tomato, Ragi"
                      className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-[#DDD7C8] bg-[#EFECE4]/50 p-4">
                  <div className="text-xs font-semibold text-[#1B4332]">
                    Professional Qualification & Verification Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#1C241E] mb-1">
                        Role Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1C241E] mb-1">
                        Specialization *
                      </label>
                      <input
                        type="text"
                        required
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Plant Pathology / Entomology"
                        className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1C241E] mb-1">
                        Degree / Certification *
                      </label>
                      <input
                        type="text"
                        required
                        value={degreeOrCertification}
                        onChange={(e) => setDegreeOrCertification(e.target.value)}
                        placeholder="e.g. M.Sc. / Ph.D. Agronomy"
                        className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1C241E] mb-1">
                        Issuing University / Authority *
                      </label>
                      <input
                        type="text"
                        required
                        value={issuingAuthority}
                        onChange={(e) => setIssuingAuthority(e.target.value)}
                        placeholder="e.g. UAS Bengaluru"
                        className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1C241E] mb-1">
                        Registration / License No. *
                      </label>
                      <input
                        type="text"
                        required
                        value={licenseOrRegistrationNo}
                        onChange={(e) => setLicenseOrRegistrationNo(e.target.value)}
                        placeholder="e.g. KVK-2022-XXXX"
                        className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#1C241E] mb-1">
                        Institution & Years Experience
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                          placeholder="Institution"
                          className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={yearsExperience}
                          onChange={(e) => setYearsExperience(e.target.value)}
                          className="w-20 rounded-lg border border-[#D4CFC2] bg-white px-2.5 py-2 text-sm tabular-nums"
                          aria-label="Years of experience"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2.5 text-xs text-[#4A574E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-[#D4CFC2] text-[#1B4332] focus:ring-[#1B4332]"
                />
                <span>
                  I understand that AI analysis is preliminary only and that official crop
                  guidance requires review by a verified agricultural expert. I consent to
                  storing submitted crop photos for diagnostic review.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#143326] transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>
                    {role === 'expert'
                      ? 'Submit Expert Application'
                      : 'Create Farmer Account'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4CFC2] bg-white px-5 py-2.5 text-sm font-medium text-[#1C241E] hover:bg-[#EFECE4] transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <span>Register with Google</span>
                </button>
              </div>
            </form>
          )}

          {/* Clearly Labelled Demonstration Accounts */}
          <div className="border-t border-[#E5E0D5] pt-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1B4332]">
                <CheckCircle2 className="h-4 w-4 text-[#2D6A4F]" />
                <span>Demonstration Test Accounts (Sample Data Only)</span>
              </div>
              <span className="text-[11px] text-[#4A574E]">
                Not real farmers or real clinical approvals
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('farmer')}
                className="flex flex-col items-start rounded-lg border border-[#D4CFC2] bg-white p-3 text-left hover:border-[#1B4332] hover:bg-[#1B4332]/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C241E]">
                  <Sprout className="h-3.5 w-3.5 text-[#2D6A4F]" />
                  <span>Demo Farmer</span>
                </div>
                <span className="mt-1 font-mono text-[11px] text-[#4A574E] truncate w-full">
                  farmer.demo@agritrust.example
                </span>
                <span className="mt-0.5 font-mono text-[10px] text-[#6B776E]">
                  Pass: FarmerDemo@2026
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('expert')}
                className="flex flex-col items-start rounded-lg border border-[#D4CFC2] bg-white p-3 text-left hover:border-[#1B4332] hover:bg-[#1B4332]/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C241E]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2D6A4F]" />
                  <span>Demo Verified Expert</span>
                </div>
                <span className="mt-1 font-mono text-[11px] text-[#4A574E] truncate w-full">
                  expert.demo@agritrust.example
                </span>
                <span className="mt-0.5 font-mono text-[10px] text-[#6B776E]">
                  Pass: ExpertDemo@2026
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('admin')}
                className="flex flex-col items-start rounded-lg border border-[#D4CFC2] bg-white p-3 text-left hover:border-[#1B4332] hover:bg-[#1B4332]/5 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C241E]">
                  <UserCog className="h-3.5 w-3.5 text-[#2D6A4F]" />
                  <span>Demo Admin</span>
                </div>
                <span className="mt-1 font-mono text-[11px] text-[#4A574E] truncate w-full">
                  admin.demo@agritrust.example
                </span>
                <span className="mt-0.5 font-mono text-[10px] text-[#6B776E]">
                  Pass: AdminDemo@2026
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
