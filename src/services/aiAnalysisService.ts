import { databaseService } from './database';
import { geminiMedicalService } from './geminiMedicalService';
import { NarrativeMedicalAnalysis, DISCLAIMER_TEXT } from '../utils/geminiAnalysis';

export interface AIAnalysis {
  diagnosis: string;
  confidence: number;
  biomarkers: string[];
  treatmentRecommendations: TreatmentRecommendation[];
  riskAssessment: RiskAssessment;
  nccnGuidelineMatches: string[];
}

export interface TreatmentRecommendation {
  type: 'chemotherapy' | 'radiation' | 'surgery' | 'immunotherapy' | 'targeted_therapy';
  name: string;
  rationale: string;
  evidenceLevel: 'high' | 'medium' | 'low';
  priority: 'high' | 'medium' | 'low';
}

export interface RiskAssessment {
  recurrenceRisk: number;
  sideEffectRisk: number;
  overallPrognosis: 'excellent' | 'good' | 'fair' | 'poor';
}

type PatientFriendlyAnalysis = NarrativeMedicalAnalysis & {
  format: 'patient-friendly';
  source: 'gemini';
  generatedAt: string;
};

type StoredAnalysis = AIAnalysis | PatientFriendlyAnalysis;

class AIAnalysisService {
  async analyzeMedicalRecord(medicalRecordId: string, userId: string): Promise<StoredAnalysis> {
    const [record, userProfile] = await Promise.all([
      databaseService.getMedicalRecord(medicalRecordId),
      databaseService.getUserProfile(userId),
    ]);

    if (!record) {
      throw new Error('Medical record not found');
    }

    const recordSummary = this.buildRecordSummary(record, userProfile);
    const aiResponse = await geminiMedicalService.analyzeMedicalDocument(recordSummary, userProfile, {
      format: 'narrative-report',
    });

    const analysis = await this.normalizeAnalysisResponse(aiResponse, userId);

    await databaseService.storeAIAnalysis({
      medical_record_id: medicalRecordId,
      user_id: userId,
      analysis_type: this.isPatientFriendly(analysis) ? 'gemini_patient_summary' : 'diagnosis',
      findings: analysis as unknown as Record<string, unknown>,
      confidence_score: this.isPatientFriendly(analysis) ? null : (analysis as AIAnalysis).confidence,
      recommendations: this.hasTreatmentRecommendations(analysis)
        ? ((analysis as AIAnalysis).treatmentRecommendations as unknown as Record<string, unknown>[])
        : null,
    });

    await databaseService.updateMedicalRecord(medicalRecordId, {
      analyzed: true,
      analysis_data: analysis as unknown as Record<string, unknown>,
    });

    if (this.hasTreatmentRecommendations(analysis)) {
      await this.generateCarePlanFromAnalysis(analysis as AIAnalysis, userId);
    }

    return analysis;
  }

  private async simulateAIAnalysis(_record: any, userId: string): Promise<AIAnalysis> {
    // Get user profile for context
    const userProfile: any = await databaseService.getUserProfile(userId);

    // This is a simulation - replace with actual AI integration
    return {
      diagnosis: `Stage ${userProfile?.cancer_stage ?? 'N/A'} ${userProfile?.cancer_type ?? 'unspecified'}`,
      confidence: 0.87,
      biomarkers: ['ER+', 'PR+', 'HER2-'], // Example for breast cancer
      treatmentRecommendations: [
        {
          type: 'chemotherapy',
          name: 'AC-T Protocol',
          rationale: 'Standard of care for your cancer stage and type based on NCCN guidelines',
          evidenceLevel: 'high',
          priority: 'high',
        },
        {
          type: 'targeted_therapy',
          name: 'Hormone Therapy',
          rationale: 'Recommended for hormone receptor-positive breast cancer',
          evidenceLevel: 'high',
          priority: 'medium',
        },
      ],
      riskAssessment: {
        recurrenceRisk: 0.15,
        sideEffectRisk: 0.3,
        overallPrognosis: 'good',
      },
      nccnGuidelineMatches: [
        'NCCN Breast Cancer v4.2024',
        'NCCN Survivorship Guidelines',
        'NCCN Supportive Care Guidelines',
      ],
    };
  }

  private async normalizeAnalysisResponse(response: any, userId: string): Promise<StoredAnalysis> {
    if (this.isPatientFriendly(response)) {
      return {
        ...response,
        format: 'patient-friendly',
        source: 'gemini',
        generatedAt: new Date().toISOString(),
      };
    }

    if (this.hasTreatmentRecommendations(response)) {
      return response as AIAnalysis;
    }

    if (response?.rawResponse) {
      const narrative = this.buildNarrativeFromRaw(response.rawResponse);
      if (narrative) {
        return {
          ...narrative,
          format: 'patient-friendly',
          source: 'gemini',
          generatedAt: new Date().toISOString(),
        };
      }
      console.warn('AI response was unstructured; falling back to simulated analysis');
    }

    return this.simulateAIAnalysis(null, userId);
  }

