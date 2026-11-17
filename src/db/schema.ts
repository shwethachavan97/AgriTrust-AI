import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('farmer'), // 'farmer' | 'expert' | 'admin'
  preferredLanguage: text('preferred_language').notNull().default('en'), // 'en' | 'kn'
  isActive: boolean('is_active').notNull().default(true),
  isDemo: boolean('is_demo').notNull().default(false),
  consentAccepted: boolean('consent_accepted').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. farmer_profiles
export const farmerProfiles = pgTable('farmer_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  villageOrTown: text('village_or_town'),
  district: text('district'),
  state: text('state').default('Karnataka'),
  farmSizeAcres: text('farm_size_acres'),
  primaryCrops: text('primary_crops'),
  soilType: text('soil_type'),
  irrigationType: text('irrigation_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. expert_profiles
export const expertProfiles = pgTable('expert_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  title: text('title').default('Agricultural Specialist'),
  specialization: text('specialization').notNull(),
  yearsExperience: integer('years_experience').notNull().default(0),
  institution: text('institution'),
  regionServed: text('region_served'),
  languagesSpoken: text('languages_spoken').default('English, Kannada'),
  verificationStatus: text('verification_status').notNull().default('pending'), // 'pending' | 'verified' | 'rejected'
  verifiedByAdminId: integer('verified_by_admin_id').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. expert_credentials
export const expertCredentials = pgTable('expert_credentials', {
  id: serial('id').primaryKey(),
  expertProfileId: integer('expert_profile_id')
    .references(() => expertProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  degreeOrCertification: text('degree_or_certification').notNull(),
  issuingAuthority: text('issuing_authority').notNull(),
  licenseOrRegistrationNo: text('license_or_registration_no').notNull(),
  yearObtained: integer('year_obtained'),
  documentReference: text('document_reference'),
  verified: boolean('verified').notNull().default(false),
  reviewedNotes: text('reviewed_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. crops
export const crops = pgTable('crops', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  nameKn: text('name_kn').notNull(),
  category: text('category').notNull(),
  commonVarieties: text('common_varieties').notNull(), // JSON string array
  growthStages: text('growth_stages').notNull(), // JSON string array
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. crop_cases
export const cropCases = pgTable('crop_cases', {
  id: serial('id').primaryKey(),
  caseCode: text('case_code').notNull().unique(),
  farmerId: integer('farmer_id')
    .references(() => users.id)
    .notNull(),
  assignedExpertId: integer('assigned_expert_id').references(() => users.id),
  cropId: integer('crop_id').references(() => crops.id),
  cropName: text('crop_name').notNull(),
  cropVariety: text('crop_variety'),
  growthStage: text('growth_stage').notNull(),
  symptoms: text('symptoms').notNull(),
  location: text('location').notNull(),
  symptomOnsetDate: text('symptom_onset_date').notNull(),
  additionalObservations: text('additional_observations'),
  status: text('status').notNull().default('Submitted'),
  urgency: text('urgency').notNull().default('Normal'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. uploaded_images
export const uploadedImages = pgTable('uploaded_images', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id')
    .references(() => cropCases.id, { onDelete: 'cascade' })
    .notNull(),
  uploadedByUserId: integer('uploaded_by_user_id')
    .references(() => users.id)
    .notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  imageData: text('image_data').notNull(),
  caption: text('caption'),
  isFollowUp: boolean('is_follow_up').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. ai_analysis (preserved immutably for auditability)
export const aiAnalysis = pgTable('ai_analysis', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id')
    .references(() => cropCases.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  modelLabel: text('model_label').notNull(),
  isMock: boolean('is_mock').notNull().default(false),
  possibleDiagnosis: text('possible_diagnosis').notNull(),
  category: text('category').notNull(),
  alternativeCauses: text('alternative_causes').notNull(), // JSON array
  observedSymptoms: text('observed_symptoms').notNull(), // JSON array
  supportingEvidence: text('supporting_evidence').notNull(), // JSON array
  confidenceLevel: text('confidence_level').notNull(),
  confidenceScore: integer('confidence_score').notNull(),
  uncertaintyStatement: text('uncertainty_statement').notNull(),
  missingInformation: text('missing_information').notNull(), // JSON array
  expertReportSummary: text('expert_report_summary').notNull(),
  disclaimer: text('disclaimer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. expert_reviews (stored separately from AI analysis)
export const expertReviews = pgTable('expert_reviews', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id')
    .references(() => cropCases.id, { onDelete: 'cascade' })
    .notNull(),
  expertId: integer('expert_id')
    .references(() => users.id)
    .notNull(),
  expertNameSnapshot: text('expert_name_snapshot').notNull(),
  expertQualificationsSnapshot: text('expert_qualifications_snapshot').notNull(),
  decision: text('decision').notNull(), // 'Approved' | 'Corrected' | 'Rejected' | 'InfoRequested'
  verifiedDiagnosis: text('verified_diagnosis').notNull(),
  reviewNotes: text('review_notes').notNull(),
  aiEvaluationNotes: text('ai_evaluation_notes'),
  requestedInfoDetails: text('requested_info_details'),
  reviewedAt: timestamp('reviewed_at').defaultNow().notNull(),
});

// 10. recommendations
export const recommendations = pgTable('recommendations', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id')
    .references(() => cropCases.id, { onDelete: 'cascade' })
    .notNull(),
  expertReviewId: integer('expert_review_id')
    .references(() => expertReviews.id, { onDelete: 'cascade' })
    .notNull(),
  approvedByExpertId: integer('approved_by_expert_id')
    .references(() => users.id)
    .notNull(),
  culturalPractices: text('cultural_practices').notNull(),
  organicOrBiologicalOptions: text('organic_or_biological_options').notNull(),
  preventiveMeasures: text('preventive_measures').notNull(),
  safeChemicalGuidance: text('safe_chemical_guidance'),
  followUpTimeline: text('follow_up_timeline').notNull(),
  referenceSource: text('reference_source').notNull(),
  isPublishedToFarmer: boolean('is_published_to_farmer').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. case_history (audit trail of status & review changes)
export const caseHistory = pgTable('case_history', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id')
    .references(() => cropCases.id, { onDelete: 'cascade' })
    .notNull(),
  actorUserId: integer('actor_user_id').references(() => users.id),
  actorRole: text('actor_role').notNull(),
  actorName: text('actor_name').notNull(),
  actionType: text('action_type').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  caseId: integer('case_id').references(() => cropCases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('case_update'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. farmer_feedback
export const farmerFeedback = pgTable('farmer_feedback', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id')
    .references(() => cropCases.id, { onDelete: 'cascade' })
    .notNull(),
  farmerId: integer('farmer_id')
    .references(() => users.id)
    .notNull(),
  rating: integer('rating').notNull(),
  helpfulness: text('helpfulness').notNull(),
  outcomeReported: text('outcome_reported'),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. agricultural_knowledge
export const agriculturalKnowledge = pgTable('agricultural_knowledge', {
  id: serial('id').primaryKey(),
  cropId: integer('crop_id').references(() => crops.id),
  cropName: text('crop_name').notNull(),
  varietyInfo: text('variety_info'),
  problemType: text('problem_type').notNull(),
  title: text('title').notNull(),
  titleKn: text('title_kn'),
  pathogenOrCause: text('pathogen_or_cause'),
  symptoms: text('symptoms').notNull(),
  environmentalFactors: text('environmental_factors').notNull(),
  verifiedRecommendations: text('verified_recommendations').notNull(),
  referenceSource: text('reference_source').notNull(),
  reviewedByExpertId: integer('reviewed_by_expert_id').references(() => users.id),
  reviewedByExpertName: text('reviewed_by_expert_name').notNull(),
  lastReviewedDate: text('last_reviewed_date').notNull(),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Consultation Q&A messages between farmer & assigned expert
export const caseMessages = pgTable('case_messages', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id')
    .references(() => cropCases.id, { onDelete: 'cascade' })
    .notNull(),
  senderUserId: integer('sender_user_id')
    .references(() => users.id)
    .notNull(),
  senderRole: text('sender_role').notNull(),
  senderName: text('sender_name').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  farmerProfile: one(farmerProfiles, {
    fields: [users.id],
    references: [farmerProfiles.userId],
  }),
  expertProfile: one(expertProfiles, {
    fields: [users.id],
    references: [expertProfiles.userId],
  }),
  submittedCases: many(cropCases),
  notifications: many(notifications),
}));

export const expertProfilesRelations = relations(expertProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [expertProfiles.userId],
    references: [users.id],
  }),
  credentials: many(expertCredentials),
}));

export const expertCredentialsRelations = relations(expertCredentials, ({ one }) => ({
  expertProfile: one(expertProfiles, {
    fields: [expertCredentials.expertProfileId],
    references: [expertProfiles.id],
  }),
}));

export const cropCasesRelations = relations(cropCases, ({ one, many }) => ({
  farmer: one(users, {
    fields: [cropCases.farmerId],
    references: [users.id],
  }),
  crop: one(crops, {
    fields: [cropCases.cropId],
    references: [crops.id],
  }),
  images: many(uploadedImages),
  aiAnalysis: one(aiAnalysis, {
    fields: [cropCases.id],
    references: [aiAnalysis.caseId],
  }),
  reviews: many(expertReviews),
  recommendations: many(recommendations),
  history: many(caseHistory),
  feedback: many(farmerFeedback),
  messages: many(caseMessages),
}));
