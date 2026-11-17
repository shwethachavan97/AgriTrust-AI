import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  agriculturalKnowledge,
  aiAnalysis,
  caseHistory,
  caseMessages,
  cropCases,
  crops,
  expertCredentials,
  expertProfiles,
  expertReviews,
  farmerFeedback,
  farmerProfiles,
  notifications,
  recommendations,
  uploadedImages,
  users,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import { getUserFullRecord } from './src/db/users.ts';
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
} from './src/lib/auth-crypto.ts';
import { runPreliminaryAIAnalysis } from './src/lib/ai-diagnosis.ts';
import {
  type AuthRequest,
  requireAuth,
  requireRole,
} from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_CASE_STATUSES = new Set([
  'Submitted',
  'AI Analysis in Progress',
  'Awaiting Expert Review',
  'Under Expert Review',
  'Additional Information Required',
  'Expert Verified',
  'Reassessment Required',
  'Closed',
]);

async function hydrateCases(caseRows: Array<typeof cropCases.$inferSelect>) {
  if (caseRows.length === 0) return [];

  const caseIds = caseRows.map((c) => c.id);
  const userIds = Array.from(
    new Set(
      caseRows
        .flatMap((c) => [c.farmerId, c.assignedExpertId])
        .filter((id): id is number => typeof id === 'number')
    )
  );

  const [
    userRows,
    expertProfRows,
    imageRows,
    analysisRows,
    reviewRows,
    recRows,
    historyRows,
    messageRows,
    feedbackRows,
  ] = await Promise.all([
    userIds.length > 0
      ? db.select().from(users).where(inArray(users.id, userIds))
      : Promise.resolve([]),
    userIds.length > 0
      ? db
          .select()
          .from(expertProfiles)
          .where(inArray(expertProfiles.userId, userIds))
      : Promise.resolve([]),
    db
      .select()
      .from(uploadedImages)
      .where(inArray(uploadedImages.caseId, caseIds))
      .orderBy(uploadedImages.createdAt),
    db.select().from(aiAnalysis).where(inArray(aiAnalysis.caseId, caseIds)),
    db
      .select()
      .from(expertReviews)
      .where(inArray(expertReviews.caseId, caseIds))
      .orderBy(desc(expertReviews.reviewedAt)),
    db
      .select()
      .from(recommendations)
      .where(inArray(recommendations.caseId, caseIds))
      .orderBy(desc(recommendations.createdAt)),
    db
      .select()
      .from(caseHistory)
      .where(inArray(caseHistory.caseId, caseIds))
      .orderBy(desc(caseHistory.createdAt)),
    db
      .select()
      .from(caseMessages)
      .where(inArray(caseMessages.caseId, caseIds))
      .orderBy(caseMessages.createdAt),
    db
      .select()
      .from(farmerFeedback)
      .where(inArray(farmerFeedback.caseId, caseIds))
      .orderBy(desc(farmerFeedback.createdAt)),
  ]);

  const userMap = new Map(
    userRows.map((u) => [
      u.id,
      {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        isDemo: u.isDemo,
      },
    ])
  );
  const expertProfileMap = new Map(expertProfRows.map((ep) => [ep.userId, ep]));

  return caseRows.map((c) => {
    const farmer = userMap.get(c.farmerId) ?? null;
    const expertUser = c.assignedExpertId
      ? userMap.get(c.assignedExpertId) ?? null
      : null;
    const expertProfile = c.assignedExpertId
      ? expertProfileMap.get(c.assignedExpertId) ?? null
      : null;

    const rawAi = analysisRows.find((a) => a.caseId === c.id) ?? null;
    const parsedAi = rawAi
      ? {
          ...rawAi,
          alternativeCauses: safeJsonParse(rawAi.alternativeCauses, []),
          observedSymptoms: safeJsonParse(rawAi.observedSymptoms, []),
          supportingEvidence: safeJsonParse(rawAi.supportingEvidence, []),
          missingInformation: safeJsonParse(rawAi.missingInformation, []),
        }
      : null;

    return {
      ...c,
      farmer,
      assignedExpert: expertUser
        ? {
            ...expertUser,
            title: expertProfile?.title ?? 'Agricultural Specialist',
            specialization: expertProfile?.specialization ?? '',
            verificationStatus: expertProfile?.verificationStatus ?? 'pending',
            institution: expertProfile?.institution ?? null,
            avatarUrl: expertProfile?.avatarUrl ?? null,
          }
        : null,
      images: imageRows.filter((img) => img.caseId === c.id),
      aiAnalysis: parsedAi,
      reviews: reviewRows.filter((r) => r.caseId === c.id),
      recommendations: recRows.filter((rec) => rec.caseId === c.id),
      history: historyRows.filter((h) => h.caseId === c.id),
      messages: messageRows.filter((m) => m.caseId === c.id),
      feedback: feedbackRows.filter((f) => f.caseId === c.id),
    };
  });
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Ensure demo seed data is lazily populated on first API request
  app.use('/api', async (_req, res, next) => {
    try {
      await ensureSeeded();
      next();
    } catch (error) {
      console.error('Lazy seed initialization error:', error);
      res.status(500).json({ error: 'Database initialization failed. Please retry.' });
    }
  });

  // ---------------------------------------------------------------------------
  // HEALTH & META
  // ---------------------------------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    const key = process.env.GEMINI_API_KEY?.trim();
    const aiConfigured = Boolean(
      key && key !== 'MY_GEMINI_API_KEY' && key.length > 10
    );
    res.json({
      status: 'ok',
      aiMode: aiConfigured ? 'gemini-4-hydrogen' : 'demonstration-mock',
    });
  });

  // ---------------------------------------------------------------------------
  // AUTHENTICATION ROUTES
  // ---------------------------------------------------------------------------
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const {
        email,
        password,
        fullName,
        phone,
        role,
        preferredLanguage,
        consentAccepted,
        farmerDetails,
        expertDetails,
      } = req.body ?? {};

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 8 characters long.' });
      }
      if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res.status(400).json({ error: 'Please provide your full name.' });
      }
      if (!consentAccepted) {
        return res.status(400).json({
          error: 'Please accept the agricultural advisory and data privacy consent.',
        });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const targetRole = role === 'expert' ? 'expert' : 'farmer';

      if (targetRole === 'expert') {
        if (
          !expertDetails?.specialization ||
          !expertDetails?.degreeOrCertification ||
          !expertDetails?.issuingAuthority ||
          !expertDetails?.licenseOrRegistrationNo
        ) {
          return res.status(400).json({
            error:
              'Agricultural experts must provide specialization, qualification degree, issuing authority, and registration/license number for verification.',
          });
        }
      }

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing.length > 0) {
        return res.status(409).json({
          error: 'An account with this email address already exists.',
        });
      }

      const uid = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const [created] = await db
        .insert(users)
        .values({
          uid,
          email: normalizedEmail,
          passwordHash: hashPassword(password),
          fullName: fullName.trim(),
          phone: phone ? String(phone).trim() : null,
          role: targetRole,
          preferredLanguage: preferredLanguage === 'kn' ? 'kn' : 'en',
          isActive: true,
          isDemo: false,
          consentAccepted: true,
        })
        .returning();

      if (targetRole === 'farmer') {
        await db.insert(farmerProfiles).values({
          userId: created.id,
          villageOrTown: farmerDetails?.villageOrTown || null,
          district: farmerDetails?.district || null,
          state: farmerDetails?.state || 'Karnataka',
          farmSizeAcres: farmerDetails?.farmSizeAcres || null,
          primaryCrops: farmerDetails?.primaryCrops || null,
          soilType: farmerDetails?.soilType || null,
          irrigationType: farmerDetails?.irrigationType || null,
        });
      } else {
        const [expProfile] = await db
          .insert(expertProfiles)
          .values({
            userId: created.id,
            title: expertDetails?.title || 'Agricultural Specialist',
            specialization: String(expertDetails.specialization).trim(),
            yearsExperience: Number(expertDetails?.yearsExperience) || 0,
            institution: expertDetails?.institution || null,
            regionServed: expertDetails?.regionServed || null,
            languagesSpoken: expertDetails?.languagesSpoken || 'English, Kannada',
            verificationStatus: 'pending',
            bio: expertDetails?.bio || null,
          })
          .returning();

        await db.insert(expertCredentials).values({
          expertProfileId: expProfile.id,
          degreeOrCertification: String(expertDetails.degreeOrCertification).trim(),
          issuingAuthority: String(expertDetails.issuingAuthority).trim(),
          licenseOrRegistrationNo: String(expertDetails.licenseOrRegistrationNo).trim(),
          yearObtained: expertDetails?.yearObtained
            ? Number(expertDetails.yearObtained)
            : null,
          documentReference: expertDetails?.documentReference || 'Submitted online',
          verified: false,
        });

        await db.insert(notifications).values({
          userId: created.id,
          title: 'Expert Credential Review Pending',
          message:
            'Your professional profile has been submitted. An administrator must verify your credentials before you can approve crop recommendations.',
          type: 'verification',
        });
      }

      const fullUser = await getUserFullRecord(created.id);
      const token = createSessionToken({
        uid: created.uid,
        userId: created.id,
        email: created.email,
        role: created.role,
      });

      res.status(201).json({ token, user: fullUser });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (!user || !user.passwordHash || !verifyPassword(String(password), user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'This account has been deactivated by an administrator.' });
      }

      const fullUser = await getUserFullRecord(user.id);
      const token = createSessionToken({
        uid: user.uid,
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({ token, user: fullUser });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Sign-in failed. Please try again.' });
    }
  });

  app.post('/api/auth/demo-login', async (req: Request, res: Response) => {
    try {
      const { role } = req.body ?? {};
      const demoEmailByRole: Record<string, string> = {
        farmer: 'farmer.demo@agritrust.example',
        expert: 'expert.demo@agritrust.example',
        admin: 'admin.demo@agritrust.example',
      };
      const targetEmail = demoEmailByRole[String(role)];
      if (!targetEmail) {
        return res.status(400).json({ error: 'Invalid demonstration role selected.' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, targetEmail))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'Demonstration account unavailable.' });
      }

      const fullUser = await getUserFullRecord(user.id);
      const token = createSessionToken({
        uid: user.uid,
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({ token, user: fullUser });
    } catch (error) {
      console.error('Demo login error:', error);
      res.status(500).json({ error: 'Demonstration sign-in failed.' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const fullUser = await getUserFullRecord(req.authUser!.id);
      res.json({ user: fullUser });
    } catch (error) {
      console.error('Fetch current user error:', error);
      res.status(500).json({ error: 'Failed to load profile.' });
    }
  });

  app.patch('/api/profile', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.authUser!.id;
      const { fullName, phone, preferredLanguage, farmerDetails, expertDetails } =
        req.body ?? {};

      await db
        .update(users)
        .set({
          ...(fullName ? { fullName: String(fullName).trim() } : {}),
          ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
          ...(preferredLanguage === 'kn' || preferredLanguage === 'en'
            ? { preferredLanguage }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      if (req.authUser!.role === 'farmer' && farmerDetails) {
        await db
          .insert(farmerProfiles)
          .values({
            userId,
            villageOrTown: farmerDetails.villageOrTown || null,
            district: farmerDetails.district || null,
            state: farmerDetails.state || 'Karnataka',
            farmSizeAcres: farmerDetails.farmSizeAcres || null,
            primaryCrops: farmerDetails.primaryCrops || null,
            soilType: farmerDetails.soilType || null,
            irrigationType: farmerDetails.irrigationType || null,
          })
          .onConflictDoUpdate({
            target: farmerProfiles.userId,
            set: {
              villageOrTown: farmerDetails.villageOrTown || null,
              district: farmerDetails.district || null,
              state: farmerDetails.state || 'Karnataka',
              farmSizeAcres: farmerDetails.farmSizeAcres || null,
              primaryCrops: farmerDetails.primaryCrops || null,
              soilType: farmerDetails.soilType || null,
              irrigationType: farmerDetails.irrigationType || null,
              updatedAt: new Date(),
            },
          });
      }

      if (req.authUser!.role === 'expert' && expertDetails) {
        await db
          .update(expertProfiles)
          .set({
            title: expertDetails.title || 'Agricultural Specialist',
            specialization:
              expertDetails.specialization || 'General Agronomy',
            yearsExperience: Number(expertDetails.yearsExperience) || 0,
            institution: expertDetails.institution || null,
            regionServed: expertDetails.regionServed || null,
            languagesSpoken: expertDetails.languagesSpoken || 'English, Kannada',
            bio: expertDetails.bio || null,
            updatedAt: new Date(),
          })
          .where(eq(expertProfiles.userId, userId));
      }

      const fullUser = await getUserFullRecord(userId);
      res.json({ user: fullUser });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  // ---------------------------------------------------------------------------
  // CROPS & KNOWLEDGE BASE
  // ---------------------------------------------------------------------------
  app.get('/api/crops', async (_req: Request, res: Response) => {
    try {
      const rows = await db
        .select()
        .from(crops)
        .orderBy(crops.name);
      res.json(
        rows.map((c) => ({
          ...c,
          commonVarieties: safeJsonParse<string[]>(c.commonVarieties, []),
          growthStages: safeJsonParse<string[]>(c.growthStages, []),
        }))
      );
    } catch (error) {
      console.error('Fetch crops error:', error);
      res.status(500).json({ error: 'Failed to load crops catalog.' });
    }
  });

  app.get('/api/knowledge', async (req: Request, res: Response) => {
    try {
      const cropFilter = typeof req.query.crop === 'string' ? req.query.crop.trim() : '';
      const typeFilter = typeof req.query.type === 'string' ? req.query.type.trim() : '';
      const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

      const rows = await db
        .select()
        .from(agriculturalKnowledge)
        .where(eq(agriculturalKnowledge.isPublished, true))
        .orderBy(desc(agriculturalKnowledge.lastReviewedDate));

      const filtered = rows.filter((r) => {
        if (cropFilter && r.cropName.toLowerCase() !== cropFilter.toLowerCase()) {
          return false;
        }
        if (typeFilter && r.problemType.toLowerCase() !== typeFilter.toLowerCase()) {
          return false;
        }
        if (
          q &&
          !`${r.title} ${r.titleKn || ''} ${r.cropName} ${r.symptoms} ${r.pathogenOrCause || ''}`
            .toLowerCase()
            .includes(q)
        ) {
          return false;
        }
        return true;
      });

      res.json(filtered);
    } catch (error) {
      console.error('Fetch knowledge error:', error);
      res.status(500).json({ error: 'Failed to load agricultural knowledge base.' });
    }
  });

  app.post(
    '/api/knowledge',
    requireAuth,
    requireRole('admin', 'expert'),
    async (req: AuthRequest, res: Response) => {
      try {
        if (req.authUser!.role === 'expert') {
          const [expProf] = await db
            .select()
            .from(expertProfiles)
            .where(eq(expertProfiles.userId, req.authUser!.id))
            .limit(1);
          if (!expProf || expProf.verificationStatus !== 'verified') {
            return res.status(403).json({
              error:
                'Only verified agricultural experts or administrators can publish knowledge records.',
            });
          }
        }

        const {
          cropName,
          varietyInfo,
          problemType,
          title,
          titleKn,
          pathogenOrCause,
          symptoms,
          environmentalFactors,
          verifiedRecommendations,
          referenceSource,
        } = req.body ?? {};

        if (
          !cropName ||
          !problemType ||
          !title ||
          !symptoms ||
          !verifiedRecommendations ||
          !referenceSource
        ) {
          return res.status(400).json({
            error:
              'Crop name, problem type, title, symptoms, verified recommendations, and traceable reference source are required.',
          });
        }

        const [matchedCrop] = await db
          .select()
          .from(crops)
          .where(eq(crops.name, String(cropName)))
          .limit(1);

        const [created] = await db
          .insert(agriculturalKnowledge)
          .values({
            cropId: matchedCrop?.id ?? null,
            cropName: String(cropName).trim(),
            varietyInfo: varietyInfo ? String(varietyInfo).trim() : null,
            problemType: String(problemType).trim(),
            title: String(title).trim(),
            titleKn: titleKn ? String(titleKn).trim() : null,
            pathogenOrCause: pathogenOrCause ? String(pathogenOrCause).trim() : null,
            symptoms: String(symptoms).trim(),
            environmentalFactors: environmentalFactors
              ? String(environmentalFactors).trim()
              : 'Refer to regional climate conditions.',
            verifiedRecommendations: String(verifiedRecommendations).trim(),
            referenceSource: String(referenceSource).trim(),
            reviewedByExpertId: req.authUser!.id,
            reviewedByExpertName: req.authUser!.fullName,
            lastReviewedDate: new Date().toISOString().slice(0, 10),
            isPublished: true,
          })
          .returning();

        res.status(201).json(created);
      } catch (error) {
        console.error('Create knowledge error:', error);
        res.status(500).json({ error: 'Failed to save knowledge record.' });
      }
    }
  );

  app.delete(
    '/api/knowledge/:id',
    requireAuth,
    requireRole('admin', 'expert'),
    async (req: AuthRequest, res: Response) => {
      try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
          return res.status(400).json({ error: 'Invalid knowledge record ID.' });
        }
        if (req.authUser!.role === 'expert') {
          const [expProf] = await db
            .select()
            .from(expertProfiles)
            .where(eq(expertProfiles.userId, req.authUser!.id))
            .limit(1);
          if (!expProf || expProf.verificationStatus !== 'verified') {
            return res.status(403).json({
              error: 'Only verified experts or administrators can remove records.',
            });
          }
        }
        await db
          .delete(agriculturalKnowledge)
          .where(eq(agriculturalKnowledge.id, id));
        res.json({ deleted: true });
      } catch (error) {
        console.error('Delete knowledge error:', error);
        res.status(500).json({ error: 'Failed to delete knowledge record.' });
      }
    }
  );

  // ---------------------------------------------------------------------------
  // CROP CASES & AI DIAGNOSIS
  // ---------------------------------------------------------------------------
  app.get('/api/cases', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = req.authUser!;
      let caseRows: Array<typeof cropCases.$inferSelect> = [];

      if (user.role === 'farmer') {
        caseRows = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.farmerId, user.id))
          .orderBy(desc(cropCases.updatedAt));
      } else if (user.role === 'expert') {
        caseRows = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.assignedExpertId, user.id))
          .orderBy(desc(cropCases.updatedAt));
      } else {
        caseRows = await db
          .select()
          .from(cropCases)
          .orderBy(desc(cropCases.updatedAt));
      }

      const hydrated = await hydrateCases(caseRows);
      res.json(hydrated);
    } catch (error) {
      console.error('List cases error:', error);
      res.status(500).json({ error: 'Failed to load crop cases.' });
    }
  });

  app.get('/api/cases/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const caseId = Number(req.params.id);
      if (!Number.isInteger(caseId)) {
        return res.status(400).json({ error: 'Invalid case ID.' });
      }

      const [c] = await db
        .select()
        .from(cropCases)
        .where(eq(cropCases.id, caseId))
        .limit(1);

      if (!c) {
        return res.status(404).json({ error: 'Crop case not found.' });
      }

      const user = req.authUser!;
      const allowed =
        user.role === 'admin' ||
        (user.role === 'farmer' && c.farmerId === user.id) ||
        (user.role === 'expert' && c.assignedExpertId === user.id);

      if (!allowed) {
        return res.status(403).json({ error: 'You do not have permission to view this case.' });
      }

      const [hydrated] = await hydrateCases([c]);
      res.json(hydrated);
    } catch (error) {
      console.error('Get case error:', error);
      res.status(500).json({ error: 'Failed to load case details.' });
    }
  });

  app.post(
    '/api/cases',
    requireAuth,
    requireRole('farmer', 'admin'),
    async (req: AuthRequest, res: Response) => {
      try {
        const {
          cropId,
          cropName,
          cropVariety,
          growthStage,
          symptoms,
          location,
          symptomOnsetDate,
          additionalObservations,
          urgency,
          images,
        } = req.body ?? {};

        if (
          !cropName ||
          !growthStage ||
          !symptoms ||
          !location ||
          !symptomOnsetDate
        ) {
          return res.status(400).json({
            error:
              'Crop name, growth stage, visible symptoms, farming location, and symptom onset date are required.',
          });
        }

        const validatedImages: Array<{
          fileName: string;
          mimeType: string;
          fileSizeBytes: number;
          imageData: string;
          caption?: string;
        }> = [];

        if (Array.isArray(images)) {
          if (images.length > 4) {
            return res
              .status(400)
              .json({ error: 'Maximum 4 crop images allowed per submission.' });
          }
          for (const img of images) {
            if (!img?.imageData || !img?.mimeType || !img?.fileName) continue;
            if (!ALLOWED_IMAGE_MIME.has(String(img.mimeType).toLowerCase())) {
              return res.status(400).json({
                error: 'Only JPEG, PNG, or WebP crop images are supported.',
              });
            }
            const size = Number(img.fileSizeBytes) || Buffer.byteLength(String(img.imageData), 'utf8');
            if (size > MAX_IMAGE_BYTES) {
              return res.status(400).json({
                error: `Image "${img.fileName}" exceeds the 5MB upload limit.`,
              });
            }
            validatedImages.push({
              fileName: String(img.fileName).slice(0, 120),
              mimeType: String(img.mimeType),
              fileSizeBytes: size,
              imageData: String(img.imageData),
              caption: img.caption ? String(img.caption).slice(0, 240) : undefined,
            });
          }
        }

        const caseCode = `AT-${new Date().getFullYear()}-${Math.floor(
          1000 + Math.random() * 9000
        )}`;

        // 1. Create initial case as Submitted
        const [newCase] = await db
          .insert(cropCases)
          .values({
            caseCode,
            farmerId: req.authUser!.id,
            cropId: cropId ? Number(cropId) : null,
            cropName: String(cropName).trim(),
            cropVariety: cropVariety ? String(cropVariety).trim() : null,
            growthStage: String(growthStage).trim(),
            symptoms: String(symptoms).trim(),
            location: String(location).trim(),
            symptomOnsetDate: String(symptomOnsetDate).trim(),
            additionalObservations: additionalObservations
              ? String(additionalObservations).trim()
              : null,
            status: 'Submitted',
            urgency:
              urgency === 'High' || urgency === 'Low' ? urgency : 'Normal',
            isDemo: req.authUser!.isDemo,
          })
          .returning();

        // 2. Store validated uploaded images
        if (validatedImages.length > 0) {
          await db.insert(uploadedImages).values(
            validatedImages.map((img) => ({
              caseId: newCase.id,
              uploadedByUserId: req.authUser!.id,
              fileName: img.fileName,
              mimeType: img.mimeType,
              fileSizeBytes: img.fileSizeBytes,
              imageData: img.imageData,
              caption: img.caption || null,
              isFollowUp: false,
            }))
          );
        }

        await db.insert(caseHistory).values({
          caseId: newCase.id,
          actorUserId: req.authUser!.id,
          actorRole: req.authUser!.role,
          actorName: req.authUser!.fullName,
          actionType: 'CASE_SUBMITTED',
          previousStatus: null,
          newStatus: 'Submitted',
          details: `Farmer submitted ${newCase.cropName} case with ${validatedImages.length} image(s).`,
        });

        // 3. Transition to AI Analysis in Progress
        await db
          .update(cropCases)
          .set({ status: 'AI Analysis in Progress', updatedAt: new Date() })
          .where(eq(cropCases.id, newCase.id));

        const aiResult = await runPreliminaryAIAnalysis({
          cropName: newCase.cropName,
          cropVariety: newCase.cropVariety,
          growthStage: newCase.growthStage,
          symptoms: newCase.symptoms,
          location: newCase.location,
          symptomOnsetDate: newCase.symptomOnsetDate,
          additionalObservations: newCase.additionalObservations,
          images: validatedImages,
        });

        await db.insert(aiAnalysis).values({
          caseId: newCase.id,
          modelLabel: aiResult.modelLabel,
          isMock: aiResult.isMock,
          possibleDiagnosis: aiResult.possibleDiagnosis,
          category: aiResult.category,
          alternativeCauses: JSON.stringify(aiResult.alternativeCauses),
          observedSymptoms: JSON.stringify(aiResult.observedSymptoms),
          supportingEvidence: JSON.stringify(aiResult.supportingEvidence),
          confidenceLevel: aiResult.confidenceLevel,
          confidenceScore: aiResult.confidenceScore,
          uncertaintyStatement: aiResult.uncertaintyStatement,
          missingInformation: JSON.stringify(aiResult.missingInformation),
          expertReportSummary: aiResult.expertReportSummary,
          disclaimer: aiResult.disclaimer,
        });

        // 4. Find an available verified expert (never assign unverified experts)
        const verifiedExperts = await db
          .select({
            userId: expertProfiles.userId,
            fullName: users.fullName,
          })
          .from(expertProfiles)
          .innerJoin(users, eq(expertProfiles.userId, users.id))
          .where(
            and(
              eq(expertProfiles.verificationStatus, 'verified'),
              eq(users.isActive, true)
            )
          )
          .limit(1);

        const assignedExpert = verifiedExperts[0] ?? null;

        await db
          .update(cropCases)
          .set({
            status: 'Awaiting Expert Review',
            assignedExpertId: assignedExpert ? assignedExpert.userId : null,
            updatedAt: new Date(),
          })
          .where(eq(cropCases.id, newCase.id));

        await db.insert(caseHistory).values({
          caseId: newCase.id,
          actorUserId: null,
          actorRole: 'system',
          actorName: aiResult.isMock
            ? 'Demonstration Mock AI Analyzer'
            : 'AgriTrust Preliminary AI',
          actionType: 'AI_ANALYSIS_GENERATED',
          previousStatus: 'AI Analysis in Progress',
          newStatus: 'Awaiting Expert Review',
          details: `Preliminary AI report recorded (${aiResult.possibleDiagnosis}; ${aiResult.confidenceScore}% preliminary estimate). ${
            assignedExpert
              ? `Routed to verified expert ${assignedExpert.fullName}.`
              : 'Queued awaiting available verified expert assignment.'
          }`,
        });

        if (assignedExpert) {
          await db.insert(notifications).values({
            userId: assignedExpert.userId,
            caseId: newCase.id,
            title: `New Case Assigned (${newCase.caseCode})`,
            message: `${newCase.cropName} (${newCase.growthStage}) submitted from ${newCase.location}. Preliminary AI analysis ready for verification.`,
            type: 'case_update',
          });
        }

        await db.insert(notifications).values({
          userId: req.authUser!.id,
          caseId: newCase.id,
          title: `Preliminary Report Ready (${newCase.caseCode})`,
          message: assignedExpert
            ? `Your ${newCase.cropName} case is now awaiting review by ${assignedExpert.fullName}.`
            : `Your ${newCase.cropName} case is queued awaiting expert assignment.`,
          type: 'case_update',
        });

        const [finalCase] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, newCase.id))
          .limit(1);

        const [hydrated] = await hydrateCases([finalCase]);
        res.status(201).json(hydrated);
      } catch (error) {
        console.error('Create case error:', error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to submit crop diagnosis case.',
        });
      }
    }
  );

  app.post(
    '/api/cases/:id/images',
    requireAuth,
    requireRole('farmer'),
    async (req: AuthRequest, res: Response) => {
      try {
        const caseId = Number(req.params.id);
        const [c] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);

        if (!c || c.farmerId !== req.authUser!.id) {
          return res.status(403).json({ error: 'Access denied for this case.' });
        }

        const { fileName, mimeType, fileSizeBytes, imageData, caption } =
          req.body ?? {};
        if (!fileName || !mimeType || !imageData) {
          return res.status(400).json({ error: 'Valid image data is required.' });
        }
        if (!ALLOWED_IMAGE_MIME.has(String(mimeType).toLowerCase())) {
          return res
            .status(400)
            .json({ error: 'Only JPEG, PNG, or WebP images are supported.' });
        }
        const size = Number(fileSizeBytes) || Buffer.byteLength(String(imageData), 'utf8');
        if (size > MAX_IMAGE_BYTES) {
          return res
            .status(400)
            .json({ error: 'Image exceeds the 5MB file size limit.' });
        }

        const [insertedImg] = await db
          .insert(uploadedImages)
          .values({
            caseId,
            uploadedByUserId: req.authUser!.id,
            fileName: String(fileName).slice(0, 120),
            mimeType: String(mimeType),
            fileSizeBytes: size,
            imageData: String(imageData),
            caption: caption ? String(caption).slice(0, 240) : 'Follow-up field image',
            isFollowUp: true,
          })
          .returning();

        const nextStatus =
          c.status === 'Additional Information Required'
            ? 'Under Expert Review'
            : c.status;

        await db
          .update(cropCases)
          .set({ status: nextStatus, updatedAt: new Date() })
          .where(eq(cropCases.id, caseId));

        await db.insert(caseHistory).values({
          caseId,
          actorUserId: req.authUser!.id,
          actorRole: 'farmer',
          actorName: req.authUser!.fullName,
          actionType: 'FOLLOW_UP_IMAGE_UPLOADED',
          previousStatus: c.status,
          newStatus: nextStatus,
          details: `Farmer uploaded follow-up image "${insertedImg.fileName}".`,
        });

        if (c.assignedExpertId) {
          await db.insert(notifications).values({
            userId: c.assignedExpertId,
            caseId,
            title: `Follow-up Photo Uploaded (${c.caseCode})`,
            message: `${req.authUser!.fullName} added a new follow-up image for ${c.cropName}.`,
            type: 'case_update',
          });
        }

        res.status(201).json(insertedImg);
      } catch (error) {
        console.error('Upload follow-up image error:', error);
        res.status(500).json({ error: 'Failed to upload follow-up image.' });
      }
    }
  );

  app.post(
    '/api/cases/:id/messages',
    requireAuth,
    requireRole('farmer', 'expert'),
    async (req: AuthRequest, res: Response) => {
      try {
        const caseId = Number(req.params.id);
        const { message } = req.body ?? {};
        if (!message || String(message).trim().length < 2) {
          return res.status(400).json({ error: 'Message cannot be empty.' });
        }

        const [c] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);
        if (!c) return res.status(404).json({ error: 'Case not found.' });

        const user = req.authUser!;
        const allowed =
          (user.role === 'farmer' && c.farmerId === user.id) ||
          (user.role === 'expert' && c.assignedExpertId === user.id);
        if (!allowed) {
          return res.status(403).json({ error: 'Access denied for this consultation.' });
        }

        const [createdMsg] = await db
          .insert(caseMessages)
          .values({
            caseId,
            senderUserId: user.id,
            senderRole: user.role,
            senderName: user.fullName,
            message: String(message).trim(),
          })
          .returning();

        const nextStatus =
          user.role === 'farmer' && c.status === 'Additional Information Required'
            ? 'Under Expert Review'
            : c.status;

        if (nextStatus !== c.status) {
          await db
            .update(cropCases)
            .set({ status: nextStatus, updatedAt: new Date() })
            .where(eq(cropCases.id, caseId));
        }

        await db.insert(caseHistory).values({
          caseId,
          actorUserId: user.id,
          actorRole: user.role,
          actorName: user.fullName,
          actionType: 'FOLLOW_UP_MESSAGE',
          previousStatus: c.status,
          newStatus: nextStatus,
          details: `${user.role === 'farmer' ? 'Farmer' : 'Expert'} posted a consultation message.`,
        });

        const recipientId =
          user.role === 'farmer' ? c.assignedExpertId : c.farmerId;
        if (recipientId) {
          await db.insert(notifications).values({
            userId: recipientId,
            caseId,
            title: `New Consultation Message (${c.caseCode})`,
            message: `${user.fullName}: "${String(message).trim().slice(0, 90)}"`,
            type: 'case_update',
          });
        }

        res.status(201).json(createdMsg);
      } catch (error) {
        console.error('Post message error:', error);
        res.status(500).json({ error: 'Failed to post message.' });
      }
    }
  );

  app.post(
    '/api/cases/:id/feedback',
    requireAuth,
    requireRole('farmer'),
    async (req: AuthRequest, res: Response) => {
      try {
        const caseId = Number(req.params.id);
        const { rating, helpfulness, outcomeReported, comments } = req.body ?? {};
        const numericRating = Number(rating);

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
          return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        const [c] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);

        if (!c || c.farmerId !== req.authUser!.id) {
          return res.status(403).json({ error: 'Access denied.' });
        }

        const [fb] = await db
          .insert(farmerFeedback)
          .values({
            caseId,
            farmerId: req.authUser!.id,
            rating: numericRating,
            helpfulness: helpfulness ? String(helpfulness) : 'Helpful',
            outcomeReported: outcomeReported ? String(outcomeReported).trim() : null,
            comments: comments ? String(comments).trim() : null,
          })
          .returning();

        res.status(201).json(fb);
      } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'Failed to submit feedback.' });
      }
    }
  );

  // ---------------------------------------------------------------------------
  // EXPERT VERIFICATION WORKFLOW
  // ---------------------------------------------------------------------------
  app.post(
    '/api/cases/:id/review',
    requireAuth,
    requireRole('expert'),
    async (req: AuthRequest, res: Response) => {
      try {
        const caseId = Number(req.params.id);
        const expertUser = req.authUser!;

        // Verify expert credentials are verified by an administrator
        const [expProfile] = await db
          .select()
          .from(expertProfiles)
          .where(eq(expertProfiles.userId, expertUser.id))
          .limit(1);

        if (!expProfile || expProfile.verificationStatus !== 'verified') {
          return res.status(403).json({
            error:
              'Only verified agricultural experts are permitted to approve or submit official crop guidance.',
          });
        }

        const creds = await db
          .select()
          .from(expertCredentials)
          .where(eq(expertCredentials.expertProfileId, expProfile.id));

        const qualSnapshot =
          creds.length > 0
            ? `${creds[0].degreeOrCertification} (${creds[0].issuingAuthority}) · Reg: ${creds[0].licenseOrRegistrationNo}`
            : `${expProfile.title || 'Agronomist'} · ${expProfile.specialization}`;

        const [c] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);

        if (!c) {
          return res.status(404).json({ error: 'Crop case not found.' });
        }
        if (c.assignedExpertId !== expertUser.id) {
          return res.status(403).json({
            error: 'This case is not assigned to you.',
          });
        }

        const {
          decision,
          verifiedDiagnosis,
          reviewNotes,
          aiEvaluationNotes,
          requestedInfoDetails,
          recommendation,
        } = req.body ?? {};

        const allowedDecisions = new Set([
          'Approved',
          'Corrected',
          'Rejected',
          'InfoRequested',
        ]);
        if (!allowedDecisions.has(decision)) {
          return res.status(400).json({ error: 'Invalid review decision.' });
        }
        if (!reviewNotes || String(reviewNotes).trim().length < 10) {
          return res.status(400).json({
            error: 'Please provide clear expert review notes (at least 10 characters).',
          });
        }

        let newStatus = 'Expert Verified';
        if (decision === 'InfoRequested') {
          newStatus = 'Additional Information Required';
          if (!requestedInfoDetails || String(requestedInfoDetails).trim().length < 5) {
            return res.status(400).json({
              error: 'Please specify what additional information or images the farmer should provide.',
            });
          }
        } else if (decision === 'Rejected') {
          if (!verifiedDiagnosis || String(verifiedDiagnosis).trim().length < 3) {
            newStatus = 'Reassessment Required';
          } else {
            newStatus = recommendation?.culturalPractices
              ? 'Expert Verified'
              : 'Reassessment Required';
          }
        }

        const hasGuidance =
          decision === 'Approved' ||
          decision === 'Corrected' ||
          (decision === 'Rejected' && recommendation?.culturalPractices);

        if (
          hasGuidance &&
          (!recommendation?.culturalPractices ||
            !recommendation?.organicOrBiologicalOptions ||
            !recommendation?.preventiveMeasures ||
            !recommendation?.followUpTimeline ||
            !recommendation?.referenceSource)
        ) {
          return res.status(400).json({
            error:
              'Verified recommendations must include cultural practices, organic/biological options, preventive measures, follow-up timeline, and reference source.',
          });
        }

        const [review] = await db
          .insert(expertReviews)
          .values({
            caseId,
            expertId: expertUser.id,
            expertNameSnapshot: expertUser.fullName,
            expertQualificationsSnapshot: qualSnapshot,
            decision,
            verifiedDiagnosis:
              verifiedDiagnosis && String(verifiedDiagnosis).trim()
                ? String(verifiedDiagnosis).trim()
                : decision === 'InfoRequested'
                  ? 'Pending Additional Farmer Information'
                  : 'Reassessment Required',
            reviewNotes: String(reviewNotes).trim(),
            aiEvaluationNotes: aiEvaluationNotes
              ? String(aiEvaluationNotes).trim()
              : null,
            requestedInfoDetails: requestedInfoDetails
              ? String(requestedInfoDetails).trim()
              : null,
          })
          .returning();

        if (hasGuidance && recommendation) {
          await db.insert(recommendations).values({
            caseId,
            expertReviewId: review.id,
            approvedByExpertId: expertUser.id,
            culturalPractices: String(recommendation.culturalPractices).trim(),
            organicOrBiologicalOptions: String(
              recommendation.organicOrBiologicalOptions
            ).trim(),
            preventiveMeasures: String(recommendation.preventiveMeasures).trim(),
            safeChemicalGuidance: recommendation.safeChemicalGuidance
              ? String(recommendation.safeChemicalGuidance).trim()
              : null,
            followUpTimeline: String(recommendation.followUpTimeline).trim(),
            referenceSource: String(recommendation.referenceSource).trim(),
            isPublishedToFarmer: true,
          });
        }

        await db
          .update(cropCases)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(cropCases.id, caseId));

        await db.insert(caseHistory).values({
          caseId,
          actorUserId: expertUser.id,
          actorRole: 'expert',
          actorName: expertUser.fullName,
          actionType: 'EXPERT_REVIEW_SUBMITTED',
          previousStatus: c.status,
          newStatus,
          details: `Expert decision: ${decision}. Diagnosis: ${review.verifiedDiagnosis}.`,
        });

        await db.insert(notifications).values({
          userId: c.farmerId,
          caseId,
          title:
            decision === 'InfoRequested'
              ? `Additional Information Requested (${c.caseCode})`
              : `Expert Review Completed (${c.caseCode})`,
          message:
            decision === 'InfoRequested'
              ? `${expertUser.fullName} requested more details for your ${c.cropName} case.`
              : `${expertUser.fullName} reviewed your ${c.cropName} case (${decision}) and updated your guidance.`,
          type: decision === 'InfoRequested' ? 'info_request' : 'expert_review',
        });

        const [updatedCase] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);
        const [hydrated] = await hydrateCases([updatedCase]);
        res.status(201).json(hydrated);
      } catch (error) {
        console.error('Submit expert review error:', error);
        res.status(500).json({ error: 'Failed to submit expert verification.' });
      }
    }
  );

  app.patch(
    '/api/cases/:id/status',
    requireAuth,
    requireRole('expert', 'admin'),
    async (req: AuthRequest, res: Response) => {
      try {
        const caseId = Number(req.params.id);
        const { status, note } = req.body ?? {};
        if (!ALLOWED_CASE_STATUSES.has(status)) {
          return res.status(400).json({ error: 'Invalid case status.' });
        }

        const [c] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);
        if (!c) return res.status(404).json({ error: 'Case not found.' });

        if (
          req.authUser!.role === 'expert' &&
          c.assignedExpertId !== req.authUser!.id
        ) {
          return res.status(403).json({ error: 'Case is not assigned to you.' });
        }

        await db
          .update(cropCases)
          .set({ status, updatedAt: new Date() })
          .where(eq(cropCases.id, caseId));

        await db.insert(caseHistory).values({
          caseId,
          actorUserId: req.authUser!.id,
          actorRole: req.authUser!.role,
          actorName: req.authUser!.fullName,
          actionType: 'STATUS_CHANGED',
          previousStatus: c.status,
          newStatus: status,
          details: note
            ? String(note).trim()
            : `Case status updated from "${c.status}" to "${status}".`,
        });

        const [updated] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);
        const [hydrated] = await hydrateCases([updated]);
        res.json(hydrated);
      } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update case status.' });
      }
    }
  );

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------
  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, req.authUser!.id))
        .orderBy(desc(notifications.createdAt));
      res.json(rows);
    } catch (error) {
      console.error('Fetch notifications error:', error);
      res.status(500).json({ error: 'Failed to load notifications.' });
    }
  });

  app.patch('/api/notifications/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, req.authUser!.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Read all notifications error:', error);
      res.status(500).json({ error: 'Failed to update notifications.' });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const id = Number(req.params.id);
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(eq(notifications.id, id), eq(notifications.userId, req.authUser!.id))
        );
      res.json({ success: true });
    } catch (error) {
      console.error('Read notification error:', error);
      res.status(500).json({ error: 'Failed to update notification.' });
    }
  });

  // ---------------------------------------------------------------------------
  // ADMIN MANAGEMENT & ANALYTICS
  // ---------------------------------------------------------------------------
  app.get(
    '/api/admin/overview',
    requireAuth,
    requireRole('admin'),
    async (_req: AuthRequest, res: Response) => {
      try {
        const [
          allUsers,
          allExpertProfiles,
          allCases,
          allReviews,
          allFeedback,
          allKnowledge,
        ] = await Promise.all([
          db.select().from(users),
          db.select().from(expertProfiles),
          db.select().from(cropCases),
          db.select().from(expertReviews),
          db.select().from(farmerFeedback),
          db.select().from(agriculturalKnowledge),
        ]);

        const statusBreakdown: Record<string, number> = {};
        for (const c of allCases) {
          statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1;
        }

        const decisionBreakdown: Record<string, number> = {
          Approved: 0,
          Corrected: 0,
          Rejected: 0,
          InfoRequested: 0,
        };
        for (const r of allReviews) {
          decisionBreakdown[r.decision] =
            (decisionBreakdown[r.decision] || 0) + 1;
        }

        const avgRating =
          allFeedback.length > 0
            ? Number(
                (
                  allFeedback.reduce((acc, f) => acc + f.rating, 0) /
                  allFeedback.length
                ).toFixed(1)
              )
            : null;

        res.json({
          totalFarmers: allUsers.filter((u) => u.role === 'farmer').length,
          totalExperts: allUsers.filter((u) => u.role === 'expert').length,
          verifiedExperts: allExpertProfiles.filter(
            (e) => e.verificationStatus === 'verified'
          ).length,
          pendingExperts: allExpertProfiles.filter(
            (e) => e.verificationStatus === 'pending'
          ).length,
          totalCases: allCases.length,
          knowledgeCount: allKnowledge.length,
          statusBreakdown,
          decisionBreakdown,
          averageFeedbackRating: avgRating,
          feedbackCount: allFeedback.length,
          recentFeedback: allFeedback.slice(0, 10),
        });
      } catch (error) {
        console.error('Admin overview error:', error);
        res.status(500).json({ error: 'Failed to load admin analytics.' });
      }
    }
  );

  app.get(
    '/api/admin/users',
    requireAuth,
    requireRole('admin'),
    async (_req: AuthRequest, res: Response) => {
      try {
        const [allUsers, allFarmerProfs, allExpertProfs, allCreds] =
          await Promise.all([
            db.select().from(users).orderBy(desc(users.createdAt)),
            db.select().from(farmerProfiles),
            db.select().from(expertProfiles),
            db.select().from(expertCredentials),
          ]);

        const result = allUsers.map((u) => {
          const { passwordHash: _ph, ...safe } = u;
          const farmerProfile =
            allFarmerProfs.find((f) => f.userId === u.id) ?? null;
          const expProfile =
            allExpertProfs.find((e) => e.userId === u.id) ?? null;
          const credentials = expProfile
            ? allCreds.filter((cr) => cr.expertProfileId === expProfile.id)
            : [];
          return {
            ...safe,
            farmerProfile,
            expertProfile: expProfile ? { ...expProfile, credentials } : null,
          };
        });

        res.json(result);
      } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to load user directory.' });
      }
    }
  );

  app.patch(
    '/api/admin/users/:id/status',
    requireAuth,
    requireRole('admin'),
    async (req: AuthRequest, res: Response) => {
      try {
        const targetId = Number(req.params.id);
        const { isActive } = req.body ?? {};
        if (targetId === req.authUser!.id) {
          return res
            .status(400)
            .json({ error: 'Administrators cannot deactivate their own account.' });
        }
        const [updated] = await db
          .update(users)
          .set({ isActive: Boolean(isActive), updatedAt: new Date() })
          .where(eq(users.id, targetId))
          .returning();
        if (!updated) return res.status(404).json({ error: 'User not found.' });
        res.json({ id: updated.id, isActive: updated.isActive });
      } catch (error) {
        console.error('Toggle user active error:', error);
        res.status(500).json({ error: 'Failed to update user status.' });
      }
    }
  );

  app.patch(
    '/api/admin/experts/:profileId/verify',
    requireAuth,
    requireRole('admin'),
    async (req: AuthRequest, res: Response) => {
      try {
        const profileId = Number(req.params.profileId);
        const { decision, reviewedNotes } = req.body ?? {};
        if (decision !== 'verified' && decision !== 'rejected') {
          return res
            .status(400)
            .json({ error: 'Decision must be "verified" or "rejected".' });
        }

        const [updated] = await db
          .update(expertProfiles)
          .set({
            verificationStatus: decision,
            verifiedByAdminId: req.authUser!.id,
            verifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(expertProfiles.id, profileId))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: 'Expert profile not found.' });
        }

        await db
          .update(expertCredentials)
          .set({
            verified: decision === 'verified',
            reviewedNotes: reviewedNotes
              ? String(reviewedNotes).trim()
              : `Credential ${decision} by administrator ${req.authUser!.fullName}.`,
          })
          .where(eq(expertCredentials.expertProfileId, profileId));

        await db.insert(notifications).values({
          userId: updated.userId,
          title:
            decision === 'verified'
              ? 'Expert Credentials Verified'
              : 'Expert Application Update',
          message:
            decision === 'verified'
              ? 'Your agricultural credentials have been verified. You can now review assigned cases and publish recommendations.'
              : `Your expert credential review was declined. Notes: ${reviewedNotes || 'Please contact administration.'}`,
          type: 'verification',
        });

        res.json(updated);
      } catch (error) {
        console.error('Verify expert error:', error);
        res.status(500).json({ error: 'Failed to update expert verification status.' });
      }
    }
  );

  app.patch(
    '/api/admin/cases/:id/assign',
    requireAuth,
    requireRole('admin'),
    async (req: AuthRequest, res: Response) => {
      try {
        const caseId = Number(req.params.id);
        const { expertUserId } = req.body ?? {};
        const targetExpertId = Number(expertUserId);

        const [expProfile] = await db
          .select({
            profile: expertProfiles,
            user: users,
          })
          .from(expertProfiles)
          .innerJoin(users, eq(expertProfiles.userId, users.id))
          .where(eq(expertProfiles.userId, targetExpertId))
          .limit(1);

        if (!expProfile || expProfile.profile.verificationStatus !== 'verified') {
          return res.status(400).json({
            error: 'Cases can only be assigned to credential-verified experts.',
          });
        }

        const [c] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);
        if (!c) return res.status(404).json({ error: 'Case not found.' });

        await db
          .update(cropCases)
          .set({
            assignedExpertId: targetExpertId,
            status:
              c.status === 'Submitted' ? 'Awaiting Expert Review' : c.status,
            updatedAt: new Date(),
          })
          .where(eq(cropCases.id, caseId));

        await db.insert(caseHistory).values({
          caseId,
          actorUserId: req.authUser!.id,
          actorRole: 'admin',
          actorName: req.authUser!.fullName,
          actionType: 'EXPERT_ASSIGNED',
          previousStatus: c.status,
          newStatus:
            c.status === 'Submitted' ? 'Awaiting Expert Review' : c.status,
          details: `Administrator assigned case to verified specialist ${expProfile.user.fullName}.`,
        });

        await db.insert(notifications).values({
          userId: targetExpertId,
          caseId,
          title: `Case Assigned by Admin (${c.caseCode})`,
          message: `You have been assigned ${c.cropName} case from ${c.location}.`,
          type: 'case_update',
        });

        const [updated] = await db
          .select()
          .from(cropCases)
          .where(eq(cropCases.id, caseId))
          .limit(1);
        const [hydrated] = await hydrateCases([updated]);
        res.json(hydrated);
      } catch (error) {
        console.error('Assign case error:', error);
        res.status(500).json({ error: 'Failed to assign case.' });
      }
    }
  );

  app.post(
    '/api/admin/crops',
    requireAuth,
    requireRole('admin'),
    async (req: AuthRequest, res: Response) => {
      try {
        const { name, nameKn, category, commonVarieties, growthStages } =
          req.body ?? {};
        if (!name || !nameKn || !category) {
          return res
            .status(400)
            .json({ error: 'Crop name, Kannada name, and category are required.' });
        }
        const [created] = await db
          .insert(crops)
          .values({
            name: String(name).trim(),
            nameKn: String(nameKn).trim(),
            category: String(category).trim(),
            commonVarieties: JSON.stringify(
              Array.isArray(commonVarieties)
                ? commonVarieties
                : String(commonVarieties || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
            ),
            growthStages: JSON.stringify(
              Array.isArray(growthStages)
                ? growthStages
                : ['Seedling', 'Vegetative', 'Flowering', 'Fruiting / Maturity']
            ),
            isActive: true,
          })
          .returning();
        res.status(201).json({
          ...created,
          commonVarieties: safeJsonParse(created.commonVarieties, []),
          growthStages: safeJsonParse(created.growthStages, []),
        });
      } catch (error) {
        console.error('Create crop error:', error);
        res.status(500).json({ error: 'Failed to add crop.' });
      }
    }
  );

  app.patch(
    '/api/admin/crops/:id',
    requireAuth,
    requireRole('admin'),
    async (req: AuthRequest, res: Response) => {
      try {
        const id = Number(req.params.id);
        const { isActive } = req.body ?? {};
        const [updated] = await db
          .update(crops)
          .set({ isActive: Boolean(isActive) })
          .where(eq(crops.id, id))
          .returning();
        if (!updated) return res.status(404).json({ error: 'Crop not found.' });
        res.json({
          ...updated,
          commonVarieties: safeJsonParse(updated.commonVarieties, []),
          growthStages: safeJsonParse(updated.growthStages, []),
        });
      } catch (error) {
        console.error('Update crop error:', error);
        res.status(500).json({ error: 'Failed to update crop.' });
      }
    }
  );

  // ---------------------------------------------------------------------------
  // VITE / STATIC SPA SERVING
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgriTrust AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
