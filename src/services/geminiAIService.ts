/*
  Gemini AI Service (server-side)
  - This file provides a server-safe wrapper around Google's Generative AI (Gemini).
  - Do NOT include your API key in client-side bundles. Set `GEMINI_API_KEY` in the
    server environment (e.g. in your serverless function or backend process).
  - The implementation lazy-loads the SDK and falls back to a safe stub when the
    SDK or API key is not available (useful for local dev without keys).
*/

type AnalysisJSON = any;

function getFallbackAnalysis() {
  return {
    diagnosis: {
      primary: 'Analysis in progress',
      subtype: '',
      confidence: 0,
      keyFindings: []
    },
    biomarkers: { identified: [], targetable: [], prognostic: [] },
    treatmentRecommendations: [],
    riskAssessment: { recurrenceRisk: 'unknown', toxicityRisk: 'unknown', keyRiskFactors: [], overallPrognosis: 'unknown' },
    monitoringPlan: { imagingSchedule: [], labTests: [], followUpFrequency: 'As recommended by oncology team' },
    clinicalAlerts: ['AI analysis temporarily unavailable - consult with your medical team']
  };
}

export class GeminiAIService {
  private client: any | null = null;
  private model: any | null = null;
  private keyPresent = false;

  constructor() {
    // Prefer Vite-style env var when available (import.meta.env.VITE_GEMINI_API_KEY)
    // Fall back to server environment variables if not present.
    let viteKey: string | undefined;
    try {
      // Access import.meta.env safely; TypeScript may not know about import.meta here
      // @ts-ignore
      viteKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
    } catch (e) {
      viteKey = undefined;
    }

    const key = viteKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_KEY;

    if (!key) {
      throw new Error('Gemini API key not found. Please check your VITE_GEMINI_API_KEY environment variable.');
    }

    this.keyPresent = true;

    try {
      // Lazy require to avoid bundling @google/generative-ai into client builds
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      this.client = new GoogleGenerativeAI(key);
      this.model = this.client.getGenerativeModel({
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
      });
    } catch (err) {
      // SDK not available or failed to initialize
      // eslint-disable-next-line no-console
      console.warn('Could not initialize Google Generative AI SDK; falling back to simulated analysis.', err);
      this.client = null;
      this.model = null;
    }
  }

  async analyzeMedicalRecord(medicalText: string, userContext: any): Promise<AnalysisJSON> {
    if (!this.keyPresent || !this.model) return getFallbackAnalysis();

    const prompt = this.buildMedicalAnalysisPrompt(medicalText, userContext);

    try {
      const result = await this.model.generateContent(prompt);
      const resp = result?.response;
      const text = typeof resp?.text === 'function' ? await resp.text() : String(resp ?? '');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return getFallbackAnalysis();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Gemini AI analysis failed:', err);
      return getFallbackAnalysis();
    }
  }

