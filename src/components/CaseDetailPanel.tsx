import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck2,
  History,
  ImageOff,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Sprout,
  Star,
  X,
} from 'lucide-react';
import { apiFetch, readAndResizeCropImage } from '../lib/api.ts';
import type { CropCase, LanguageCode, UserRole } from '../types/agritrust.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { t } from '../i18n/translations.ts';

interface CaseDetailPanelProps {
  cropCase: CropCase;
  viewerRole: UserRole;
  isExpertVerified?: boolean;
  language: LanguageCode;
  onCaseUpdated: (updated: CropCase) => void;
  onClose?: () => void;
}

export const CaseDetailPanel: React.FC<CaseDetailPanelProps> = ({
  cropCase,
  viewerRole,
  isExpertVerified = false,
  language,
  onCaseUpdated,
  onClose,
}) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Follow-up image state (Farmer)
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgCaption, setImgCaption] = useState('');

  // Feedback state (Farmer)
  const [fbRating, setFbRating] = useState(5);
  const [fbHelpful, setFbHelpful] = useState('Very Helpful');
  const [fbOutcome, setFbOutcome] = useState('');
  const [fbComments, setFbComments] = useState('');
  const [submittingFb, setSubmittingFb] = useState(false);

  // Expert Verification form state
  const [showReviewForm, setShowReviewForm] = useState(
    viewerRole === 'expert' &&
      isExpertVerified &&
      cropCase.status !== 'Expert Verified' &&
      cropCase.status !== 'Closed'
  );
  const [decision, setDecision] = useState<
    'Approved' | 'Corrected' | 'Rejected' | 'InfoRequested'
  >('Approved');
  const [verifiedDiagnosis, setVerifiedDiagnosis] = useState(
    cropCase.aiAnalysis?.possibleDiagnosis || ''
  );
  const [reviewNotes, setReviewNotes] = useState('');
  const [aiEvalNotes, setAiEvalNotes] = useState('');
  const [requestedInfoDetails, setRequestedInfoDetails] = useState('');
  const [culturalPractices, setCulturalPractices] = useState('');
  const [organicOptions, setOrganicOptions] = useState('');
  const [preventiveMeasures, setPreventiveMeasures] = useState('');
  const [safeChemicalGuidance, setSafeChemicalGuidance] = useState('');
  const [followUpTimeline, setFollowUpTimeline] = useState(
    'Inspect new growth after 7 days and upload a follow-up photo if symptoms expand.'
  );
  const [referenceSource, setReferenceSource] = useState(
    'ICAR / State Agricultural University Package of Practices'
  );
  const [submittingReview, setSubmittingReview] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const refreshThisCase = async () => {
    const fresh = await apiFetch<CropCase>(`/api/cases/${cropCase.id}`);
    onCaseUpdated(fresh);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setActionError(null);
    setSendingMsg(true);
    try {
      await apiFetch(`/api/cases/${cropCase.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: messageText }),
      });
      setMessageText('');
      await refreshThisCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleFollowUpImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError(null);
    setUploadingImg(true);
    try {
      const processed = await readAndResizeCropImage(file);
      await apiFetch(`/api/cases/${cropCase.id}/images`, {
        method: 'POST',
        body: JSON.stringify({
          ...processed,
          caption: imgCaption || 'Follow-up field photograph',
        }),
      });
      setImgCaption('');
      setActionSuccess('Follow-up crop image uploaded and logged.');
      await refreshThisCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmittingFb(true);
    try {
      await apiFetch(`/api/cases/${cropCase.id}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: fbRating,
          helpfulness: fbHelpful,
          outcomeReported: fbOutcome,
          comments: fbComments,
        }),
      });
      setActionSuccess('Thank you! Your feedback has been recorded.');
      await refreshThisCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setSubmittingFb(false);
    }
  };

  const handleMarkInReview = async () => {
    setActionError(null);
    try {
      const updated = await apiFetch<CropCase>(`/api/cases/${cropCase.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Under Expert Review',
          note: 'Expert opened case for active clinical evaluation.',
        }),
      });
      onCaseUpdated(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update status.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmittingReview(true);
    try {
      const includeRec =
        decision === 'Approved' ||
        decision === 'Corrected' ||
        (decision === 'Rejected' && culturalPractices.trim().length > 0);

      const updated = await apiFetch<CropCase>(`/api/cases/${cropCase.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          verifiedDiagnosis,
          reviewNotes,
          aiEvaluationNotes: aiEvalNotes,
          requestedInfoDetails:
            decision === 'InfoRequested' ? requestedInfoDetails : undefined,
          recommendation: includeRec
            ? {
                culturalPractices,
                organicOrBiologicalOptions: organicOptions,
                preventiveMeasures,
                safeChemicalGuidance,
                followUpTimeline,
                referenceSource,
              }
            : undefined,
        }),
      });
      setShowReviewForm(false);
      setActionSuccess('Expert verification recorded and farmer notified.');
      onCaseUpdated(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const latestReview = cropCase.reviews[0] ?? null;
  const latestRec = cropCase.recommendations[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Top Case Summary Bar */}
      <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#4A574E]">
              <span className="font-mono-num font-semibold text-[#1B4332]">
                {cropCase.caseCode}
              </span>
              <span aria-hidden="true">·</span>
              <span>{cropCase.growthStage}</span>
              <span aria-hidden="true">·</span>
              <span>Urgency: {cropCase.urgency}</span>
              {cropCase.isDemo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Sample Demo Case</span>
                </>
              )}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1C241E]">
              {cropCase.cropName}
              {cropCase.cropVariety ? ` — ${cropCase.cropVariety}` : ''}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#4A574E] pt-1">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#2D6A4F]" />
                {cropCase.location}
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Calendar className="h-3.5 w-3.5 text-[#2D6A4F]" />
                Symptoms since {cropCase.symptomOnsetDate}
              </span>
              {cropCase.farmer && (
                <span>Farmer: {cropCase.farmer.fullName}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={cropCase.status} />
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#D4CFC2] px-3 py-1.5 text-xs font-medium text-[#1C241E] hover:bg-[#EFECE4] transition-colors cursor-pointer"
              >
                Back to List
              </button>
            )}
          </div>
        </div>

        {/* Farmer Reported Symptoms */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#EFECE4] pt-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-[#4A574E] mb-1">
              Farmer-Reported Symptoms
            </div>
            <p className="text-[#1C241E] leading-relaxed">{cropCase.symptoms}</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#4A574E] mb-1">
              Field Conditions & Observations
            </div>
            <p className="text-[#1C241E] leading-relaxed">
              {cropCase.additionalObservations || 'No additional observations provided.'}
            </p>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {actionSuccess}
        </div>
      )}

      {/* Uploaded Crop Images */}
      <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#1C241E]">
              Submitted Crop Imagery ({cropCase.images.length})
            </h3>
            <p className="text-xs text-[#4A574E]">
              Click any image to inspect leaf lesions and canopy margins at full size.
            </p>
          </div>

          {viewerRole === 'farmer' && cropCase.status !== 'Closed' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={imgCaption}
                onChange={(e) => setImgCaption(e.target.value)}
                placeholder="Optional photo note..."
                className="rounded-lg border border-[#D4CFC2] bg-[#FAF9F6] px-3 py-1.5 text-xs focus:border-[#1B4332] focus:outline-none"
              />
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B4332] bg-[#1B4332]/5 px-3 py-1.5 text-xs font-semibold text-[#1B4332] hover:bg-[#1B4332]/10 cursor-pointer whitespace-nowrap">
                {uploadingImg ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                <span>Upload Follow-up Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFollowUpImage}
                  disabled={uploadingImg}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {cropCase.images.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D4CFC2] bg-[#FAF9F6] p-6 text-center text-xs text-[#4A574E]">
            <ImageOff className="mx-auto h-6 w-6 mb-1.5 text-[#6B776E]" />
            No crop photographs were attached to this case.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cropCase.images.map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-lg border border-[#E5E0D5] bg-[#FAF9F6]"
              >
                <button
                  type="button"
                  onClick={() => setLightboxUrl(img.imageData)}
                  className="block w-full aspect-[4/3] overflow-hidden bg-[#EFECE4] cursor-zoom-in"
                >
                  <img
                    src={img.imageData}
                    alt={img.caption || img.fileName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover hover:scale-[1.02] transition-transform duration-200"
                  />
                </button>
                <div className="p-3 text-xs">
                  <div className="flex items-center justify-between gap-2 font-medium text-[#1C241E]">
                    <span className="truncate">{img.fileName}</span>
                    {img.isFollowUp && (
                      <span className="text-[11px] font-semibold text-[#2D6A4F] shrink-0">
                        Follow-up
                      </span>
                    )}
                  </div>
                  {img.caption && (
                    <p className="mt-1 text-[#4A574E] line-clamp-2">{img.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-Column Diagnostic Comparison: Preliminary AI vs Verified Expert Guidance */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* LEFT: Preliminary AI Analysis (Audit Preserved) */}
        <div className="rounded-xl border border-amber-200 bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-amber-200/70 pb-3">
            <div className="flex items-start gap-2.5">
              <Bot className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-base font-bold text-[#1C241E]">
                  {t(language, 'preliminaryAiHeader')}
                </h3>
                <p className="text-xs text-amber-900">
                  {cropCase.aiAnalysis?.modelLabel || 'Preliminary Intake'}
                </p>
              </div>
            </div>
            {cropCase.aiAnalysis && (
              <div className="text-right shrink-0">
                <div className="font-mono-num text-sm font-bold text-amber-900">
                  ~{cropCase.aiAnalysis.confidenceScore}% Est.
                </div>
                <div className="text-[11px] text-amber-800">
                  {cropCase.aiAnalysis.confidenceLevel} Confidence
                </div>
              </div>
            )}
          </div>

          {cropCase.aiAnalysis ? (
            <div className="space-y-4 text-sm">
              {cropCase.aiAnalysis.isMock && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950">
                  <span className="font-semibold">Demonstration / Sample Mode: </span>
                  This preliminary report was generated without a live clinical ML model.
                  Always rely on verified expert review below.
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-[#4A574E]">
                  Possible Preliminary Finding · {cropCase.aiAnalysis.category}
                </div>
                <div className="mt-1 font-display text-base font-bold text-[#1C241E]">
                  {cropCase.aiAnalysis.possibleDiagnosis}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-[#4A574E] mb-1">
                  Uncertainty & Limitations
                </div>
                <p className="text-xs text-[#37423A] leading-relaxed bg-white border border-amber-200/60 rounded-lg p-3">
                  {cropCase.aiAnalysis.uncertaintyStatement}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#4A574E] mb-1">
                    Observed Symptoms
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-[#2C362F]">
                    {cropCase.aiAnalysis.observedSymptoms.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#4A574E] mb-1">
                    Supporting Evidence
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-[#2C362F]">
                    {cropCase.aiAnalysis.supportingEvidence.map((ev, idx) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {cropCase.aiAnalysis.alternativeCauses.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[#4A574E] mb-1.5">
                    Alternative Possible Causes (Differential)
                  </div>
                  <div className="space-y-2">
                    {cropCase.aiAnalysis.alternativeCauses.map((alt, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-amber-200/70 bg-white p-2.5 text-xs"
                      >
                        <div className="font-semibold text-[#1C241E]">
                          {alt.cause}{' '}
                          <span className="font-normal text-[#4A574E]">
                            — {alt.likelihoodNote}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[#4A574E]">{alt.supportingDetail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-[#4A574E] mb-1">
                  Missing Information Flagged for Expert / Farmer
                </div>
                <ul className="list-disc pl-4 space-y-1 text-xs text-[#37423A]">
                  {cropCase.aiAnalysis.missingInformation.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-amber-200/70 pt-3 text-[11px] text-amber-900">
                {cropCase.aiAnalysis.disclaimer}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#4A574E]">
              Preliminary AI analysis is not yet available for this case.
            </p>
          )}
        </div>

        {/* RIGHT: Expert Verification & Official Reviewed Guidance */}
        <div className="rounded-xl border border-[#C7D7CC] bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#EFECE4] pb-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  latestReview && latestReview.decision !== 'InfoRequested'
                    ? 'text-emerald-700'
                    : 'text-[#4A574E]'
                }`}
              />
              <div>
                <h3 className="font-display text-base font-bold text-[#1C241E]">
                  {t(language, 'expertReviewHeader')}
                </h3>
                <p className="text-xs text-[#4A574E]">
                  {cropCase.assignedExpert
                    ? `Assigned Specialist: ${cropCase.assignedExpert.fullName} (${cropCase.assignedExpert.verificationStatus})`
                    : 'No verified expert assigned yet'}
                </p>
              </div>
            </div>
            {viewerRole === 'expert' &&
              isExpertVerified &&
              cropCase.status === 'Awaiting Expert Review' && (
                <button
                  type="button"
                  onClick={handleMarkInReview}
                  className="rounded-lg border border-[#1B4332] px-3 py-1 text-xs font-semibold text-[#1B4332] hover:bg-[#1B4332]/5 cursor-pointer whitespace-nowrap"
                >
                  Start Review
                </button>
              )}
          </div>

          {/* Pending / Unverified State — Never fake verification! */}
          {!latestReview ? (
            <div className="rounded-lg border border-[#E5E0D5] bg-[#FAF9F6] p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1C241E]">
                <Clock className="h-4 w-4 text-amber-700" />
                <span>{t(language, 'awaitingVerificationBadge')}</span>
              </div>
              <p className="text-xs text-[#4A574E] leading-relaxed">
                {cropCase.assignedExpert
                  ? `${cropCase.assignedExpert.fullName} has received your crop case and preliminary AI report. Treatment guidance will appear here once verified.`
                  : 'Your case is currently in the verification queue awaiting assignment to a credentialed agricultural expert. Treatment recommendations are withheld until an expert approves them.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Latest Expert Review Summary */}
              <div className="rounded-lg border border-[#D4CFC2] bg-[#FAF9F6] p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B4332]">
                    {latestReview.decision === 'Approved' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    )}
                    {latestReview.decision === 'Corrected' && (
                      <FileCheck2 className="h-4 w-4 text-sky-700" />
                    )}
                    {latestReview.decision === 'Rejected' && (
                      <AlertTriangle className="h-4 w-4 text-red-700" />
                    )}
                    <span>Decision: {latestReview.decision}</span>
                  </span>
                  <span className="font-mono-num text-[11px] text-[#4A574E]">
                    Reviewed {new Date(latestReview.reviewedAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <div className="text-xs text-[#4A574E]">
                    Verified Diagnosis / Assessment
                  </div>
                  <div className="font-display text-base font-bold text-[#1C241E]">
                    {latestReview.verifiedDiagnosis}
                  </div>
                </div>

                <p className="text-sm text-[#2C362F] leading-relaxed">
                  {latestReview.reviewNotes}
                </p>

                {latestReview.requestedInfoDetails && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-950">
                    <span className="font-semibold">Requested from Farmer: </span>
                    {latestReview.requestedInfoDetails}
                  </div>
                )}

                <div className="border-t border-[#E5E0D5] pt-2 text-[11px] text-[#4A574E]">
                  Verified by <span className="font-semibold text-[#1C241E]">{latestReview.expertNameSnapshot}</span> ·{' '}
                  {latestReview.expertQualificationsSnapshot}
                </div>
              </div>

              {/* Expert-Reviewed Recommendations */}
              {latestRec && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-sm font-bold text-[#1B4332]">
                      Approved Crop Management Guidance
                    </h4>
                    {language === 'kn' && (
                      <span className="text-[11px] text-[#4A574E]">
                        Expert-verified technical text kept in original reviewed language
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs leading-relaxed">
                    <div className="rounded-lg border border-[#E5E0D5] p-3">
                      <div className="font-semibold text-[#1C241E] mb-1">
                        1. Cultural & Field Practices
                      </div>
                      <p className="text-[#2C362F]">{latestRec.culturalPractices}</p>
                    </div>
                    <div className="rounded-lg border border-[#E5E0D5] p-3">
                      <div className="font-semibold text-[#1C241E] mb-1">
                        2. Organic & Biological Options
                      </div>
                      <p className="text-[#2C362F]">
                        {latestRec.organicOrBiologicalOptions}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#E5E0D5] p-3">
                      <div className="font-semibold text-[#1C241E] mb-1">
                        3. Preventive Measures
                      </div>
                      <p className="text-[#2C362F]">{latestRec.preventiveMeasures}</p>
                    </div>
                    {latestRec.safeChemicalGuidance && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                        <div className="font-semibold text-amber-950 mb-1">
                          4. Cautious Crop Protection Escalation (Expert-Authorized)
                        </div>
                        <p className="text-amber-950">
                          {latestRec.safeChemicalGuidance}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-[#EFECE4]/60 p-3 text-[11px] text-[#37423A]">
                      <span>
                        <strong>Follow-up:</strong> {latestRec.followUpTimeline}
                      </span>
                      <span>
                        <strong>Source:</strong> {latestRec.referenceSource}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expert Verification Submission Form */}
          {viewerRole === 'expert' && (
            <div className="border-t border-[#EFECE4] pt-4">
              {!isExpertVerified ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                  Your expert credentials are currently pending administrator verification.
                  Only verified agricultural experts can approve or publish official recommendations.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-sm font-bold text-[#1C241E]">
                      Submit / Update Expert Verification
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm((v) => !v)}
                      className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                    >
                      {showReviewForm ? 'Hide Form' : 'Open Review Form'}
                    </button>
                  </div>

                  {showReviewForm && (
                    <form onSubmit={handleSubmitReview} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-[#1C241E] mb-1.5">
                          Verification Decision *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              ['Approved', 'Approve AI Diagnosis'],
                              ['Corrected', 'Correct AI Diagnosis'],
                              ['Rejected', 'Reject AI Findings'],
                              ['InfoRequested', 'Request More Info'],
                            ] as const
                          ).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setDecision(val)}
                              className={`rounded-lg border px-3 py-2 text-left font-medium transition-colors cursor-pointer ${
                                decision === val
                                  ? 'border-[#1B4332] bg-[#1B4332] text-white'
                                  : 'border-[#D4CFC2] bg-[#FAF9F6] text-[#1C241E] hover:bg-[#EFECE4]'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {decision !== 'InfoRequested' && (
                        <div>
                          <label className="block font-semibold text-[#1C241E] mb-1">
                            Verified Diagnosis *
                          </label>
                          <input
                            type="text"
                            required={decision !== 'Rejected'}
                            value={verifiedDiagnosis}
                            onChange={(e) => setVerifiedDiagnosis(e.target.value)}
                            placeholder="Enter confirmed or corrected agronomic diagnosis"
                            className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block font-semibold text-[#1C241E] mb-1">
                          Expert Clinical Review Notes *
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Explain your visual assessment of leaf lesions, stage, and field context..."
                          className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-[#1C241E] mb-1">
                          Evaluation of Preliminary AI Findings (Audit Note)
                        </label>
                        <input
                          type="text"
                          value={aiEvalNotes}
                          onChange={(e) => setAiEvalNotes(e.target.value)}
                          placeholder="Note where AI was accurate, incomplete, or incorrect"
                          className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                        />
                      </div>

                      {decision === 'InfoRequested' ? (
                        <div>
                          <label className="block font-semibold text-[#1C241E] mb-1">
                            Specific Information / Images Required from Farmer *
                          </label>
                          <textarea
                            required
                            rows={2}
                            value={requestedInfoDetails}
                            onChange={(e) => setRequestedInfoDetails(e.target.value)}
                            placeholder="e.g. Please upload underside leaf photo and confirm recent urea/spray dates."
                            className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2.5 rounded-lg border border-[#E5E0D5] bg-[#FAF9F6] p-3">
                          <div className="font-semibold text-[#1B4332]">
                            Verified Management Recommendations
                          </div>
                          <div>
                            <label className="block font-medium mb-1">
                              Cultural Practices {decision !== 'Rejected' ? '*' : ''}
                            </label>
                            <textarea
                              required={decision !== 'Rejected'}
                              rows={2}
                              value={culturalPractices}
                              onChange={(e) => setCulturalPractices(e.target.value)}
                              placeholder="Sanitation, irrigation timing, spacing, drainage..."
                              className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block font-medium mb-1">
                              Organic / Biological Options {decision !== 'Rejected' ? '*' : ''}
                            </label>
                            <textarea
                              required={decision !== 'Rejected'}
                              rows={2}
                              value={organicOptions}
                              onChange={(e) => setOrganicOptions(e.target.value)}
                              placeholder="e.g. Trichoderma viride, Pseudomonas fluorescens, NSKE 5%..."
                              className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block font-medium mb-1">
                              Preventive Measures {decision !== 'Rejected' ? '*' : ''}
                            </label>
                            <textarea
                              required={decision !== 'Rejected'}
                              rows={2}
                              value={preventiveMeasures}
                              onChange={(e) => setPreventiveMeasures(e.target.value)}
                              placeholder="Crop rotation, resistant varieties, weed host removal..."
                              className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-1.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block font-medium mb-1">
                              Cautious Chemical Guidance (Optional, Label-Compliant Only)
                            </label>
                            <textarea
                              rows={2}
                              value={safeChemicalGuidance}
                              onChange={(e) => setSafeChemicalGuidance(e.target.value)}
                              placeholder="Include dosage, pre-harvest interval, and safety precautions only when threshold warrants."
                              className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-1.5 text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block font-medium mb-1">
                                Follow-up Timeline *
                              </label>
                              <input
                                type="text"
                                required={decision !== 'Rejected'}
                                value={followUpTimeline}
                                onChange={(e) => setFollowUpTimeline(e.target.value)}
                                className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block font-medium mb-1">
                                Reference Source *
                              </label>
                              <input
                                type="text"
                                required={decision !== 'Rejected'}
                                value={referenceSource}
                                onChange={(e) => setReferenceSource(e.target.value)}
                                className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-1.5 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="w-full rounded-lg bg-[#1B4332] py-2.5 text-sm font-semibold text-white hover:bg-[#143326] transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        {submittingReview
                          ? 'Saving Verification...'
                          : 'Submit Expert Verification & Notify Farmer'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Consultation Q&A Thread & Case History Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consultation Thread */}
        <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#1B4332]" />
              <h3 className="font-display text-base font-bold text-[#1C241E]">
                Expert Consultation Thread
              </h3>
            </div>

            {cropCase.messages.length === 0 ? (
              <p className="text-xs text-[#4A574E] py-4">
                No follow-up questions yet. Farmers and assigned experts can exchange
                clarifications here.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {cropCase.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg border p-3 text-xs ${
                      msg.senderRole === 'expert'
                        ? 'border-[#C7D7CC] bg-[#F4F8F5]'
                        : 'border-[#E5E0D5] bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-semibold text-[#1C241E]">
                      <span>
                        {msg.senderName} ({msg.senderRole})
                      </span>
                      <span className="font-mono-num text-[10px] font-normal text-[#4A574E]">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[#2C362F] leading-relaxed">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(viewerRole === 'farmer' || viewerRole === 'expert') && (
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-[#EFECE4]">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={
                  viewerRole === 'farmer'
                    ? 'Ask a follow-up question or share requested field details...'
                    : 'Reply to the farmer...'
                }
                className="flex-1 rounded-lg border border-[#D4CFC2] px-3 py-2 text-xs focus:border-[#1B4332] focus:outline-none"
              />
              <button
                type="submit"
                disabled={sendingMsg || !messageText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#143326] disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          )}
        </div>

        {/* Immutable Case Audit History */}
        <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#1B4332]" />
            <h3 className="font-display text-base font-bold text-[#1C241E]">
              Case Audit History
            </h3>
          </div>
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {cropCase.history.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[#EFECE4] bg-[#FAF9F6] p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#1C241E]">
                    {item.actorName} ({item.actorRole})
                  </span>
                  <span className="font-mono-num text-[10px] text-[#4A574E]">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-[#2C362F]">{item.details}</p>
                {item.newStatus && (
                  <div className="mt-1 text-[11px] text-[#4A574E]">
                    Status: {item.previousStatus ? `${item.previousStatus} → ` : ''}
                    <span className="font-semibold text-[#1B4332]">{item.newStatus}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Farmer Feedback Panel */}
      {(cropCase.feedback.length > 0 ||
        (viewerRole === 'farmer' &&
          (cropCase.status === 'Expert Verified' || cropCase.status === 'Closed'))) && (
        <div className="rounded-xl border border-[#DDD7C8] bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-[#1B4332]" />
            <h3 className="font-display text-base font-bold text-[#1C241E]">
              Farmer Outcome & Feedback
            </h3>
          </div>

          {cropCase.feedback.length > 0 ? (
            <div className="space-y-2">
              {cropCase.feedback.map((fb) => (
                <div
                  key={fb.id}
                  className="rounded-lg border border-[#E5E0D5] bg-[#FAF9F6] p-4 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-600">
                      {Array.from({ length: fb.rating }).map((_, idx) => (
                        <Star key={idx} className="h-3.5 w-3.5 fill-amber-500" />
                      ))}
                      <span className="ml-1.5 font-semibold text-[#1C241E]">
                        {fb.rating}/5 · {fb.helpfulness}
                      </span>
                    </div>
                    <span className="font-mono-num text-[11px] text-[#4A574E]">
                      {new Date(fb.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {fb.outcomeReported && (
                    <p className="text-[#2C362F]">
                      <strong>Field Outcome:</strong> {fb.outcomeReported}
                    </p>
                  )}
                  {fb.comments && (
                    <p className="text-[#4A574E]">{fb.comments}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-[#1C241E] mb-1">
                  Rating (1–5)
                </label>
                <select
                  value={fbRating}
                  onChange={(e) => setFbRating(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2"
                >
                  <option value={5}>5 — Excellent & Clear</option>
                  <option value={4}>4 — Good Guidance</option>
                  <option value={3}>3 — Somewhat Helpful</option>
                  <option value={2}>2 — Needs Clarification</option>
                  <option value={1}>1 — Not Helpful</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#1C241E] mb-1">
                  Usefulness
                </label>
                <select
                  value={fbHelpful}
                  onChange={(e) => setFbHelpful(e.target.value)}
                  className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2"
                >
                  <option value="Very Helpful">Very Helpful</option>
                  <option value="Helpful">Helpful</option>
                  <option value="Partially Helpful">Partially Helpful</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium text-[#1C241E] mb-1">
                  Crop Outcome Observed After Guidance
                </label>
                <input
                  type="text"
                  value={fbOutcome}
                  onChange={(e) => setFbOutcome(e.target.value)}
                  placeholder="e.g. New leaves are healthy and lesion spread stopped"
                  className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium text-[#1C241E] mb-1">
                  Additional Comments
                </label>
                <textarea
                  rows={2}
                  value={fbComments}
                  onChange={(e) => setFbComments(e.target.value)}
                  className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingFb}
                  className="rounded-lg bg-[#1B4332] px-4 py-2 font-semibold text-white hover:bg-[#143326] cursor-pointer"
                >
                  {submittingFb ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer"
            aria-label="Close image preview"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full resolution crop inspection"
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
};
