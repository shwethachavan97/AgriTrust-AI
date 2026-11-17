export type UserRole = 'farmer' | 'expert' | 'admin';
export type LanguageCode = 'en' | 'kn';

export type CaseStatus =
  | 'Submitted'
  | 'AI Analysis in Progress'
  | 'Awaiting Expert Review'
  | 'Under Expert Review'
  | 'Additional Information Required'
  | 'Expert Verified'
  | 'Reassessment Required'
  | 'Closed';

export interface FarmerProfile {
  id: number;
  userId: number;
  villageOrTown: string | null;
  district: string | null;
  state: string | null;
  farmSizeAcres: string | null;
  primaryCrops: string | null;
  soilType: string | null;
  irrigationType: string | null;
}

export interface ExpertCredential {
  id: number;
  expertProfileId: number;
  degreeOrCertification: string;
  issuingAuthority: string;
  licenseOrRegistrationNo: string;
  yearObtained: number | null;
  documentReference: string | null;
  verified: boolean;
  reviewedNotes: string | null;
}

export interface ExpertProfile {
  id: number;
  userId: number;
  title: string | null;
  specialization: string;
  yearsExperience: number;
  institution: string | null;
  regionServed: string | null;
  languagesSpoken: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt: string | null;
  bio: string | null;
  avatarUrl: string | null;
  credentials?: ExpertCredential[];
}

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  preferredLanguage: LanguageCode;
  isActive: boolean;
  isDemo: boolean;
  consentAccepted: boolean;
  createdAt: string;
  farmerProfile?: FarmerProfile | null;
  expertProfile?: ExpertProfile | null;
}

export interface CropCatalogItem {
  id: number;
  name: string;
  nameKn: string;
  category: string;
  commonVarieties: string[];
  growthStages: string[];
  isActive: boolean;
}

export interface UploadedCaseImage {
  id: number;
  caseId: number;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  imageData: string;
  caption: string | null;
  isFollowUp: boolean;
  createdAt: string;
}

export interface AlternativeCause {
  cause: string;
  likelihoodNote: string;
  supportingDetail: string;
}

export interface CaseAIAnalysis {
  id: number;
  caseId: number;
  modelLabel: string;
  isMock: boolean;
  possibleDiagnosis: string;
  category: string;
  alternativeCauses: AlternativeCause[];
  observedSymptoms: string[];
  supportingEvidence: string[];
  confidenceLevel: string;
  confidenceScore: number;
  uncertaintyStatement: string;
  missingInformation: string[];
  expertReportSummary: string;
  disclaimer: string;
  createdAt: string;
}

export interface ExpertReviewRecord {
  id: number;
  caseId: number;
  expertId: number;
  expertNameSnapshot: string;
  expertQualificationsSnapshot: string;
  decision: 'Approved' | 'Corrected' | 'Rejected' | 'InfoRequested';
  verifiedDiagnosis: string;
  reviewNotes: string;
  aiEvaluationNotes: string | null;
  requestedInfoDetails: string | null;
  reviewedAt: string;
}

export interface CaseRecommendation {
  id: number;
  caseId: number;
  expertReviewId: number;
  approvedByExpertId: number;
  culturalPractices: string;
  organicOrBiologicalOptions: string;
  preventiveMeasures: string;
  safeChemicalGuidance: string | null;
  followUpTimeline: string;
  referenceSource: string;
  isPublishedToFarmer: boolean;
  createdAt: string;
}

export interface CaseHistoryItem {
  id: number;
  caseId: number;
  actorRole: string;
  actorName: string;
  actionType: string;
  previousStatus: string | null;
  newStatus: string | null;
  details: string;
  createdAt: string;
}

export interface CaseMessageItem {
  id: number;
  caseId: number;
  senderUserId: number;
  senderRole: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface FarmerFeedbackItem {
  id: number;
  caseId: number;
  rating: number;
  helpfulness: string;
  outcomeReported: string | null;
  comments: string | null;
  createdAt: string;
}

export interface CropCase {
  id: number;
  caseCode: string;
  farmerId: number;
  assignedExpertId: number | null;
  cropId: number | null;
  cropName: string;
  cropVariety: string | null;
  growthStage: string;
  symptoms: string;
  location: string;
  symptomOnsetDate: string;
  additionalObservations: string | null;
  status: CaseStatus;
  urgency: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  farmer: {
    id: number;
    fullName: string;
    email: string;
    role: string;
    isDemo: boolean;
  } | null;
  assignedExpert: {
    id: number;
    fullName: string;
    email: string;
    title: string;
    specialization: string;
    verificationStatus: string;
    institution: string | null;
    avatarUrl: string | null;
  } | null;
  images: UploadedCaseImage[];
  aiAnalysis: CaseAIAnalysis | null;
  reviews: ExpertReviewRecord[];
  recommendations: CaseRecommendation[];
  history: CaseHistoryItem[];
  messages: CaseMessageItem[];
  feedback: FarmerFeedbackItem[];
}

export interface NotificationItem {
  id: number;
  userId: number;
  caseId: number | null;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface KnowledgeRecord {
  id: number;
  cropId: number | null;
  cropName: string;
  varietyInfo: string | null;
  problemType: string;
  title: string;
  titleKn: string | null;
  pathogenOrCause: string | null;
  symptoms: string;
  environmentalFactors: string;
  verifiedRecommendations: string;
  referenceSource: string;
  reviewedByExpertName: string;
  lastReviewedDate: string;
}

export interface AdminOverview {
  totalFarmers: number;
  totalExperts: number;
  verifiedExperts: number;
  pendingExperts: number;
  totalCases: number;
  knowledgeCount: number;
  statusBreakdown: Record<string, number>;
  decisionBreakdown: Record<string, number>;
  averageFeedbackRating: number | null;
  feedbackCount: number;
  recentFeedback: FarmerFeedbackItem[];
}