  private buildMedicalAnalysisPrompt(medicalText: string, userContext: any) {
    return `
MEDICAL DOCUMENT ANALYSIS - CANCER CARE PLATFORM

ROLE: You are an expert oncology clinical AI assistant. Analyze the medical document and provide structured clinical insights following NCCN guidelines and evidence-based medicine.

PATIENT CONTEXT:
- Cancer Type: ${userContext?.cancer_type ?? 'unknown'}
- Cancer Stage: ${userContext?.cancer_stage ?? 'unknown'}
- Age: ${userContext?.age ?? 'unknown'}
- Gender: ${userContext?.gender ?? 'unknown'}
- Treatment Goal: ${userContext?.treatment_goal ?? 'unknown'}

MEDICAL DOCUMENT CONTENT:
"""
${medicalText}
"""

ANALYSIS REQUIREMENTS:

1. PRIMARY DIAGNOSIS:
   - Extract the main cancer diagnosis
   - Note any subtypes or specific characteristics
   - Provide confidence level (0.0-1.0)

2. BIOMARKERS & MOLECULAR FEATURES:
   - List all identified biomarkers
   - Note hormone receptor status if applicable
   - Identify genetic mutations
   - Highlight targetable biomarkers

3. TREATMENT RECOMMENDATIONS:
   - Recommend evidence-based treatment options
   - Align with NCCN guidelines for the specific cancer type/stage
   - Include both standard of care and emerging options
   - Prioritize by evidence strength

4. RISK ASSESSMENT:
   - Estimate recurrence risk (low/medium/high)
   - Assess treatment toxicity risk
   - Note any concerning findings

5. MONITORING RECOMMENDATIONS:
   - Suggest appropriate follow-up schedule
   - Recommend specific imaging/lab tests
   - Outline surveillance protocol

RESPONSE FORMAT (JSON):
{
  "diagnosis": {
    "primary": "string",
    "subtype": "string",
    "confidence": number,
    "keyFindings": string[]
  },
  "biomarkers": {
    "identified": string[],
    "targetable": string[],
    "prognostic": string[]
  },
  "treatmentRecommendations": [
    {
      "type": "chemotherapy|radiation|surgery|immunotherapy|targeted_therapy",
      "name": "string",
      "rationale": "string",
      "evidenceLevel": "high|medium|low",
      "nccnCategory": "1|2A|2B|3",
      "priority": "high|medium|low"
    }
  ],
  "riskAssessment": {
    "recurrenceRisk": "low|medium|high",
    "toxicityRisk": "low|medium|high",
    "keyRiskFactors": string[],
    "overallPrognosis": "excellent|good|fair|poor"
  },
  "monitoringPlan": {
    "imagingSchedule": string[],
    "labTests": string[],
    "followUpFrequency": "string"
  },
  "clinicalAlerts": string[]
}

IMPORTANT: 
- Base recommendations on latest NCCN guidelines
- Consider patient age and comorbidities
- Highlight any urgent concerns
- Provide evidence-based rationale for each recommendation
- Do not include personal medical advice disclaimers in the JSON
`;
  }

  private parseMedicalAnalysis(responseText: string) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse Gemini AI response:', error);
      return getFallbackAnalysis();
    }
  }

  // Additional helpers
  async generatePatientExplanation(medicalConcept: string, educationLevel: string = 'high-school') {
    if (!this.keyPresent || !this.model) return `Explanation unavailable (Gemini key not configured). Briefly: ${medicalConcept}`;

    const prompt = `Explain the following medical concept to a cancer patient with ${educationLevel} education level:\n\nCONCEPT: ${medicalConcept}\n\nRequirements:\n- Use simple, clear language\n- Use analogies where helpful\n- Keep under 200 words\n- Focus on practical implications\n- Be empathetic and supportive\n\nResponse should be in plain text without markdown.`;

    try {
      const result = await this.model.generateContent(prompt);
      const resp = result?.response;
      const text = typeof resp?.text === 'function' ? await resp.text() : String(resp ?? '');
      return text;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('generatePatientExplanation failed:', err);
      return 'Explanation temporarily unavailable.';
    }
  }

  async analyzeSymptomPattern(symptoms: any[], treatments: any[]) {
    if (!this.keyPresent || !this.model) return { error: 'Gemini key not configured' };

    const prompt = `Analyze these cancer patient symptoms and identify patterns:\n\nSYMPTOMS:\n${JSON.stringify(symptoms, null, 2)}\n\nCURRENT TREATMENTS:\n${JSON.stringify(treatments, null, 2)}\n\nIdentify:\n1. Potential symptom clusters\n2. Likely causes (treatment side effects vs disease progression)\n3. Urgency level for each symptom\n4. Suggested management strategies\n\nRespond in JSON format.`;

    try {
      const result = await this.model.generateContent(prompt);
      const resp = result?.response;
      const text = typeof resp?.text === 'function' ? await resp.text() : String(resp ?? '');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { error: 'Could not parse response' };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('analyzeSymptomPattern failed:', err);
      return { error: 'analysis failed' };
    }
  }
}

export const geminiAIService = new GeminiAIService();
