import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  HelpCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import type { CaseStatus } from '../types/agritrust.ts';

interface StatusBadgeProps {
  status: CaseStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Expert Verified':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 whitespace-nowrap shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          <span>Expert Verified</span>
        </span>
      );
    case 'Awaiting Expert Review':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 whitespace-nowrap shrink-0">
          <Clock className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
          <span>Awaiting Expert Review</span>
        </span>
      );
    case 'Under Expert Review':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 whitespace-nowrap shrink-0">
          <Eye className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
          <span>Under Expert Review</span>
        </span>
      );
    case 'Additional Information Required':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-900 whitespace-nowrap shrink-0">
          <HelpCircle className="h-3.5 w-3.5 text-orange-700" aria-hidden="true" />
          <span>Additional Info Required</span>
        </span>
      );
    case 'Reassessment Required':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-900 whitespace-nowrap shrink-0">
          <AlertTriangle className="h-3.5 w-3.5 text-red-700" aria-hidden="true" />
          <span>Reassessment Required</span>
        </span>
      );
    case 'Closed':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CFC2] bg-[#EFECE4] px-2.5 py-1 text-xs font-medium text-[#37423A] whitespace-nowrap shrink-0">
          <FileCheck2 className="h-3.5 w-3.5 text-[#4A574E]" aria-hidden="true" />
          <span>Closed</span>
        </span>
      );
    case 'AI Analysis in Progress':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-800 whitespace-nowrap shrink-0">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-600" aria-hidden="true" />
          <span>AI Analysis in Progress</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 whitespace-nowrap shrink-0">
          <ShieldAlert className="h-3.5 w-3.5 text-stone-600" aria-hidden="true" />
          <span>{status}</span>
        </span>
      );
  }
};
