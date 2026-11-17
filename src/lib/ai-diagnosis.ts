import { GoogleGenAI, Type } from '@google/genai';

export interface AlternativeCause {
  cause: string;
  likelihoodNote: string;
  supportingDetail: string;
}

export interface PreliminaryAIResult {
  modelLabel: string;
  isMock: boolean;
  possibleDiagnosis: string;
  category: 'Disease' | 'Pest' | 'Nutrient Deficiency' | 'Environmental Stress' | 'Uncertain';
  alternativeCauses: AlternativeCause[];
  observedSymptoms: string[];
  supportingEvidence: string[];
  confidenceLevel: 'Low' | 'Moderate' | 'Moderate-High';
  confidenceScore: number; // Strictly capped <= 86; never 100%
  uncertaintyStatement: string;
  missingInformation: string[];
  expertReportSummary: string;
  disclaimer: string;
}

export interface CaseAnalysisInput {
  cropName: string;
  cropVariety?: string | null;
  growthStage: string;
  symptoms: string;
  location: string;
  symptomOnsetDate: string;
  additionalObservations?: string | null;
  images: Array<{ mimeType: string; imageData: string; fileName: string }>;
}

const STANDARD_DISCLAIMER =
  'Preliminary AI assessment only. Not an expert-confirmed diagnosis. No chemical or treatment plan is authorized until reviewed and approved by a verified agricultural specialist.';

function hasLiveGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

function parseDataUri(dataUri: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUri);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function clampConfidenceScore(raw: number): number {
  const num = Number.isFinite(raw) ? Math.round(raw) : 62;
  return Math.max(30, Math.min(86, num));
}