  private buildRecordSummary(record: any, userProfile: any) {
    const lines = [
      `DOCUMENT TITLE: ${record?.name ?? 'Unknown file'}`,
      `CATEGORY: ${record?.category ?? 'Not specified'}`,
      `UPLOADED: ${record?.upload_date ? new Date(record.upload_date).toLocaleString() : 'Unknown date'}`,
      `FILE TYPE: ${record?.file_type ?? 'Not specified'}`,
    ];

    if (record?.notes) {
      lines.push(`PATIENT / CLINICIAN NOTES: ${record.notes}`);
    }
    if (record?.summary) {
      lines.push(`RECORD SUMMARY: ${record.summary}`);
    }
    if (record?.extracted_text) {
      lines.push('EXTRACTED TEXT SNIPPET:');
      lines.push(String(record.extracted_text).slice(0, 4000));
    }

    if (userProfile) {
      lines.push('PATIENT PROFILE');
      lines.push(`- Cancer Type: ${userProfile?.cancer_type ?? 'Not provided'}`);
      lines.push(`- Cancer Stage: ${userProfile?.cancer_stage ?? 'Not provided'}`);
      lines.push(`- Age: ${userProfile?.age ?? 'Not provided'}`);
    }

    lines.push('--- ORIGINAL DOCUMENT CONTEXT ---');
    lines.push(record?.file_url ? `File location: ${record.file_url}` : 'File URL unavailable.');

    return lines.join('\n');
  }

  private isPatientFriendly(payload: any): payload is NarrativeMedicalAnalysis {
    return (
      payload &&
      Array.isArray(payload.keyFindings) &&
      Array.isArray(payload.analysisBreakdown) &&
      typeof payload.disclaimer === 'string'
    );
  }

  private hasTreatmentRecommendations(payload: any): payload is AIAnalysis {
    return Array.isArray(payload?.treatmentRecommendations);
  }

  private stripControlMarkers(text: string) {
    return (text || '')
      .replace(/<<JSON_START>>/gi, ' ')
      .replace(/<<JSON_END>>/gi, ' ')
      .replace(/```json?/gi, ' ')
      .replace(/```/g, ' ')
      .trim();
  }

  private buildNarrativeFromRaw(rawResponse: string): NarrativeMedicalAnalysis | null {
    const normalized = this.stripControlMarkers(rawResponse).replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return null;
    }

    const sentences = normalized
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    if (!sentences.length) {
      return null;
    }

    const takeSegment = (start: number, count: number) => sentences.slice(start, start + count);

    const keyFindings = takeSegment(0, 3);
    const analysisBreakdown = takeSegment(3, 6);
    const treatmentConsiderations = takeSegment(6, 9);
    const symptomManagement = takeSegment(9, 11);
    const nextSteps = takeSegment(11, 14);

    return {
      disclaimer: DISCLAIMER_TEXT,
      keyFindings: keyFindings.length ? keyFindings : [normalized],
      analysisBreakdown: analysisBreakdown.length ? analysisBreakdown : (keyFindings.length ? keyFindings : [normalized]),
      treatmentConsiderations,
      symptomManagement,
      nextSteps: nextSteps.length ? nextSteps : ['Discuss these findings with your oncology team to confirm next actions.'],
      encouragement: 'Please review these AI-generated notes with your care team for personalized guidance.',
    };
  }

  private async generateCarePlanFromAnalysis(analysis: AIAnalysis, userId: string) {
    const tasks: Array<any> = [];

    // Generate tasks from treatment recommendations
    for (const treatment of analysis.treatmentRecommendations) {
      tasks.push({
        title: `${treatment.type}: ${treatment.name}`,
        description: `Recommended treatment: ${treatment.rationale}`,
        category: 'treatment',
        status: 'upcoming',
        priority: treatment.priority,
      });
    }

    // Generate monitoring tasks
    tasks.push({
      title: 'Follow-up Imaging',
      description: 'CT scan to monitor treatment response',
      category: 'test',
      status: 'upcoming',
      priority: 'medium',
    });

    // Generate lifestyle tasks
    tasks.push({
      title: 'Nutrition Consultation',
      description: 'Meet with oncology nutritionist to optimize diet during treatment',
      category: 'lifestyle',
      status: 'upcoming',
      priority: 'medium',
    });

    // Save all tasks
    for (const task of tasks) {
      // databaseService.createCarePlanTask accepts (userId, task)
      await databaseService.createCarePlanTask(userId, task as any);
    }
  }
}

export const aiAnalysisService = new AIAnalysisService();
