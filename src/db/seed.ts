import { count, eq } from 'drizzle-orm';
import { db } from './index.ts';
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
} from './schema.ts';
import { hashPassword } from '../lib/auth-crypto.ts';

let seedPromise: Promise<void> | null = null;

async function runSeed() {
  const [{ total }] = await db.select({ total: count() }).from(users);
  if (total > 0) {
    return;
  }

  console.log('Seeding AgriTrust AI demonstration dataset into PostgreSQL...');

  // 1. Demo Users
  const [farmerUser] = await db
    .insert(users)
    .values({
      uid: 'demo-farmer-001',
      email: 'farmer.demo@agritrust.example',
      passwordHash: hashPassword('FarmerDemo@2026'),
      fullName: 'Ramesh Gowda (Demo Farmer)',
      phone: '+91 98450 11223',
      role: 'farmer',
      preferredLanguage: 'en',
      isActive: true,
      isDemo: true,
      consentAccepted: true,
    })
    .returning();

  const [expertUser] = await db
    .insert(users)
    .values({
      uid: 'demo-expert-001',
      email: 'expert.demo@agritrust.example',
      passwordHash: hashPassword('ExpertDemo@2026'),
      fullName: 'Dr. Kavitha Rao (Demo Verified Expert)',
      phone: '+91 98450 33445',
      role: 'expert',
      preferredLanguage: 'en',
      isActive: true,
      isDemo: true,
      consentAccepted: true,
    })
    .returning();

  const [pendingExpertUser] = await db
    .insert(users)
    .values({
      uid: 'demo-expert-pending-002',
      email: 'arjun.agronomy@agritrust.example',
      passwordHash: hashPassword('ExpertPending@2026'),
      fullName: 'Dr. Arjun Patil (Pending Verification)',
      phone: '+91 98450 77889',
      role: 'expert',
      preferredLanguage: 'kn',
      isActive: true,
      isDemo: true,
      consentAccepted: true,
    })
    .returning();

  const [adminUser] = await db
    .insert(users)
    .values({
      uid: 'demo-admin-001',
      email: 'admin.demo@agritrust.example',
      passwordHash: hashPassword('AdminDemo@2026'),
      fullName: 'Meera Deshmukh (Demo Admin)',
      phone: '+91 98450 55667',
      role: 'admin',
      preferredLanguage: 'en',
      isActive: true,
      isDemo: true,
      consentAccepted: true,
    })
    .returning();

  // 2. Farmer & Expert Profiles + Credentials
  await db.insert(farmerProfiles).values({
    userId: farmerUser.id,
    villageOrTown: 'Maddur Hobli',
    district: 'Mandya',
    state: 'Karnataka',
    farmSizeAcres: '4.5',
    primaryCrops: 'Tomato, Paddy, Maize',
    soilType: 'Red Loamy Soil',
    irrigationType: 'Drip & Canal Irrigation',
  });

  const [verifiedExpertProfile] = await db
    .insert(expertProfiles)
    .values({
      userId: expertUser.id,
      title: 'Senior Plant Pathologist',
      specialization: 'Fungal & Bacterial Crop Diseases, Solanaceae & Cereals',
      yearsExperience: 12,
      institution: 'Karnataka Regional Agronomy & Extension Centre',
      regionServed: 'Southern Karnataka (Mandya, Mysuru, Hassan)',
      languagesSpoken: 'English, Kannada',
      verificationStatus: 'verified',
      verifiedByAdminId: adminUser.id,
      verifiedAt: new Date('2026-08-15T10:00:00Z'),
      bio: 'Specializes in integrated disease management for vegetable and paddy smallholders with field diagnostics experience across KVK Mandya.',
      avatarUrl: '/src/assets/images/expert_agronomist_portrait_1794912044332.jpg',
    })
    .returning();

  await db.insert(expertCredentials).values({
    expertProfileId: verifiedExpertProfile.id,
    degreeOrCertification: 'Ph.D. in Plant Pathology',
    issuingAuthority: 'University of Agricultural Sciences, Bengaluru',
    licenseOrRegistrationNo: 'DEMO-ICAR-KVK-2014-8821',
    yearObtained: 2014,
    documentReference: 'UASB-Pathology-Cert-Verified (Sample)',
    verified: true,
    reviewedNotes: 'Demonstration credential verified by sample administrator.',
  });

  const [pendingExpertProfile] = await db
    .insert(expertProfiles)
    .values({
      userId: pendingExpertUser.id,
      title: 'Agronomy & Soil Specialist',
      specialization: 'Soil Nutrient Management & Maize Agronomy',
      yearsExperience: 6,
      institution: 'Dharwad Crop Advisory Collective',
      regionServed: 'North Karnataka (Dharwad, Belagavi)',
      languagesSpoken: 'Kannada, English',
      verificationStatus: 'pending',
      bio: 'Focuses on foliar nutrient diagnostics, soil pH balancing, and rainfed cereal resilience.',
    })
    .returning();

  await db.insert(expertCredentials).values({
    expertProfileId: pendingExpertProfile.id,
    degreeOrCertification: 'M.Sc. (Agri) in Agronomy',
    issuingAuthority: 'University of Agricultural Sciences, Dharwad',
    licenseOrRegistrationNo: 'DEMO-UASD-2020-4091',
    yearObtained: 2020,
    documentReference: 'UASD-Agronomy-Pending-Review (Sample)',
    verified: false,
    reviewedNotes: 'Awaiting administrator credential verification.',
  });

  // 3. Crops Catalog
  const insertedCrops = await db
    .insert(crops)
    .values([
      {
        name: 'Tomato',
        nameKn: 'ಟೊಮೆಟೊ',
        category: 'Vegetables',
        commonVarieties: JSON.stringify(['Arka Rakshak', 'Pusa Ruby', 'Sankranti', 'Hybrid-618']),
        growthStages: JSON.stringify(['Seedling', 'Vegetative', 'Flowering', 'Fruit Set', 'Ripening']),
      },
      {
        name: 'Paddy (Rice)',
        nameKn: 'ಭತ್ತ',
        category: 'Cereals',
        commonVarieties: JSON.stringify(['Sona Masoori', 'IR-64', 'Jaya', 'MTU-1001']),
        growthStages: JSON.stringify(['Nursery', 'Transplanting', 'Tillering', 'Panicle Initiation', 'Grain Filling']),
      },
      {
        name: 'Maize',
        nameKn: 'ಮೆಕ್ಕೆಜೋಳ',
        category: 'Cereals',
        commonVarieties: JSON.stringify(['NAH-1137', 'Ganga-11', 'Hema', 'Pioneer 3396']),
        growthStages: JSON.stringify(['Emergence', 'Vegetative (V4-V8)', 'Tasseling', 'Silking', 'Maturity']),
      },
      {
        name: 'Chilli',
        nameKn: 'ಮೆಣಸಿನಕಾಯಿ',
        category: 'Spices & Vegetables',
        commonVarieties: JSON.stringify(['Byadgi Kaddi', 'Byadgi Dabbi', 'Arka Lohit', 'Guntur Sannam']),
        growthStages: JSON.stringify(['Seedling', 'Vegetative', 'Flowering', 'Pod Development', 'Harvest']),
      },
      {
        name: 'Groundnut',
        nameKn: 'ಶೇಂಗಾ (ನೆಲಗಡಲೆ)',
        category: 'Oilseeds',
        commonVarieties: JSON.stringify(['TMV-2', 'GPBD-4', 'KRG-1']),
        growthStages: JSON.stringify(['Germination', 'Vegetative', 'Flowering & Pegging', 'Pod Filling', 'Maturity']),
      },
      {
        name: 'Finger Millet (Ragi)',
        nameKn: 'ರಾಗಿ',
        category: 'Millets',
        commonVarieties: JSON.stringify(['GPU-28', 'MR-1', 'Indaf-9']),
        growthStages: JSON.stringify(['Seedling', 'Tillering', 'Booting', 'Ear Head Emergence', 'Grain Hardening']),
      },
    ])
    .returning();

  const cropByName = new Map(insertedCrops.map((c) => [c.name, c]));

  // 4. Sample Crop Cases (3 distinct workflow states)
  const [case1] = await db
    .insert(cropCases)
    .values({
      caseCode: 'AT-2026-1001',
      farmerId: farmerUser.id,
      assignedExpertId: expertUser.id,
      cropId: cropByName.get('Tomato')?.id ?? null,
      cropName: 'Tomato',
      cropVariety: 'Arka Rakshak',
      growthStage: 'Fruit Set',
      symptoms:
        'Dark brown circular spots with concentric rings on older lower leaves, surrounded by a pale yellow halo. Gradual leaf drying moving upward.',
      location: 'Maddur Hobli, Mandya, Karnataka',
      symptomOnsetDate: '2026-11-08',
      additionalObservations:
        'Morning dew has been heavy for the past 5 days; irrigated every 3 days via drip.',
      status: 'Expert Verified',
      urgency: 'Normal',
      isDemo: true,
    })
    .returning();

  const [case2] = await db
    .insert(cropCases)
    .values({
      caseCode: 'AT-2026-1002',
      farmerId: farmerUser.id,
      assignedExpertId: expertUser.id,
      cropId: cropByName.get('Paddy (Rice)')?.id ?? null,
      cropName: 'Paddy (Rice)',
      cropVariety: 'Sona Masoori',
      growthStage: 'Tillering',
      symptoms:
        'Spindle-shaped lesions with greyish centers and reddish-brown borders appearing on mid-canopy paddy leaves across the eastern bund.',
      location: 'K.R. Nagar, Mysuru, Karnataka',
      symptomOnsetDate: '2026-11-13',
      additionalObservations:
        'Urea top-dressing applied 8 days ago; overcast sky and high humidity over the last week.',
      status: 'Awaiting Expert Review',
      urgency: 'High',
      isDemo: true,
    })
    .returning();

  const [case3] = await db
    .insert(cropCases)
    .values({
      caseCode: 'AT-2026-1003',
      farmerId: farmerUser.id,
      assignedExpertId: expertUser.id,
      cropId: cropByName.get('Maize')?.id ?? null,
      cropName: 'Maize',
      cropVariety: 'NAH-1137',
      growthStage: 'Vegetative (V4-V8)',
      symptoms:
        'Lower leaves turning pale yellow starting from the leaf tip and moving inward along the midrib in a V-shaped pattern.',
      location: 'Channarayapatna, Hassan, Karnataka',
      symptomOnsetDate: '2026-11-10',
      additionalObservations:
        'Occurred mostly in a low-lying patch of the field after recent rain.',
      status: 'Additional Information Required',
      urgency: 'Normal',
      isDemo: true,
    })
    .returning();

  // 5. Uploaded Images for Sample Cases
  await db.insert(uploadedImages).values([
    {
      caseId: case1.id,
      uploadedByUserId: farmerUser.id,
      fileName: 'tomato_lower_leaf_sample.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 184200,
      imageData: '/src/assets/images/crop_tomato_blight_1794912042744.jpg',
      caption: 'Sample lower tomato leaf showing concentric target-like lesions (Demo Image).',
      isFollowUp: false,
    },
    {
      caseId: case2.id,
      uploadedByUserId: farmerUser.id,
      fileName: 'paddy_leaf_lesions_sample.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 210400,
      imageData: '/src/assets/images/crop_paddy_blast_1794912042684.jpg',
      caption: 'Close-up of paddy leaves during tillering stage (Demo Image).',
      isFollowUp: false,
    },
    {
      caseId: case3.id,
      uploadedByUserId: farmerUser.id,
      fileName: 'maize_leaf_chlorosis_sample.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 196800,
      imageData: '/src/assets/images/crop_maize_deficiency_1794912043842.jpg',
      caption: 'Yellowing along midrib on lower maize leaf (Demo Image).',
      isFollowUp: false,
    },
  ]);

  // 6. Preliminary AI Analysis Records (Immutable Audit Copies)
  await db.insert(aiAnalysis).values([
    {
      caseId: case1.id,
      modelLabel: 'Demonstration Sample Preliminary Report (Pre-seeded)',
      isMock: true,
      possibleDiagnosis: 'Early Blight (Alternaria solani) — Preliminary Indication',
      category: 'Disease',
      alternativeCauses: JSON.stringify([
        {
          cause: 'Septoria Leaf Spot (Septoria lycopersici)',
          likelihoodNote: 'Secondary possibility',
          supportingDetail: 'Usually produces smaller uniform spots with dark margins and fewer concentric rings.',
        },
        {
          cause: 'Magnesium or Potassium Deficiency',
          likelihoodNote: 'Low-to-moderate overlap',
          supportingDetail: 'Lower-leaf yellowing can co-occur during fruit set nutrient demand.',
        },
      ]),
      observedSymptoms: JSON.stringify([
        'Concentric brown target-like lesions on older leaves',
        'Yellow chlorotic halo surrounding necrotic rings',
        'Progression starting from lower canopy',
      ]),
      supportingEvidence: JSON.stringify([
        'Visual concentric ring morphology matches classic Alternaria lesion traits.',
        'Fruit set stage increases lower-canopy stress and fungal susceptibility.',
      ]),
      confidenceLevel: 'Moderate-High',
      confidenceScore: 78,
      uncertaintyStatement:
        'Preliminary AI analysis cannot rule out co-existing Septoria spot or early late-blight lesions without human pathologist verification.',
      missingInformation: JSON.stringify([
        'Condition of stem and calyx lesions (if any)',
        'Recent fungicide or copper spray history',
      ]),
      expertReportSummary:
        'Sample preliminary report indicating probable Early Blight on Tomato (Arka Rakshak) at Fruit Set. Forwarded to verified plant pathologist for confirmation.',
      disclaimer:
        'Preliminary AI assessment only. Verified expert review required before issuing crop protection guidance.',
    },
    {
      caseId: case2.id,
      modelLabel: 'Demonstration Sample Preliminary Report (Pre-seeded)',
      isMock: true,
      possibleDiagnosis: 'Rice Leaf Blast (Magnaporthe oryzae) — Preliminary Indication',
      category: 'Disease',
      alternativeCauses: JSON.stringify([
        {
          cause: 'Brown Spot (Bipolaris oryzae)',
          likelihoodNote: 'Important differential diagnosis',
          supportingDetail: 'Oval dark brown spots without grey diamond centers; often linked to soil nutrient stress.',
        },
        {
          cause: 'Bacterial Leaf Blight (early streak)',
          likelihoodNote: 'Lower likelihood based on lesion geometry',
          supportingDetail: 'Typically starts from leaf tips/margins rather than discrete spindle lesions.',
        },
      ]),
      observedSymptoms: JSON.stringify([
        'Spindle-shaped lesions with pale grey centers',
        'Reddish-brown necrotic borders on leaves',
        'High humidity following recent nitrogen application',
      ]),
      supportingEvidence: JSON.stringify([
        'Diamond/spindle shape with ash-grey center is characteristic of foliar blast.',
        'Recent urea top-dressing and overcast humidity elevate blast risk.',
      ]),
      confidenceLevel: 'Moderate',
      confidenceScore: 74,
      uncertaintyStatement:
        'Field verification needed to inspect leaf collar/neck nodes and rule out Brown Spot.',
      missingInformation: JSON.stringify([
        'Whether collar or node rot is visible',
        'Standing water depth and field drainage schedule',
      ]),
      expertReportSummary:
        'High-priority preliminary report on Sona Masoori Paddy at Tillering stage. Awaiting verified plant pathologist evaluation.',
      disclaimer:
        'Preliminary AI assessment only. Not verified by an expert yet.',
    },
    {
      caseId: case3.id,
      modelLabel: 'Demonstration Sample Preliminary Report (Pre-seeded)',
      isMock: true,
      possibleDiagnosis: 'Nitrogen Deficiency vs. Waterlogging Root Stress',
      category: 'Nutrient Deficiency',
      alternativeCauses: JSON.stringify([
        {
          cause: 'Temporary root hypoxia / waterlogging stress',
          likelihoodNote: 'Moderate-High in low-lying patches',
          supportingDetail: 'Farmer noted symptoms concentrated in a low-lying area after rainfall.',
        },
        {
          cause: 'Zinc deficiency or Early Turcicum leaf blight',
          likelihoodNote: 'Secondary differential',
          supportingDetail: 'Requires checking upper whorl leaves for interveinal white bands.',
        },
      ]),
      observedSymptoms: JSON.stringify([
        'V-shaped chlorosis from leaf tip along midrib',
        'Restricted to older lower leaves',
        'Localized in low-lying field zone',
      ]),
      supportingEvidence: JSON.stringify([
        'Inverted V yellowing from tip along midrib is textbook mobile-nitrogen translocation.',
        'Heavy rain in low-lying patches frequently leaches nitrate and restricts root uptake.',
      ]),
      confidenceLevel: 'Moderate',
      confidenceScore: 69,
      uncertaintyStatement:
        'Cannot separate simple nitrogen shortage from waterlogging-induced uptake failure without drainage and fertilizer history.',
      missingInformation: JSON.stringify([
        'Basal and top-dress fertilizer dates and quantities',
        'Whether soil remains waterlogged > 48 hours after rain',
      ]),
      expertReportSummary:
        'Preliminary report flags Nitrogen deficiency possibly compounded by localized waterlogging in Maize V4-V8.',
      disclaimer:
        'Preliminary AI assessment only. Expert verification required.',
    },
  ]);

  // 7. Expert Reviews & Verified Recommendations
  const [review1] = await db
    .insert(expertReviews)
    .values({
      caseId: case1.id,
      expertId: expertUser.id,
      expertNameSnapshot: 'Dr. Kavitha Rao (Demo Verified Expert)',
      expertQualificationsSnapshot:
        'Ph.D. in Plant Pathology (UAS Bengaluru) · Reg: DEMO-ICAR-KVK-2014-8821',
      decision: 'Approved',
      verifiedDiagnosis: 'Confirmed Early Blight (Alternaria solani) in Tomato',
      reviewNotes:
        'AI preliminary identification is consistent with the concentric target-board lesions and yellow halo on lower mature foliage. No late blight water-soaked margins observed.',
      aiEvaluationNotes:
        'AI preliminary observation accurately flagged Alternaria solani and appropriately noted fruit-set canopy humidity.',
      reviewedAt: new Date('2026-11-10T09:30:00Z'),
    })
    .returning();

  await db.insert(recommendations).values({
    caseId: case1.id,
    expertReviewId: review1.id,
    approvedByExpertId: expertUser.id,
    culturalPractices:
      'Prune and safely destroy heavily infected lower leaves (avoid leaving debris in furrows). Schedule drip irrigation in early morning hours so foliage dries quickly before evening.',
    organicOrBiologicalOptions:
      'Apply foliar spray of Trichoderma viride or Pseudomonas fluorescens (talc formulation 5 g/L water) during cool evening hours as biological canopy protection.',
    preventiveMeasures:
      'Maintain 60 cm × 45 cm spacing for airflow, stake plants cleanly off soil splash, and practice 2-year rotation away from Solanaceae crops (brinjal, potato, chilli).',
    safeChemicalGuidance:
      'If lesion spread exceeds 15% of canopy despite sanitation, consult local KVK officer before applying label-recommended Mancozeb 75% WP (2 g/L) or Copper Oxychloride (2.5 g/L) adhering strictly to pre-harvest intervals.',
    followUpTimeline: 'Re-inspect new upper foliage in 7 days and upload a follow-up photo if lesions appear above mid-canopy.',
    referenceSource: 'ICAR-IIHR Tomato Integrated Pest & Disease Management Compendium (Verified by Dr. Kavitha Rao)',
    isPublishedToFarmer: true,
  });

  // Review #2: Expert requested additional info for Case 3
  await db.insert(expertReviews).values({
    caseId: case3.id,
    expertId: expertUser.id,
    expertNameSnapshot: 'Dr. Kavitha Rao (Demo Verified Expert)',
    expertQualificationsSnapshot:
      'Ph.D. in Plant Pathology (UAS Bengaluru) · Reg: DEMO-ICAR-KVK-2014-8821',
    decision: 'InfoRequested',
    verifiedDiagnosis: 'Pending Soil Drainage & Fertilizer History Clarification',
    reviewNotes:
      'V-shaped chlorosis indicates nitrogen deficiency, but because the issue is concentrated in a low-lying patch after rain, applying urea onto waterlogged soil will be wasted. Please share drainage and fertilizer details first.',
    aiEvaluationNotes: 'AI correctly identified the waterlogging vs. nitrogen trade-off.',
    requestedInfoDetails:
      '1) Did water stand in that patch for more than 2 days? 2) When did you last apply basal NPK or urea? 3) Please upload a photo of the whole plant showing upper leaves too.',
    reviewedAt: new Date('2026-11-12T14:15:00Z'),
  });

  // 8. Case History (Audit Logs)
  await db.insert(caseHistory).values([
    {
      caseId: case1.id,
      actorUserId: farmerUser.id,
      actorRole: 'farmer',
      actorName: farmerUser.fullName,
      actionType: 'CASE_SUBMITTED',
      previousStatus: null,
      newStatus: 'Submitted',
      details: 'Farmer submitted Tomato crop case with 1 field photograph.',
    },
    {
      caseId: case1.id,
      actorUserId: null,
      actorRole: 'system',
      actorName: 'AgriTrust Preliminary AI',
      actionType: 'AI_ANALYSIS_GENERATED',
      previousStatus: 'Submitted',
      newStatus: 'Awaiting Expert Review',
      details: 'Preliminary AI analysis generated (Early Blight candidate, 78% confidence) and routed for expert review.',
    },
    {
      caseId: case1.id,
      actorUserId: expertUser.id,
      actorRole: 'expert',
      actorName: expertUser.fullName,
      actionType: 'EXPERT_REVIEW_SUBMITTED',
      previousStatus: 'Awaiting Expert Review',
      newStatus: 'Expert Verified',
      details: 'Verified plant pathologist approved diagnosis and published reviewed management guidance.',
    },
    {
      caseId: case2.id,
      actorUserId: farmerUser.id,
      actorRole: 'farmer',
      actorName: farmerUser.fullName,
      actionType: 'CASE_SUBMITTED',
      previousStatus: null,
      newStatus: 'Submitted',
      details: 'Farmer submitted Paddy (Sona Masoori) crop case marked High urgency.',
    },
    {
      caseId: case2.id,
      actorUserId: adminUser.id,
      actorRole: 'admin',
      actorName: adminUser.fullName,
      actionType: 'EXPERT_ASSIGNED',
      previousStatus: 'Awaiting Expert Review',
      newStatus: 'Awaiting Expert Review',
      details: 'Assigned to verified specialist Dr. Kavitha Rao for priority cereal pathology review.',
    },
    {
      caseId: case3.id,
      actorUserId: expertUser.id,
      actorRole: 'expert',
      actorName: expertUser.fullName,
      actionType: 'INFO_REQUESTED',
      previousStatus: 'Under Expert Review',
      newStatus: 'Additional Information Required',
      details: 'Expert requested soil drainage duration, fertilizer dates, and whole-plant image.',
    },
  ]);

  // 9. Consultation Messages
  await db.insert(caseMessages).values([
    {
      caseId: case1.id,
      senderUserId: farmerUser.id,
      senderRole: 'farmer',
      senderName: farmerUser.fullName,
      message: 'Should I remove the yellowing lower leaves immediately before spraying Trichoderma?',
    },
    {
      caseId: case1.id,
      senderUserId: expertUser.id,
      senderRole: 'expert',
      senderName: expertUser.fullName,
      message:
        'Yes—prune only the heavily spotted bottom leaves in dry morning weather, place them in a sack away from the field, and apply the evening Trichoderma spray afterward.',
    },
  ]);

  // 10. Farmer Feedback
  await db.insert(farmerFeedback).values({
    caseId: case1.id,
    farmerId: farmerUser.id,
    rating: 5,
    helpfulness: 'Very Helpful',
    outcomeReported: 'Leaf spread slowed after pruning lower leaves and shifting drip timing to morning.',
    comments: 'Clear explanation and no unnecessary pesticide expense.',
  });

  // 11. Notifications
  await db.insert(notifications).values([
    {
      userId: farmerUser.id,
      caseId: case1.id,
      title: 'Expert Guidance Published (AT-2026-1001)',
      message: 'Dr. Kavitha Rao verified your Tomato Early Blight case and published management recommendations.',
      type: 'expert_review',
      isRead: false,
    },
    {
      userId: farmerUser.id,
      caseId: case3.id,
      title: 'Additional Information Requested (AT-2026-1003)',
      message: 'Your assigned agronomist requested drainage and fertilizer dates for your Maize case.',
      type: 'info_request',
      isRead: false,
    },
    {
      userId: expertUser.id,
      caseId: case2.id,
      title: 'High-Priority Case Assigned (AT-2026-1002)',
      message: 'Paddy (Sona Masoori) leaf lesion case in K.R. Nagar is awaiting your verification.',
      type: 'case_update',
      isRead: false,
    },
  ]);

  // 12. Agricultural Knowledge Database
  await db.insert(agriculturalKnowledge).values([
    {
      cropId: cropByName.get('Tomato')?.id ?? null,
      cropName: 'Tomato',
      varietyInfo: 'Susceptible across heirloom & commercial hybrids (Arka Rakshak has partial tolerance)',
      problemType: 'Disease',
      title: 'Early Blight of Tomato',
      titleKn: 'ಟೊಮೆಟೊ ಎಲೆ ಚುಕ್ಕೆ (ಅರ್ಲಿ ಬ್ಲೈಟ್) ರೋಗ',
      pathogenOrCause: 'Alternaria solani (Fungal)',
      symptoms:
        'Dark brown to black circular lesions with concentric target-board rings on older lower leaves, bordered by yellow chlorotic halos.',
      environmentalFactors:
        'Warm temperatures (24–29°C), heavy morning dew, overhead irrigation, and prolonged leaf wetness.',
      verifiedRecommendations:
        '1. Prune lower infected leaves touching soil. 2. Switch to morning drip irrigation. 3. Apply preventive Trichoderma viride or Pseudomonas fluorescens. 4. Consult local agronomist before using label-approved protective fungicides if spread exceeds threshold.',
      referenceSource: 'ICAR-IIHR Bengaluru Horticultural Disease Advisory (2025)',
      reviewedByExpertId: expertUser.id,
      reviewedByExpertName: 'Dr. Kavitha Rao, Ph.D.',
      lastReviewedDate: '2026-10-18',
      isPublished: true,
    },
    {
      cropId: cropByName.get('Paddy (Rice)')?.id ?? null,
      cropName: 'Paddy (Rice)',
      varietyInfo: 'Higher incidence in Sona Masoori under excess nitrogen',
      problemType: 'Disease',
      title: 'Rice Leaf & Neck Blast',
      titleKn: 'ಭತ್ತದ ಬೆಂಕಿ ರೋಗ (ರೈಸ್ ಬ್ಲಾಸ್ಟ್)',
      pathogenOrCause: 'Magnaporthe oryzae (Fungal)',
      symptoms:
        'Elliptical or spindle-shaped spots with whitish-grey centers and brown margins on leaves; can progress to dark necrotic lesions at the panicle neck.',
      environmentalFactors:
        'High relative humidity (>85%), cool night temperatures, overcast skies, and excessive single-dose urea application.',
      verifiedRecommendations:
        '1. Avoid excess nitrogen and split urea applications. 2. Maintain clean bunds free of weed hosts. 3. Use bio-control Pseudomonas fluorescens seed/foliar treatment. 4. Seek expert verification before targeted fungicide application at panicle stage.',
      referenceSource: 'UAS Bengaluru & KVK Mandya Paddy Package of Practices (2025)',
      reviewedByExpertId: expertUser.id,
      reviewedByExpertName: 'Dr. Kavitha Rao, Ph.D.',
      lastReviewedDate: '2026-10-22',
      isPublished: true,
    },
    {
      cropId: cropByName.get('Maize')?.id ?? null,
      cropName: 'Maize',
      varietyInfo: 'Common across rainfed and irrigated hybrids during V4–V8 rapid growth',
      problemType: 'Nutrient Deficiency',
      title: 'Nitrogen Deficiency vs. Waterlogging Chlorosis',
      titleKn: 'ಮೆಕ್ಕೆಜೋಳದಲ್ಲಿ ಸಾರಜನಕ ಕೊರತೆ ಮತ್ತು ನೀರು ನಿಲ್ಲುವ ಒತ್ತಡ',
      pathogenOrCause: 'Abiotic / Nitrogen leaching or root hypoxia',
      symptoms:
        'Pale yellowing starting at the tip of lower older leaves and progressing along the midrib in a V-shape while leaf margins remain greener initially.',
      environmentalFactors:
        'Sandy or low-organic soils, intense rainfall causing nitrate leaching, or compacted low-lying patches holding standing water.',
      verifiedRecommendations:
        '1. Open shallow drainage channels first if soil is waterlogged. 2. Apply recommended split nitrogen top-dressing only when soil reaches workable moisture. 3. Incorporate farmyard manure or green manure before sowing next cycle.',
      referenceSource: 'ICAR-IIMR Maize Nutrient Diagnostics Manual',
      reviewedByExpertId: expertUser.id,
      reviewedByExpertName: 'Dr. Kavitha Rao, Ph.D.',
      lastReviewedDate: '2026-09-30',
      isPublished: true,
    },
    {
      cropId: cropByName.get('Chilli')?.id ?? null,
      cropName: 'Chilli',
      varietyInfo: 'Observed in Byadgi Kaddi and Guntur varieties during dry spells',
      problemType: 'Pest',
      title: 'Chilli Thrips & Mite Leaf Curl Complex (Murda)',
      titleKn: 'ಮೆಣಸಿನಕಾಯಿ ಮುರುಟು ರೋಗ (ಥ್ರಿಪ್ಸ್ ಮತ್ತು ನುಸಿ)',
      pathogenOrCause: 'Scirtothrips dorsalis (upward curl) & Polyphagotarsonemus latus (downward curl)',
      symptoms:
        'Upward boat-like curling and crinkled leaves (thrips) or downward cupping with elongated petioles (yellow mites), causing flower drop.',
      environmentalFactors:
        'Hot dry weather (thrips) or warm humid microclimates (mites), adjacent host weeds.',
      verifiedRecommendations:
        '1. Distinguish upward vs. downward curl with a 10x lens before selecting treatment. 2. Install blue/yellow sticky traps (15/acre) for monitoring. 3. Spray Neem Seed Kernel Extract (NSKE 5%) in early infestation. 4. Obtain expert confirmation prior to miticide/insecticide rotation.',
      referenceSource: 'UAS Dharwad Byadgi Chilli IPM Bulletin',
      reviewedByExpertId: expertUser.id,
      reviewedByExpertName: 'Dr. Kavitha Rao, Ph.D.',
      lastReviewedDate: '2026-10-05',
      isPublished: true,
    },
    {
      cropId: cropByName.get('Groundnut')?.id ?? null,
      cropName: 'Groundnut',
      varietyInfo: 'TMV-2 is more susceptible than GPBD-4',
      problemType: 'Disease',
      title: 'Tikka Leaf Spot (Early & Late)',
      titleKn: 'ಶೇಂಗಾ ಎಲೆ ಚುಕ್ಕೆ (ಟಿಕ್ಕಾ) ರೋಗ',
      pathogenOrCause: 'Cercospora arachidicola & Phaeoisariopsis personata',
      symptoms:
        'Dark brown to black circular spots with bright yellow halos (early) or dark velvety spore masses on lower leaf surface (late), causing premature defoliation.',
      environmentalFactors:
        'High humidity, warm rainy days 30–50 days after sowing, dense plant canopy.',
      verifiedRecommendations:
        '1. Prefer resistant cultivars like GPBD-4. 2. Remove volunteer groundnut plants and crop residue. 3. Intercrop with pearl millet or red gram to slow spore dispersal.',
      referenceSource: 'ICAR-DGR Groundnut Crop Protection Guide',
      reviewedByExpertId: expertUser.id,
      reviewedByExpertName: 'Dr. Kavitha Rao, Ph.D.',
      lastReviewedDate: '2026-09-14',
      isPublished: true,
    },
    {
      cropId: cropByName.get('Finger Millet (Ragi)')?.id ?? null,
      cropName: 'Finger Millet (Ragi)',
      varietyInfo: 'GPU-28 exhibits strong neck and finger blast resistance',
      problemType: 'Disease',
      title: 'Ragi Finger & Neck Blast',
      titleKn: 'ರಾಗಿ ಕುತ್ತಿಗೆ ಮತ್ತು ತೆನೆ ಬೆಂಕಿ ರೋಗ',
      pathogenOrCause: 'Pyricularia grisea (Fungal)',
      symptoms:
        'Spindle spots on leaves followed by dark brown-black constriction just below the ear head (neck blast) causing chaffy unfilled grains.',
      environmentalFactors:
        'Continuous drizzle at booting/heading stage, high nitrogen fertility, delayed sowing.',
      verifiedRecommendations:
        '1. Adopt resistant varieties (GPU-28). 2. Treat seeds with Pseudomonas fluorescens (10 g/kg seed) prior to sowing. 3. Avoid late nitrogen application near booting.',
      referenceSource: 'All India Coordinated Small Millets Improvement Project (AICSMIP, Bengaluru)',
      reviewedByExpertId: expertUser.id,
      reviewedByExpertName: 'Dr. Kavitha Rao, Ph.D.',
      lastReviewedDate: '2026-10-12',
      isPublished: true,
    },
  ]);

  console.log('AgriTrust AI demonstration data seeded successfully.');
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
