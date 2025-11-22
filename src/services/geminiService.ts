import { GoogleGenerativeAI } from '@google/generative-ai';

// Read Gemini API key from Vite env (import.meta.env)
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('Gemini API key not found. Set VITE_GEMINI_API_KEY in your .env file');
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface MedicalAnalysis {
  diagnosis: string;
  condition: string;
  findings: string[];
  recommendations: string[];
  biomarkers?: {
    name: string;
    value: string;
    status: 'normal' | 'abnormal';
  }[];
  confidence: number;
}

export interface TreatmentPlan {
  title: string;
  description: string;
  steps: TreatmentStep[];
  timeline: string;
}

export interface TreatmentStep {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

export const geminiService = {
  async analyzeMedicalRecord(file: File, textContent: string): Promise<MedicalAnalysis> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Stronger, domain-specific prompt inspired by your sample component
      const prompt = `You are an expert clinical diagnostician and oncologist analyst. Carefully review the provided medical document and extract structured clinical information. Return ONLY a JSON object between the markers <<JSON_START>> and <<JSON_END>> matching this shape exactly (no explanation):
<<JSON_START>>
{
  "diagnosis": "primary diagnosis",
  "condition": "medical condition description",
  "findings": ["finding1", "finding2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "biomarkers": [{"name": "biomarker1", "value": "value1", "status": "normal|abnormal"}],
  "confidence": 0.0
}
<<JSON_END>>

Medical Document Content (first 15000 chars): ${textContent.substring(0, 15000)}
Provide concise, clinically-focused keys in the JSON. Do NOT include any other text outside the markers.`;

      // If the file is an image or PDF, include it as an inline data part (base64) to assist the model
      let text: string = '';
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // result is like data:<mime>;base64,<data>
            const parts = result.split(',');
            resolve(parts[1] || '');
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        const imagePart = {
          inlineData: {
            data: base64,
            mimeType: file.type,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        text = response.text();
      } else {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
      }

      // Prefer explicit marker extraction for robust parsing
      let parsed: any = null;
      try {
        const startMarker = '<<JSON_START>>';
        const endMarker = '<<JSON_END>>';
        const hasMarkers = text.includes(startMarker) && text.includes(endMarker);
        if (hasMarkers) {
          const start = text.indexOf(startMarker) + startMarker.length;
          const end = text.indexOf(endMarker);
          const candidate = text.slice(start, end).trim();
          parsed = JSON.parse(candidate);
        } else {
          // Fallback: try regex or brace slicing
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
              const candidate = text.slice(start, end + 1);
              parsed = JSON.parse(candidate);
            }
          }
        }
      } catch (parseErr) {
        console.warn('Failed to parse AI response as JSON. Raw response below for debugging:');
        console.warn(text);
        console.warn('Parse error:', parseErr);
        parsed = null;
      }

      if (parsed) return parsed;

      // If parsing failed, return a safe mock so the UI can continue working
      console.warn('Invalid response format from AI — returning mock analysis fallback');
      return this.getMockAnalysis();
    } catch (error) {
      console.error('Error analyzing medical record:', error);
      throw new Error('Failed to analyze medical record with AI');
    }
  },

  getMockAnalysis(): MedicalAnalysis {
    return {
      diagnosis: 'unknown',
      condition: 'insufficient data',
      findings: [],
      recommendations: [],
      biomarkers: [],
      confidence: 0,
    };
  },

  getMockTreatmentPlan(): TreatmentPlan {
    return {
      title: 'Untitled Treatment Plan',
      description: 'No treatment plan could be generated automatically.',
      steps: [],
      timeline: 'unspecified',
    };
  },

  async generateTreatmentPlan(analysis: MedicalAnalysis): Promise<TreatmentPlan> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const prompt = `
      You are an expert cancer and clinical treatment analyst. Based on the medical analysis provided, create a clear, patient-friendly, comprehensive treatment plan. Use short paragraphs and practical steps. Return ONLY a JSON object and wrap it exactly between the markers <<JSON_START>> and <<JSON_END>> with no explanation.
      <<JSON_START>>
      {
        "title": "Treatment Plan Title",
        "description": "Brief description",
        "steps": [
          {
            "id": "unique-id-1",
            "title": "Step title",
            "description": "Step description",
            "dueDate": "YYYY-MM-DD",
            "completed": false,
            "priority": "high|medium|low"
          }
        ],
        "timeline": "Overall timeline description"
      }
      <<JSON_END>>

      Medical Analysis: ${JSON.stringify(analysis)}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Prefer explicit marker extraction for robust parsing
      let parsed: any = null;
      try {
        const startMarker = '<<JSON_START>>';
        const endMarker = '<<JSON_END>>';
        const hasMarkers = text.includes(startMarker) && text.includes(endMarker);
        if (hasMarkers) {
          const start = text.indexOf(startMarker) + startMarker.length;
          const end = text.indexOf(endMarker);
          const candidate = text.slice(start, end).trim();
          parsed = JSON.parse(candidate);
        } else {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
              const candidate = text.slice(start, end + 1);
              parsed = JSON.parse(candidate);
            }
          }
        }
      } catch (parseErr) {
        console.warn('Failed to parse AI response for treatment plan. Raw response below for debugging:');
        console.warn(text);
        console.warn('Parse error:', parseErr);
        parsed = null;
      }

      if (parsed) return parsed;

      console.warn('Invalid response format from AI for treatment plan — returning mock fallback');
      return this.getMockTreatmentPlan();
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      throw new Error('Failed to generate treatment plan');
    }
  },

  /**
   * Generate Kanban-style tasks JSON (columns + tasks) from analysis or treatment plan text/object.
   * Returns parsed object or null if parsing failed.
   */
  async generateKanbanFromAnalysis(input: string | MedicalAnalysis): Promise<any | null> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const analysisText = typeof input === 'string' ? input : JSON.stringify(input);
      const prompt = `Convert the following clinical analysis into a Kanban-style JSON structure for a task board. Return ONLY the JSON between <<JSON_START>> and <<JSON_END>> with this exact shape:
<<JSON_START>>
{
  "columns": [
    { "id": "todo", "title": "Todo" },
    { "id": "doing", "title": "Work in progress" },
    { "id": "done", "title": "Done" }
  ],
  "tasks": [
    { "id": "1", "columnId": "todo", "content": "Example task 1" }
  ]
}
<<JSON_END>>

Analysis: ${analysisText}
Do not include any explanatory text or markdown, only the JSON between the markers.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract between markers
      const startMarker = '<<JSON_START>>';
      const endMarker = '<<JSON_END>>';
      if (text.includes(startMarker) && text.includes(endMarker)) {
        const start = text.indexOf(startMarker) + startMarker.length;
        const end = text.indexOf(endMarker);
        const candidate = text.slice(start, end).trim();
        try {
          return JSON.parse(candidate);
        } catch (err) {
          console.warn('Failed to parse kanban JSON from AI. Raw output:', text, err);
          return null;
        }
      }

      // Fallback: try to parse whole output as JSON
      try {
        return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || 'null');
      } catch (err) {
        console.warn('Kanban generation: could not parse AI output', err);
        return null;
      }
    } catch (err) {
      console.error('Error generating kanban from analysis:', err);
      return null;
    }
  }
};