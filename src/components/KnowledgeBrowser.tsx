import React, { useMemo, useState } from 'react';
import { BookOpen, Plus, Search, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import type { CropCatalogItem, KnowledgeRecord, LanguageCode } from '../types/agritrust.ts';

interface KnowledgeBrowserProps {
  records: KnowledgeRecord[];
  crops: CropCatalogItem[];
  language: LanguageCode;
  canManage?: boolean;
  onRefresh?: () => Promise<void> | void;
}

export const KnowledgeBrowser: React.FC<KnowledgeBrowserProps> = ({
  records,
  crops,
  language,
  canManage = false,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [cropName, setCropName] = useState(crops[0]?.name || 'Tomato');
  const [problemType, setProblemType] = useState('Disease');
  const [title, setTitle] = useState('');
  const [titleKn, setTitleKn] = useState('');
  const [pathogenOrCause, setPathogenOrCause] = useState('');
  const [varietyInfo, setVarietyInfo] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [environmentalFactors, setEnvironmentalFactors] = useState('');
  const [verifiedRecommendations, setVerifiedRecommendations] = useState('');
  const [referenceSource, setReferenceSource] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (cropFilter !== 'all' && r.cropName !== cropFilter) return false;
      if (typeFilter !== 'all' && r.problemType !== typeFilter) return false;
      if (
        q &&
        !`${r.title} ${r.titleKn || ''} ${r.cropName} ${r.symptoms} ${r.pathogenOrCause || ''} ${r.referenceSource}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [records, search, cropFilter, typeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/knowledge', {
        method: 'POST',
        body: JSON.stringify({
          cropName,
          problemType,
          title,
          titleKn,
          pathogenOrCause,
          varietyInfo,
          symptoms,
          environmentalFactors,
          verifiedRecommendations,
          referenceSource,
        }),
      });
      setTitle('');
      setTitleKn('');
      setPathogenOrCause('');
      setVarietyInfo('');
      setSymptoms('');
      setEnvironmentalFactors('');
      setVerifiedRecommendations('');
      setReferenceSource('');
      setShowAddForm(false);
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      await onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove record.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A574E]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search diseases, pests, symptoms, or references..."
              className="w-full rounded-lg border border-[#D4CFC2] bg-white pl-9 pr-3 py-2 text-sm text-[#1C241E] focus:border-[#1B4332] focus:outline-none"
            />
          </div>

          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            className="rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm text-[#1C241E] focus:border-[#1B4332] focus:outline-none"
            aria-label="Filter by crop"
          >
            <option value="all">All Crops</option>
            {crops.map((c) => (
              <option key={c.id} value={c.name}>
                {language === 'kn' ? `${c.nameKn} (${c.name})` : c.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm text-[#1C241E] focus:border-[#1B4332] focus:outline-none"
            aria-label="Filter by problem type"
          >
            <option value="all">All Problem Types</option>
            <option value="Disease">Disease</option>
            <option value="Pest">Pest</option>
            <option value="Nutrient Deficiency">Nutrient Deficiency</option>
            <option value="Environmental">Environmental</option>
          </select>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143326] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>{showAddForm ? 'Cancel' : 'Add Knowledge Entry'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900">
          {error}
        </div>
      )}

      {canManage && showAddForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-[#D4CFC2] bg-white p-5 space-y-4"
        >
          <h3 className="font-display text-base font-bold text-[#1C241E]">
            Publish Expert-Attributed Knowledge Record
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1C241E] mb-1">
                Crop *
              </label>
              <select
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1C241E] mb-1">
                Problem Type *
              </label>
              <select
                value={problemType}
                onChange={(e) => setProblemType(e.target.value)}
                className="w-full rounded-lg border border-[#D4CFC2] bg-white px-3 py-2 text-sm"
              >
                <option value="Disease">Disease</option>
                <option value="Pest">Pest</option>
                <option value="Nutrient Deficiency">Nutrient Deficiency</option>
                <option value="Environmental">Environmental</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1C241E] mb-1">
                Condition Title (English) *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bacterial Wilt in Tomato"
                className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1C241E] mb-1">
                Kannada Title (Optional)
              </label>
              <input
                type="text"
                value={titleKn}
                onChange={(e) => setTitleKn(e.target.value)}
                placeholder="ಕನ್ನಡ ಶೀರ್ಷಿಕೆ"
                className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1C241E] mb-1">
                Pathogen / Causal Agent
              </label>
              <input
                type="text"
                value={pathogenOrCause}
                onChange={(e) => setPathogenOrCause(e.target.value)}
                placeholder="e.g. Ralstonia solanacearum"
                className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1C241E] mb-1">
                Variety Susceptibility Notes
              </label>
              <input
                type="text"
                value={varietyInfo}
                onChange={(e) => setVarietyInfo(e.target.value)}
                placeholder="e.g. Resistant vs susceptible cultivars"
                className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1C241E] mb-1">
              Diagnostic Symptoms *
            </label>
            <textarea
              required
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1C241E] mb-1">
              Environmental Factors
            </label>
            <textarea
              rows={2}
              value={environmentalFactors}
              onChange={(e) => setEnvironmentalFactors(e.target.value)}
              className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1C241E] mb-1">
              Expert-Reviewed Management Recommendations *
            </label>
            <textarea
              required
              rows={3}
              value={verifiedRecommendations}
              onChange={(e) => setVerifiedRecommendations(e.target.value)}
              className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1C241E] mb-1">
              Traceable Reference Source (ICAR / UAS / Extension Bulletin) *
            </label>
            <input
              type="text"
              required
              value={referenceSource}
              onChange={(e) => setReferenceSource(e.target.value)}
              placeholder="e.g. ICAR-IIHR Crop Protection Compendium (2026)"
              className="w-full rounded-lg border border-[#D4CFC2] px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#143326] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Publish Verified Record'}
            </button>
          </div>
        </form>
      )}

      {/* Records Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D4CFC2] bg-white p-8 text-center">
          <BookOpen className="mx-auto h-7 w-7 text-[#4A574E]" />
          <p className="mt-2 text-sm font-medium text-[#1C241E]">
            No knowledge records match your filters
          </p>
          <p className="mt-1 text-xs text-[#4A574E]">
            Try clearing the search query or selecting another crop category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[#DDD7C8] bg-white p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#4A574E]">
                      <span>{item.cropName}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{item.problemType}</span>
                      {item.pathogenOrCause && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="italic">{item.pathogenOrCause}</span>
                        </>
                      )}
                    </div>
                    <h4 className="mt-1 font-display text-base font-bold text-[#1C241E]">
                      {language === 'kn' && item.titleKn
                        ? item.titleKn
                        : item.title}
                    </h4>
                    {language === 'kn' && item.titleKn && (
                      <p className="text-xs text-[#4A574E]">{item.title}</p>
                    )}
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-md p-1.5 text-[#4A574E] hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-sm text-[#2C362F]">
                  <div>
                    <span className="font-semibold text-[#1C241E]">Symptoms: </span>
                    {item.symptoms}
                  </div>
                  <div>
                    <span className="font-semibold text-[#1C241E]">Environment: </span>
                    {item.environmentalFactors}
                  </div>
                  {item.varietyInfo && (
                    <div className="text-xs text-[#4A574E]">
                      <span className="font-semibold text-[#1C241E]">Varieties: </span>
                      {item.varietyInfo}
                    </div>
                  )}
                  <div className="rounded-lg bg-[#FAF9F6] border border-[#E5E0D5] p-3 text-xs leading-relaxed text-[#1C241E]">
                    <div className="font-semibold text-[#1B4332] mb-1">
                      Expert-Reviewed Recommendations
                    </div>
                    {item.verifiedRecommendations}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#EFECE4] pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4A574E]">
                <span>Source: {item.referenceSource}</span>
                <span className="tabular-nums">
                  Reviewed by {item.reviewedByExpertName} · {item.lastReviewedDate}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
