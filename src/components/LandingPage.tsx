import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  ChevronDown,
  FileCheck2,
  Languages,
  ShieldCheck,
  Sprout,
  Stethoscope,
  UploadCloud,
} from 'lucide-react';
import { t } from '../i18n/translations.ts';
import type {
  AppUser,
  CropCatalogItem,
  KnowledgeRecord,
  LanguageCode,
} from '../types/agritrust.ts';
import { BrandLogo } from './BrandLogo.tsx';
import { KnowledgeBrowser } from './KnowledgeBrowser.tsx';

interface LandingPageProps {
  user: AppUser | null;
  language: LanguageCode;
  crops: CropCatalogItem[];
  knowledge: KnowledgeRecord[];
  onLanguageChange: (lang: LanguageCode) => void;
  onOpenAuth: (mode: 'login' | 'register', role?: 'farmer' | 'expert') => void;
  onOpenDashboard: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'Does AgriTrust AI replace an agricultural scientist or extension officer?',
    a: 'No. AgriTrust AI follows a strict Human-in-the-Loop model. Artificial Intelligence only generates a structured preliminary triage report with confidence bounds and missing context. Every diagnosis and management recommendation must be verified by a credentialed agricultural expert before it is marked Expert Verified.',
  },
  {
    q: 'What happens if the AI preliminary assessment is wrong or uncertain?',
    a: 'Reviewing experts can explicitly Correct or Reject the AI finding, or Request Additional Information and follow-up leaf photos from the farmer. The original AI preliminary report is preserved separately in the database for full auditability.',
  },
  {
    q: 'Can any user approve crop treatment recommendations?',
    a: 'No. Only agricultural experts whose academic degrees and registration numbers have been verified by a platform administrator can approve recommendations or publish verified entries to the knowledge base.',
  },
  {
    q: 'Why are Kannada recommendations kept careful around technical prescriptions?',
    a: 'AgriTrust AI provides full Kannada interface navigation and bilingual crop names, while avoiding unreliable automatic machine translation on critical dosage or clinical guidance unless reviewed by an expert.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  user,
  language,
  crops,
  knowledge,
  onLanguageChange,
  onOpenAuth,
  onOpenDashboard,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C241E]">
      {/* 1. Navigation Bar — Clean 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-[#E5E0D5] bg-[#FAF9F6]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 py-3.5">
          {/* Zone 1: Single-line Wordmark */}
          <a href="#top" className="whitespace-nowrap shrink-0">
            <BrandLogo />
          </a>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#4A574E]">
            <a
              href="#problem"
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              {t(language, 'navProblem')}
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              {t(language, 'navHowItWorks')}
            </a>
            <a
              href="#ai-diagnosis"
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              {t(language, 'navAiDiagnosis')}
            </a>
            <a
              href="#expert-verification"
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              {t(language, 'navVerification')}
            </a>
            <a
              href="#faq"
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              {t(language, 'navFaq')}
            </a>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="rounded-lg bg-[#1B4332] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#143326] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {t(language, 'openDashboard')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login', 'farmer')}
                className="rounded-lg bg-[#1B4332] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#143326] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {t(language, 'primaryCta')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="top" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-12 lg:pt-14 lg:pb-16">
        {/* Language & Context Utility Strip */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E0D5] pb-4 text-xs text-[#4A574E]">
          <span>{t(language, 'tagline')}</span>
          <div className="flex items-center gap-2">
            <Languages className="h-3.5 w-3.5 text-[#1B4332]" />
            <span>{t(language, 'languageLabel')}:</span>
            <div className="inline-flex rounded-md border border-[#D4CFC2] bg-white p-0.5">
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                className={`rounded px-2 py-0.5 font-medium cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#1B4332] text-white'
                    : 'text-[#4A574E] hover:text-[#1C241E]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('kn')}
                className={`rounded px-2 py-0.5 font-medium cursor-pointer ${
                  language === 'kn'
                    ? 'bg-[#1B4332] text-white'
                    : 'text-[#4A574E] hover:text-[#1C241E]'
                }`}
              >
                ಕನ್ನಡ
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <h1
              className="font-display font-extrabold tracking-tight text-[#1C241E] text-balance"
              style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', lineHeight: 1.08 }}
            >
              {t(language, 'heroTitle')}
            </h1>
            <p className="text-base sm:text-lg text-[#37423A] leading-relaxed max-w-xl">
              {t(language, 'heroDescription')}
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={() =>
                  user ? onOpenDashboard() : onOpenAuth('register', 'farmer')
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-6 py-3 text-sm font-semibold text-white hover:bg-[#143326] active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{t(language, 'primaryCta')}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  user ? onOpenDashboard() : onOpenAuth('register', 'expert')
                }
                className="inline-flex items-center gap-2 rounded-lg border border-[#1B4332] bg-white px-5 py-3 text-sm font-semibold text-[#1B4332] hover:bg-[#EFECE4] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Stethoscope className="h-4 w-4" />
                <span>{t(language, 'secondaryCta')}</span>
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login', 'farmer')}
                  className="text-sm font-semibold text-[#2D6A4F] hover:text-[#1B4332] underline-offset-4 hover:underline px-2 py-2 cursor-pointer whitespace-nowrap"
                >
                  {t(language, 'signIn')} / Try Demo Roles
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[280px] sm:min-h-[360px] overflow-hidden rounded-2xl border border-[#DDD7C8] bg-[#EFECE4]">
              <img
                src="/src/assets/images/hero_agritrust_field_1794912041982.jpg"
                alt="Agronomist inspecting green crops in sunlit field with digital diagnostic tablet"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 sm:p-6 text-white">
                <div className="text-xs font-medium text-[#D8F3DC]">
                  Human-in-the-Loop Agronomy · Karnataka Pilot Architecture
                </div>
                <div className="mt-1 font-display text-sm sm:text-base font-semibold">
                  AI triage prepares field context; credentialed pathologists approve
                  the guidance.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Trust Strip Below Hero Split */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-[#E5E0D5] pt-8">
          <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
            <div className="text-xs font-semibold text-[#2D6A4F]">01. Rapid Triage</div>
            <div className="mt-1 font-display text-sm font-bold text-[#1C241E]">
              Structured AI Intake
            </div>
            <p className="mt-1 text-xs text-[#4A574E]">
              Analyzes leaf photos & growth stage to surface differential possibilities.
            </p>
          </div>
          <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
            <div className="text-xs font-semibold text-[#2D6A4F]">02. Uncertainty Aware</div>
            <div className="mt-1 font-display text-sm font-bold text-[#1C241E]">
              No False 100% Claims
            </div>
            <p className="mt-1 text-xs text-[#4A574E]">
              Flags overlapping causes and missing soil or weather details honestly.
            </p>
          </div>
          <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
            <div className="text-xs font-semibold text-[#2D6A4F]">03. Accountable Sign-Off</div>
            <div className="mt-1 font-display text-sm font-bold text-[#1C241E]">
              Verified Expert Gate
            </div>
            <p className="mt-1 text-xs text-[#4A574E]">
              Treatment plans stay withheld until an accredited agronomist approves.
            </p>
          </div>
          <div className="rounded-xl border border-[#DDD7C8] bg-white p-4">
            <div className="text-xs font-semibold text-[#2D6A4F]">04. Bilingual Ready</div>
            <div className="mt-1 font-display text-sm font-bold text-[#1C241E]">
              English & ಕನ್ನಡ Support
            </div>
            <p className="mt-1 text-xs text-[#4A574E]">
              Built for regional accessibility without reckless auto-translation.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Problem Statement */}
      <section id="problem" className="border-y border-[#E5E0D5] bg-[#EFECE4]/50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C241E] text-balance">
              {t(language, 'problemHeading')}
            </h2>
            <p className="mt-3 text-base text-[#37423A] leading-relaxed">
              {t(language, 'problemSub')}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-xl border border-[#D4CFC2] bg-white p-5 space-y-2">
              <div className="text-xs font-semibold text-[#1B4332]">
                Visual Ambiguity in Field Photos
              </div>
              <p className="text-sm text-[#37423A] leading-relaxed">
                Nutrient deficiencies, early fungal spots, and waterlogging chlorosis
                often look similar on mobile camera shots without soil and irrigation
                history.
              </p>
            </div>
            <div className="rounded-xl border border-[#D4CFC2] bg-white p-5 space-y-2">
              <div className="text-xs font-semibold text-[#1B4332]">
                Risk of Unchecked Chemical Advice
              </div>
              <p className="text-sm text-[#37423A] leading-relaxed">
                Automated apps recommending fungicides for a nutrient deficiency waste
                farmer income and damage beneficial soil biology.
              </p>
            </div>
            <div className="rounded-xl border border-[#D4CFC2] bg-white p-5 space-y-2">
              <div className="text-xs font-semibold text-[#1B4332]">
                Delayed Extension Access
              </div>
              <p className="text-sm text-[#37423A] leading-relaxed">
                Agricultural experts receive incomplete complaints. Structured AI intake
                collects crop stage, onset date, and differential clues upfront so
                experts resolve cases faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How AgriTrust AI Works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C241E] text-balance">
            {t(language, 'howHeading')}
          </h2>
          <p className="mt-2.5 text-base text-[#37423A]">{t(language, 'howSub')}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              step: '01',
              icon: <UploadCloud className="h-5 w-5 text-[#1B4332]" />,
              title: 'Farmer Submits Crop Case',
              desc: 'Selects crop, growth stage, onset date, location, and uploads field photos.',
            },
            {
              step: '02',
              icon: <Bot className="h-5 w-5 text-[#1B4332]" />,
              title: 'Preliminary AI Analysis',
              desc: 'Generates differential candidates, supporting observations, and missing questions.',
            },
            {
              step: '03',
              icon: <Stethoscope className="h-5 w-5 text-[#1B4332]" />,
              title: 'Expert Evaluates & Verifies',
              desc: 'Accredited specialist approves, corrects, rejects AI output, or requests follow-up photos.',
            },
            {
              step: '04',
              icon: <FileCheck2 className="h-5 w-5 text-[#1B4332]" />,
              title: 'Trusted Guidance Released',
              desc: 'Farmer receives cultural, biological, preventive, and safe escalation guidance.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-[#DDD7C8] bg-white p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-num text-xs font-bold text-[#2D6A4F]">
                  Step {item.step}
                </span>
                {item.icon}
              </div>
              <h3 className="font-display text-base font-bold text-[#1C241E]">
                {item.title}
              </h3>
              <p className="text-xs text-[#4A574E] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. AI Crop Diagnosis Showcase */}
      <section
        id="ai-diagnosis"
        className="border-t border-[#E5E0D5] bg-white py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C241E]">
              {t(language, 'aiSectionHeading')}
            </h2>
            <p className="mt-2.5 text-base text-[#37423A]">
              {t(language, 'aiSectionSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                img: '/src/assets/images/crop_tomato_blight_1794912042744.jpg',
                crop: 'Tomato · Arka Rakshak',
                aiGuess: 'Possible Early Blight (Alternaria solani)',
                conf: '78% Preliminary Est.',
                status: 'Expert Verified',
                note: 'Confirmed by Dr. Kavitha Rao with Trichoderma & sanitation plan.',
              },
              {
                img: '/src/assets/images/crop_paddy_blast_1794912042684.jpg',
                crop: 'Paddy · Sona Masoori',
                aiGuess: 'Possible Leaf Blast vs. Brown Spot',
                conf: '74% Preliminary Est.',
                status: 'Awaiting Expert Review',
                note: 'Treatment withheld pending plant pathologist verification.',
              },
              {
                img: '/src/assets/images/crop_maize_deficiency_1794912043842.jpg',
                crop: 'Maize · NAH-1137',
                aiGuess: 'Nitrogen Deficiency vs. Waterlogging',
                conf: '69% Preliminary Est.',
                status: 'Additional Info Required',
                note: 'Agronomist requested drainage & basal fertilizer history first.',
              },
            ].map((sample, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-[#DDD7C8] bg-[#FAF9F6] flex flex-col"
              >
                <img
                  src={sample.img}
                  alt={sample.crop}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="text-xs text-[#4A574E]">
                      <span>{sample.crop}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono-num">{sample.conf}</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[#1C241E]">
                      {sample.aiGuess}
                    </h3>
                    <p className="text-xs text-[#37423A]">{sample.note}</p>
                  </div>
                  <div className="pt-2 border-t border-[#E5E0D5] text-xs font-semibold text-[#1B4332]">
                    Workflow State: {sample.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Agriculture Expert Verification & 7. Farmer Benefits */}
      <section
        id="expert-verification"
        className="border-y border-[#E5E0D5] bg-[#FAF9F6] py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-[#DDD7C8] bg-white">
              <img
                src="/src/assets/images/expert_agronomist_portrait_1794912044332.jpg"
                alt="Credentialed agricultural expert examining leaf specimen inside greenhouse"
                referrerPolicy="no-referrer"
                className="aspect-square w-full object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C241E]">
                {t(language, 'expertSectionHeading')}
              </h2>
              <p className="mt-2.5 text-base text-[#37423A] leading-relaxed">
                {t(language, 'expertSectionSub')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#DDD7C8] bg-white p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1B4332]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verified Credentials Only</span>
                </div>
                <p className="text-xs text-[#4A574E] leading-relaxed">
                  Administrators audit degree certificates and agricultural
                  registration numbers before unlocking recommendation approvals.
                </p>
              </div>
              <div className="rounded-xl border border-[#DDD7C8] bg-white p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1B4332]">
                  <Sprout className="h-4 w-4" />
                  <span>Farmer-First Guidance</span>
                </div>
                <p className="text-xs text-[#4A574E] leading-relaxed">
                  Prioritizes cultural sanitation, biological control, and preventive
                  steps before cautious chemical escalation.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-[#1C241E] mb-2">
                {t(language, 'benefitsHeading')}
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[#2C362F]">
                <li>• Transparent status tracking from intake to sign-off</li>
                <li>• Follow-up crop photo uploads & direct expert Q&A</li>
                <li>• Preserved case history across cropping seasons</li>
                <li>• Traceable ICAR & university extension references</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Expert Collaboration & Agricultural Knowledge Database */}
      <section id="knowledge" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C241E]">
            {t(language, 'collabHeading')}
          </h2>
          <p className="mt-2 text-sm text-[#4A574E]">
            Browse curated, expert-reviewed crop disease, pest, and nutrient guides
            with traceable agricultural references.
          </p>
        </div>

        <KnowledgeBrowser
          records={knowledge.slice(0, 4)}
          crops={crops}
          language={language}
        />
      </section>

      {/* 9. Frequently Asked Questions */}
      <section id="faq" className="border-t border-[#E5E0D5] bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1C241E] text-center">
            {t(language, 'faqHeading')}
          </h2>

          <div className="divide-y divide-[#E5E0D5] rounded-xl border border-[#DDD7C8] bg-[#FAF9F6]">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="p-5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 text-left font-display text-sm sm:text-base font-bold text-[#1C241E] cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#4A574E] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-sm text-[#37423A] leading-relaxed">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. Quiet Footer */}
      <footer className="border-t border-[#E5E0D5] bg-[#1B4332] text-[#D8F3DC] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <BrandLogo lightText />
            <p className="text-xs text-[#B7E4C7] max-w-md">
              {t(language, 'demoNotice')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs">
            <a href="#problem" className="hover:text-white">
              {t(language, 'navProblem')}
            </a>
            <a href="#how-it-works" className="hover:text-white">
              {t(language, 'navHowItWorks')}
            </a>
            <a href="#knowledge" className="hover:text-white">
              {t(language, 'navKnowledge')}
            </a>
            <button
              type="button"
              onClick={() => onOpenAuth('login', 'farmer')}
              className="rounded-md border border-[#95D5B2]/40 px-3 py-1.5 font-semibold text-white hover:bg-white/10 cursor-pointer"
            >
              {user ? t(language, 'openDashboard') : t(language, 'signIn')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
