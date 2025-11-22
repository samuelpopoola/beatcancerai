import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  getMedicalAnalysisPrompt,
  getNarrativeMockAnalysis,
  NarrativeMedicalAnalysis,
} from '../utils/geminiAnalysis';

export interface MedicalAnalysis {
  diagnosis?: {
    primary?: string;
    differentials?: string[];
    confidence?: number;
    notes?: string;
  };
  treatmentSuggestions?: Array<{
    name: string;
    urgency?: 'low' | 'medium' | 'high';
    rationale?: string;
    confidence?: number;
    evidence?: string[];
  }>;
  monitoring?: string[];
  patientFriendlySummary?: string; // short plain-language summary for patients
  suggestedNextSteps?: string[]; // concrete next actions (appointments, tests)
  riskAssessment?: Record<string, any>;
  overallConfidence?: number;
  [k: string]: any;
}

type AnalysisFormat = 'structured-json' | 'narrative-report';

const cleanJsonCandidate = (value: string) => {
  if (!value) return value;
  let cleaned = value.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, '').trim();
  cleaned = cleaned.replace(/```$/i, '').trim();
  return cleaned;
};

const extractBalancedJson = (value: string | null) => {
  if (!value) return null;
  const firstBrace = value.indexOf('{');
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < value.length; i += 1) {
    const char = value[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return value.slice(firstBrace, i + 1);
      }
    }
  }

  return null;
};

const parseJsonFromText = (text: string, markers?: { start?: string; end?: string }) => {
  if (!text) return null;

  const candidates: string[] = [];
  const startMarker = markers?.start;
  const endMarker = markers?.end;

  if (startMarker && endMarker && text.includes(startMarker) && text.includes(endMarker)) {
    const startIndex = text.indexOf(startMarker) + startMarker.length;
    const endIndex = text.indexOf(endMarker, startIndex);
    if (endIndex > startIndex) {
      candidates.push(text.substring(startIndex, endIndex));
    }
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch && fencedMatch[1]) {
    candidates.push(fencedMatch[1]);
  }

  const balanced = extractBalancedJson(text);
  if (balanced) {
    candidates.push(balanced);
  }

  candidates.push(text);

  for (const candidate of candidates) {
    const cleaned = cleanJsonCandidate(candidate);
    if (!cleaned) continue;
    try {
      return JSON.parse(cleaned);
    } catch {
      // Keep trying other candidates
    }
  }

  return null;
};

export class GeminiMedicalService {
  private genAI?: GoogleGenerativeAI;
  private model: any;
  private apiKey?: string;

  constructor() {
    // Use Vite-provided env directly
    this.apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

    console.log('🔍 Gemini API Key check:', {
      keyExists: !!this.apiKey,
      keyLength: this.apiKey?.length,
      keyPreview: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING'
    });

    if (!this.apiKey) {
      console.warn('⚠️ Gemini API Key not found. Using mock mode.');
    } else {
      console.log('✅ Gemini API Key loaded successfully');
      // Initialize Google AI with the key, but don't crash on failure
      try {
        // @ts-ignore runtime types may vary
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
          ]
        });
        console.log('✅ Gemini AI service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini AI:', error);
      }
    }
  }

  private getMockAnalysis(): MedicalAnalysis {
    return {
      diagnosis: {
        primary: 'Simulated Analysis - Data Review Required',
        differentials: ['Rule out metastatic disease', 'Consider benign etiologies'],
        confidence: 0.7,
        notes: 'This is a fallback analysis generated because the real AI service was not available.'
      },
      treatmentSuggestions: [
        {
          name: 'Specialist consultation (Oncology)',
          urgency: 'high',
          rationale: 'Needed to interpret imaging and pathology and to establish a multidisciplinary plan',
          confidence: 0.75,
          evidence: ['Imaging findings', 'Elevated tumor markers']
        },
        {
          name: 'Start baseline labs and oncology panel',
          urgency: 'medium',
          rationale: 'Helps risk-stratify and guide treatment choices',
          confidence: 0.6,
          evidence: ['Standard of care recommendations']
        }
      ],
      monitoring: ['CBC every 2 weeks', 'CMP monthly', 'Imaging in 4-6 weeks'],
      patientFriendlySummary: 'The automated review suggests a likely concerning finding that needs specialist review. Please schedule a specialist appointment and bring your imaging and reports.',
      suggestedNextSteps: ['Schedule oncology consult within 1 week', 'Obtain pathology report and recent imaging', 'Start baseline blood tests'],
      riskAssessment: {
        recurrenceRisk: 'medium',
        toxicityRisk: 'medium'
      },
      overallConfidence: 0.7
    } as MedicalAnalysis;
  }

  async analyzeMedicalDocument(
    medicalText: string,
    userContext: any,
    options?: { format?: AnalysisFormat }
  ): Promise<MedicalAnalysis | NarrativeMedicalAnalysis | { rawResponse: string; error?: string }> {
    console.log('🔄 Starting Gemini analysis...');

    const format: AnalysisFormat = options?.format ?? 'structured-json';

    if (!this.apiKey) {
      console.log('🔧 Using mock analysis (no API key)');
      return format === 'narrative-report' ? getNarrativeMockAnalysis() : this.getMockAnalysis();
    }

    const startMarker = '<<JSON_START>>';
    const endMarker = '<<JSON_END>>';
    const markerInstruction = `Wrap your JSON response between the markers ${startMarker} and ${endMarker}. Do not add prose outside of the markers.`;
    const prompt =
      format === 'narrative-report'
        ? `${getMedicalAnalysisPrompt(medicalText, {
            patientName: userContext?.full_name || userContext?.patientName,
            cancerType: userContext?.cancer_type,
            cancerStage: userContext?.cancer_stage,
            userContext,
          })}

${markerInstruction}`
        : `You are a specialist medical reviewer. Analyze the clinical document below for the patient described and produce a DETAILED JSON object between the markers ${startMarker} and ${endMarker}. The JSON should include at minimum: diagnosis (primary, differentials, confidence, notes), treatmentSuggestions (array with name, urgency, rationale, confidence, evidence[]), monitoring (array), patientFriendlySummary (short plain-language summary for the patient), suggestedNextSteps (concrete next actions), riskAssessment, and overallConfidence.

  Patient context: ${userContext ? JSON.stringify(userContext) : 'None provided'}

  DOCUMENT:
  ${medicalText}

  Respond ONLY with the JSON between the markers. After the markers, you may include a brief plain-language note for clinicians (optional). Example:
  ${startMarker}
  { "diagnosis": { "primary": "Stage II ER+ Breast Cancer", "differentials": [], "confidence": 0.9, "notes": "" }, "treatmentSuggestions": [{ "name": "Surgery", "urgency": "high", "rationale": "...", "confidence": 0.85, "evidence": [] }], "monitoring": ["Regular follow-ups"], "patientFriendlySummary": "...", "suggestedNextSteps": ["Refer to surgery"], "riskAssessment": {}, "overallConfidence": 0.85 }
  ${endMarker}`;

    try {
      console.log('🚀 Making real Gemini API call');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = typeof response?.text === 'function' ? await response.text() : String(response ?? '');

      console.log('📥 Raw Gemini response:', text);

      const parsedPayload = parseJsonFromText(text, { start: startMarker, end: endMarker });

      if (format === 'narrative-report') {
        if (parsedPayload) {
          return parsedPayload as NarrativeMedicalAnalysis;
        }
        console.error('Narrative JSON parse error: unable to extract structured payload');
        return { rawResponse: text, error: 'No JSON found in AI response' };
      }

      if (parsedPayload) {
        if ((parsedPayload as any).treatmentRecommendations && !(parsedPayload as any).treatmentSuggestions) {
          (parsedPayload as any).treatmentSuggestions = (parsedPayload as any).treatmentRecommendations;
        }
        return parsedPayload as MedicalAnalysis;
      }

      return { rawResponse: text, error: 'No JSON found in AI response' };

    } catch (error: any) {
      console.error('Gemini API call failed:', error);
      return format === 'narrative-report' ? getNarrativeMockAnalysis() : this.getMockAnalysis();
    }
  }
}

export const geminiMedicalService = new GeminiMedicalService();