function buildDemoMockAnalysis(input: CaseAnalysisInput): PreliminaryAIResult {
  const s = `${input.symptoms} ${input.additionalObservations || ''}`.toLowerCase();
  const crop = input.cropName;

  let possibleDiagnosis = `Preliminary Stress or Foliar Symptom Complex in ${crop}`;
  let category: PreliminaryAIResult['category'] = 'Uncertain';
  let confidenceLevel: PreliminaryAIResult['confidenceLevel'] = 'Low';
  let confidenceScore = 58;
  let alternatives: AlternativeCause[] = [
    {
      cause: 'Early-stage fungal leaf spot or blight',
      likelihoodNote: 'Moderate possibility depending on humidity',
      supportingDetail: 'Foliar discoloration or lesions reported by the farmer.',
    },
    {
      cause: 'Macronutrient or micronutrient imbalance',
      likelihoodNote: 'Alternative differential cause',
      supportingDetail: 'Leaf yellowing or vigor loss can mimic pathogen infection.',
    },
  ];
  let evidence = [
    `Farmer reported symptoms in ${crop} at the ${input.growthStage} stage.`,
    `Symptom onset noted around ${input.symptomOnsetDate} in ${input.location}.`,
  ];

  if (s.includes('ring') || s.includes('blight') || s.includes('brown spot') || s.includes('lesion')) {
    possibleDiagnosis = `Possible Foliar Fungal Blight / Leaf Spot Complex (${crop})`;
    category = 'Disease';
    confidenceLevel = 'Moderate';
    confidenceScore = 71;
    alternatives = [
      {
        cause: 'Bacterial leaf spot',
        likelihoodNote: 'Requires microscopic or close-margin inspection',
        supportingDetail: 'Water-soaked lesion margins can appear similar in field photos.',
      },
      {
        cause: 'Sunscald or fertilizer splash injury',
        likelihoodNote: 'Lower likelihood unless spray drift occurred',
        supportingDetail: 'Localized necrotic spots sometimes follow foliar spray concentration.',
      },
    ];
    evidence = [
      'Reported necrotic lesions or dark spots on leaf tissue.',
      `Growth stage (${input.growthStage}) increases canopy humidity and foliar disease susceptibility.`,
      input.images.length > 0
        ? `${input.images.length} uploaded field image(s) queued for expert visual inspection.`
        : 'No image attached; text-only symptom pattern.',
    ];
  } else if (s.includes('yellow') || s.includes('chlorosis') || s.includes('pale') || s.includes('stunt')) {
    possibleDiagnosis = `Possible Nutrient Deficiency (Nitrogen / Iron / Magnesium) or Root Stress`;
    category = 'Nutrient Deficiency';
    confidenceLevel = 'Moderate';
    confidenceScore = 66;
    alternatives = [
      {
        cause: 'Root rot or excess soil moisture / poor drainage',
        likelihoodNote: 'High differential priority if rainfall was heavy',
        supportingDetail: 'Impaired root uptake triggers secondary leaf chlorosis.',
      },
      {
        cause: 'Viral yellowing / vector-borne mosaic',
        likelihoodNote: 'Possible if sap-sucking insects are present',
        supportingDetail: 'Check underside of leaves for whiteflies, aphids, or thrips.',
      },
    ];
    evidence = [
      'Farmer described leaf yellowing / pale coloration.',
      `Observed at ${input.growthStage} stage in ${input.location}.`,
    ];
  } else if (s.includes('hole') || s.includes('worm') || s.includes('caterpillar') || s.includes('aphid') || s.includes('mite') || s.includes('curling')) {
    possibleDiagnosis = `Possible Insect Pest or Sap-Sucking Vector Infestation`;
    category = 'Pest';
    confidenceLevel = 'Moderate';
    confidenceScore = 72;
    alternatives = [
      {
        cause: 'Secondary viral leaf curl transmitted by thrips or whiteflies',
        likelihoodNote: 'Requires underside leaf inspection',
        supportingDetail: 'Leaf curling often accompanies vector feeding.',
      },
      {
        cause: 'Herbicide drift distortion',
        likelihoodNote: 'Check neighboring field spray history',
        supportingDetail: 'Chemical drift can produce puckered or curled new leaves.',
      },
    ];
    evidence = [
      'Symptoms mention foliar feeding damage, curling, or visible insect activity.',
      `Crop stage: ${input.growthStage}.`,
    ];
  }

  const missingInfo: string[] = [
    'Recent 7-day irrigation, rainfall, and field drainage conditions',
    'Details of any fertilizers, bio-inputs, or sprays applied in the past 14 days',
    'Distribution pattern across the plot (isolated plants vs. entire field)',
  ];
  if (input.images.length < 2) {
    missingInfo.push('Close-up photo of both upper and lower leaf surfaces plus whole-plant context');
  }

  return {
    modelLabel: 'Demonstration Mock AI Analyzer (Simulated — No Live ML Model Connected)',
    isMock: true,
    possibleDiagnosis,
    category,
    alternativeCauses: alternatives,
    observedSymptoms: input.symptoms
      .split(/[.,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5),
    supportingEvidence: evidence,
    confidenceLevel,
    confidenceScore,
    uncertaintyStatement:
      'Demonstration mode active: This preliminary assessment is generated by a rule-based placeholder analyzer because no live AI diagnostic model key is configured. Confidence is intentionally capped below clinical certainty and must be reviewed by a qualified agronomist.',
    missingInformation: missingInfo,
    expertReportSummary: `Preliminary intake for ${crop}${input.cropVariety ? ` (${input.cropVariety})` : ''} at ${input.growthStage} in ${input.location}. Onset: ${input.symptomOnsetDate}. Farmer notes: "${input.symptoms}". Verification by a credentialed agronomist is required before releasing any management or treatment guidance.`,
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export async function runPreliminaryAIAnalysis(
  input: CaseAnalysisInput
): Promise<PreliminaryAIResult> {
  if (!hasLiveGeminiKey()) {
    return buildDemoMockAnalysis(input);
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  for (const img of input.images.slice(0, 3)) {
    const parsed = parseDataUri(img.imageData);
    if (parsed) {
      imageParts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      });
    }
  }

  const promptText = `You are an agricultural preliminary diagnostic assistant for AgriTrust AI.
Analyze the farmer's crop submission and uploaded image(s) (if provided) to create a cautious, structured preliminary report for a human agricultural expert to review.

STRICT SAFETY & RELIABILITY RULES:
1. NEVER claim 100% diagnostic accuracy. Keep confidenceScore between 35 and 86 maximum.
2. NEVER prescribe chemical pesticides, fungicides, or dosages. You are strictly limited to preliminary observation and differential possibilities; treatment guidance is ONLY issued by a verified human expert.
3. NEVER invent agricultural facts. If images are unclear or information is missing, clearly state uncertainty and list what information the expert or farmer needs to confirm.
4. Provide 2-3 plausible alternative causes alongside the primary possibility.

Submission Details:
- Crop: ${input.cropName}
- Variety: ${input.cropVariety || 'Not specified'}
- Growth Stage: ${input.growthStage}
- Location: ${input.location}
- Date Symptoms Appeared: ${input.symptomOnsetDate}
- Farmer Reported Symptoms: ${input.symptoms}
- Additional Observations: ${input.additionalObservations || 'None provided'}
- Attached Images Count: ${input.images.length} (${imageParts.length} inline image payload(s) attached)`;

  const contents =
    imageParts.length > 0
      ? { parts: [...imageParts, { text: promptText }] }
      : promptText;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents,
    config: {
      systemInstruction:
        'You are a cautious, scientific agronomy triage assistant supporting human plant pathologists. Always express uncertainty transparently and never output treatment prescriptions.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          possibleDiagnosis: { type: Type.STRING },
          category: {
            type: Type.STRING,
            description:
              'One of: Disease, Pest, Nutrient Deficiency, Environmental Stress, Uncertain',
          },
          alternativeCauses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                cause: { type: Type.STRING },
                likelihoodNote: { type: Type.STRING },
                supportingDetail: { type: Type.STRING },
              },
            },
          },
          observedSymptoms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          supportingEvidence: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          confidenceLevel: {
            type: Type.STRING,
            description: 'One of: Low, Moderate, Moderate-High',
          },
          confidenceScore: {
            type: Type.INTEGER,
            description: 'Integer between 35 and 86. Never 100.',
          },
          uncertaintyStatement: { type: Type.STRING },
          missingInformation: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          expertReportSummary: { type: Type.STRING },
        },
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as Partial<PreliminaryAIResult>;

  const allowedCategories = new Set([
    'Disease',
    'Pest',
    'Nutrient Deficiency',
    'Environmental Stress',
    'Uncertain',
  ]);
  const safeCategory = allowedCategories.has(String(parsed.category))
    ? (parsed.category as PreliminaryAIResult['category'])
    : 'Uncertain';

  const allowedLevels = new Set(['Low', 'Moderate', 'Moderate-High']);
  const safeLevel = allowedLevels.has(String(parsed.confidenceLevel))
    ? (parsed.confidenceLevel as PreliminaryAIResult['confidenceLevel'])
    : 'Moderate';

  return {
    modelLabel: 'Gemini 4 Hydrogen — Preliminary Vision & Symptom Assistant',
    isMock: false,
    possibleDiagnosis:
      parsed.possibleDiagnosis ||
      `Preliminary differential review required for ${input.cropName}`,
    category: safeCategory,
    alternativeCauses: Array.isArray(parsed.alternativeCauses)
      ? parsed.alternativeCauses.slice(0, 4)
      : [],
    observedSymptoms: Array.isArray(parsed.observedSymptoms)
      ? parsed.observedSymptoms
      : [input.symptoms],
    supportingEvidence: Array.isArray(parsed.supportingEvidence)
      ? parsed.supportingEvidence
      : ['Preliminary review of farmer symptom description and attached imagery.'],
    confidenceLevel: safeLevel,
    confidenceScore: clampConfidenceScore(parsed.confidenceScore ?? 65),
    uncertaintyStatement:
      parsed.uncertaintyStatement ||
      'Preliminary AI output cannot distinguish visually overlapping biotic and abiotic stresses without field verification.',
    missingInformation: Array.isArray(parsed.missingInformation)
      ? parsed.missingInformation
      : ['Recent weather, irrigation, and input application history'],
    expertReportSummary:
      parsed.expertReportSummary ||
      `Preliminary AI summary for ${input.cropName} (${input.growthStage}) awaiting verified agronomist review.`,
    disclaimer: STANDARD_DISCLAIMER,
  };
}
