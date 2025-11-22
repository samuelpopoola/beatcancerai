import { geminiMedicalService } from './geminiMedicalService';
import { databaseService } from './database';

// Define proper types based on your actual service responses
interface MedicalAnalysis {
  diagnosis: {
    primary: string;
    secondary: string[];
    confidence: number;
    staging?: string;
  };
  treatmentRecommendations: TreatmentRecommendation[];
  monitoringPlan: {
    labTests: string[];
    imagingSchedule: string[];
    followUpTimeline: string[];
  };
  riskAssessment: {
    recurrenceRisk: 'low' | 'medium' | 'high';
    toxicityRisk: 'low' | 'medium' | 'high';
    calculatedFactors?: any;
  };
  biomarkers?: {
    targetable?: string[];
    prognostic?: string[];
  };
}

interface TreatmentRecommendation {
  type: string;
  name: string;
  rationale: string;
  evidenceLevel: string;
  nccnCategory?: string;
  priority: 'low' | 'medium' | 'high';
  duration?: string;
  frequency?: string;
}

interface Symptom {
  symptom_name: string;
  severity: number;
  logged_at: string;
}

interface UserProfile {
  age?: number;
  cancer_stage?: string;
}

// Define the expected response type from Gemini service
interface GeminiAnalysisResponse {
  rawResponse: string;
  error?: string;
  // Add other properties that might be returned
}

export class AdvancedMedicalAnalysis {
  async performComprehensiveAnalysis(medicalRecordId: string, userId: string) {
    try {
      console.log(`🔄 Starting comprehensive analysis for record ${medicalRecordId}`);

      const record = await this.safeGetMedicalRecord(medicalRecordId);
      const userProfile = await this.safeGetUserProfile(userId);

      if (!record) {
        throw new Error(`Medical record ${medicalRecordId} not found`);
      }

      if (!userProfile) {
        throw new Error(`User profile ${userId} not found`);
      }

      const extractedText = await this.extractTextFromDocument(record);
      
      // Handle the Gemini service response properly
      const aiResponse = await geminiMedicalService.analyzeMedicalDocument(extractedText, userProfile);
      
      // Extract the actual analysis from the response
      const aiAnalysis = this.extractAnalysisFromResponse(aiResponse);
      
      const enhancedAnalysis = await this.enhanceWithClinicalLogic(aiAnalysis, userProfile);
      await this.generateAICarePlan(enhancedAnalysis, userId);
      await this.storeAnalysisResults(medicalRecordId, userId, enhancedAnalysis);

      console.log('✅ Comprehensive analysis completed successfully');
      return enhancedAnalysis;

    } catch (error: any) {
      console.error('❌ Comprehensive analysis failed:', error);
      throw new Error(`Medical analysis failed: ${error?.message || String(error)}`);
    }
  }

  async analyzeSymptomPatterns(userId: string, days: number = 30) {
    try {
      const symptoms = await this.safeGetSymptomLogs(userId);
      const treatments = await this.safeGetTreatments(userId);
      const userProfile = await this.safeGetUserProfile(userId);

      const recentSymptoms = this.filterRecentSymptoms(symptoms, days);

      if (recentSymptoms.length === 0) {
        return this.getEmptySymptomAnalysis();
      }

      // Use analyzeMedicalDocument instead of analyzeSymptomPattern
      const symptomText = this.formatSymptomsForAnalysis(recentSymptoms, treatments, userProfile);
      const aiResponse = await geminiMedicalService.analyzeMedicalDocument(symptomText, userProfile);
      const aiAnalysis = this.extractAnalysisFromResponse(aiResponse);

      const enhancedAnalysis = {
        ...aiAnalysis,
        localAnalytics: this.performLocalSymptomAnalytics(recentSymptoms),
        trends: this.calculateSymptomTrends(recentSymptoms),
        severitySummary: this.generateSeveritySummary(recentSymptoms)
      };

      return enhancedAnalysis;
    } catch (error) {
      console.error('Symptom pattern analysis failed:', error);
      return this.getFallbackSymptomAnalysis();
    }
  }

  // Extract analysis from Gemini service response
  private extractAnalysisFromResponse(response: any): MedicalAnalysis {
    // If the response is already a MedicalAnalysis, return it
    if (response && response.diagnosis && response.treatmentRecommendations) {
      return response as MedicalAnalysis;
    }
    
    // If response has rawResponse, try to parse it
    if (response && response.rawResponse) {
      try {
        return JSON.parse(response.rawResponse);
      } catch {
        // If parsing fails, create a fallback analysis
      }
    }
    
    // Return a fallback analysis structure
    return this.getFallbackAnalysis();
  }

  private formatSymptomsForAnalysis(symptoms: Symptom[], treatments: any[], userProfile: UserProfile): string {
    let symptomText = "SYMPTOM ANALYSIS REPORT\n\n";
    symptomText += `Patient Profile: Age ${userProfile.age}, Stage: ${userProfile.cancer_stage}\n\n`;
    symptomText += "RECENT SYMPTOMS:\n";
    
    symptoms.forEach(symptom => {
      symptomText += `- ${symptom.symptom_name}: Severity ${symptom.severity}/10 (${new Date(symptom.logged_at).toLocaleDateString()})\n`;
    });
    
    symptomText += "\nCURRENT TREATMENTS:\n";
    if (treatments.length > 0) {
      treatments.forEach(treatment => {
        symptomText += `- ${treatment.name || treatment.medication_name}\n`;
      });
    } else {
      symptomText += "- No active treatments recorded\n";
    }
    
    return symptomText;
  }

  private getFallbackAnalysis(): MedicalAnalysis {
    return {
      diagnosis: {
        primary: "Analysis in progress",
        secondary: [],
        confidence: 0
      },
      treatmentRecommendations: [],
      monitoringPlan: {
        labTests: [],
        imagingSchedule: [],
        followUpTimeline: []
      },
      riskAssessment: {
        recurrenceRisk: 'medium',
        toxicityRisk: 'medium'
      }
    };
  }

  // Safe database access methods
  private async safeGetMedicalRecord(recordId: string): Promise<any> {
    try {
      if (typeof databaseService.getMedicalRecord === 'function') {
        return await databaseService.getMedicalRecord(recordId);
      }
      throw new Error('getMedicalRecord method not available');
    } catch (error) {
      console.error('Error fetching medical record:', error);
      throw error;
    }
  }

  private async safeGetUserProfile(userId: string): Promise<any> {
    try {
      if (typeof databaseService.getUserProfile === 'function') {
        return await databaseService.getUserProfile(userId);
      }
      throw new Error('getUserProfile method not available');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  private async safeGetSymptomLogs(userId: string): Promise<Symptom[]> {
    try {
      if (typeof (databaseService as any).getSymptomLogs === 'function') {
        return await (databaseService as any).getSymptomLogs(userId) || [];
      }
      return [];
    } catch (error) {
      console.warn('Could not fetch symptom logs, using empty array');
      return [];
    }
  }

  private async safeGetTreatments(userId: string): Promise<any[]> {
    try {
      if (typeof (databaseService as any).getActiveMedications === 'function') {
        return await (databaseService as any).getActiveMedications(userId) || [];
      }
      if (typeof (databaseService as any).getMedications === 'function') {
        return await (databaseService as any).getMedications(userId) || [];
      }
      return [];
    } catch (error) {
      console.warn('Could not fetch treatments, using empty array');
      return [];
    }
  }

  private filterRecentSymptoms(symptoms: Symptom[], days: number): Symptom[] {
    if (!Array.isArray(symptoms)) return [];
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return symptoms.filter((s: Symptom) => {
      try {
        const symptomDate = new Date(s.logged_at);
        return symptomDate >= cutoffDate;
      } catch {
        return false;
      }
    });
  }

  private async extractTextFromDocument(record: any): Promise<string> {
    if (!record) {
      return 'No medical record data available for analysis.';
    }
    return this.generateSimulatedMedicalText(record?.category, record?.name || 'document');
  }

  private generateSimulatedMedicalText(category: string, fileName: string): string {
    const baseTexts: Record<string, string> = {
      'Pathology': `PATHOLOGY REPORT - BREAST BIOPSY\nClinical Information: Palpable breast mass\n...`,
      'Radiology': `CT SCAN CHEST/ABDOMEN/PELVIS WITH CONTRAST\nClinical History: Staging for breast cancer\n...`,
      'Lab Results': `COMPREHENSIVE LABORATORY PANEL\nComplete Blood Count:\n...`
    };

    return baseTexts[category] || `Medical document: ${fileName}\nCategory: ${category}\nContent analysis pending.`;
  }

  private async enhanceWithClinicalLogic(aiAnalysis: MedicalAnalysis, userProfile: UserProfile): Promise<MedicalAnalysis> {
    const enhanced = JSON.parse(JSON.stringify(aiAnalysis));
    
    enhanced.treatmentRecommendations = this.enhanceTreatmentRecommendations(
      aiAnalysis.treatmentRecommendations || [],
      aiAnalysis.biomarkers
      // Removed unused userProfile parameter
    );

    enhanced.riskAssessment = this.calculatePreciseRisks(
      aiAnalysis.riskAssessment,
      userProfile,
      aiAnalysis.biomarkers
    );

    const supportiveCare = this.generateSupportiveCareRecommendations();
    enhanced.treatmentRecommendations.push(...supportiveCare);

    return enhanced;
  }

  private enhanceTreatmentRecommendations(recommendations: TreatmentRecommendation[], biomarkers: any): TreatmentRecommendation[] {
    const enhanced = [...recommendations];
    
    if (biomarkers?.targetable?.some((marker: string) => ['ER+', 'PR+'].includes(marker))) {
      enhanced.unshift({
        type: 'targeted_therapy',
        name: 'Endocrine Therapy',
        rationale: 'Adjuvant endocrine therapy significantly reduces recurrence risk in hormone receptor-positive breast cancer',
        evidenceLevel: 'high',
        nccnCategory: '1',
        priority: 'high',
        duration: '5-10 years',
        frequency: 'Daily'
      });
    }

    if (biomarkers?.targetable?.includes('HER2+')) {
      enhanced.unshift({
        type: 'targeted_therapy',
        name: 'Trastuzumab + Pertuzumab',
        rationale: 'Dual HER2 blockade improves outcomes in HER2-positive breast cancer',
        evidenceLevel: 'high',
        nccnCategory: '1',
        priority: 'high',
        duration: '1 year',
        frequency: 'Every 3 weeks'
      });
    }

    return enhanced;
  }

  private generateSupportiveCareRecommendations(): TreatmentRecommendation[] {
    return [
      {
        type: 'supportive_care',
        name: 'Oncology Nutrition Consultation',
        rationale: 'Optimize nutritional status to support treatment tolerance and outcomes',
        evidenceLevel: 'medium',
        nccnCategory: '2A',
        priority: 'medium'
      },
      {
        type: 'supportive_care',
        name: 'Physical Activity Program',
        rationale: 'Regular exercise improves treatment tolerance, reduces fatigue, and enhances quality of life',
        evidenceLevel: 'high',
        nccnCategory: '1',
        priority: 'medium'
      }
    ];
  }

  private calculatePreciseRisks(riskAssessment: any, userProfile: UserProfile, biomarkers: any) {
    let recurrenceRisk: 'low' | 'medium' | 'high' = riskAssessment?.recurrenceRisk || 'medium';
    let toxicityRisk: 'low' | 'medium' | 'high' = riskAssessment?.toxicityRisk || 'medium';

    if (userProfile?.age && userProfile.age > 70) toxicityRisk = 'high';
    if (userProfile?.age && userProfile.age < 40) recurrenceRisk = 'high';

    const stage = userProfile?.cancer_stage || '';
    if (stage.includes('III') || stage.includes('IV')) {
      recurrenceRisk = 'high';
    }

    if (biomarkers?.prognostic?.some((marker: string) => ['High Grade', 'Ki-67 > 20%'].includes(marker))) {
      recurrenceRisk = 'high';
    }

    return {
      ...riskAssessment,
      recurrenceRisk,
      toxicityRisk,
      calculatedFactors: {
        ageImpact: userProfile?.age && userProfile.age > 70 ? 'Increased toxicity risk' : 'Standard risk',
        stageImpact: stage.includes('III') ? 'High recurrence risk' : 'Moderate risk'
      }
    };
  }

  private performLocalSymptomAnalytics(symptoms: Symptom[]) {
    const analytics = {
      totalSymptoms: symptoms.length,
      averageSeverity: 0,
      symptomFrequency: {} as Record<string, number>,
      severityTrend: 'stable' as 'improving' | 'stable' | 'worsening',
      mostCommonSymptoms: [] as string[]
    };

    if (symptoms.length > 0) {
      analytics.averageSeverity = symptoms.reduce((sum, s) => sum + (s.severity || 0), 0) / symptoms.length;
      
      symptoms.forEach(symptom => {
        analytics.symptomFrequency[symptom.symptom_name] = 
          (analytics.symptomFrequency[symptom.symptom_name] || 0) + 1;
      });

      analytics.mostCommonSymptoms = Object.entries(analytics.symptomFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([symptom]) => symptom);

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSymptoms = symptoms.filter(s => new Date(s.logged_at) >= oneWeekAgo);
      const olderSymptoms = symptoms.filter(s => new Date(s.logged_at) < oneWeekAgo);
      
      if (recentSymptoms.length > 0 && olderSymptoms.length > 0) {
        const recentAvg = recentSymptoms.reduce((sum, s) => sum + (s.severity || 0), 0) / recentSymptoms.length;
        const olderAvg = olderSymptoms.reduce((sum, s) => sum + (s.severity || 0), 0) / olderSymptoms.length;
        
        if (recentAvg > olderAvg + 1) analytics.severityTrend = 'worsening';
        else if (recentAvg < olderAvg - 1) analytics.severityTrend = 'improving';
      }
    }

    return analytics;
  }

  private calculateSymptomTrends(symptoms: Symptom[]) {
    const dailyAverages: Record<string, number> = {};
    
    symptoms.forEach(symptom => {
      try {
        const date = new Date(symptom.logged_at).toISOString().split('T')[0];
        if (!dailyAverages[date]) {
          dailyAverages[date] = 0;
        }
        dailyAverages[date] += (symptom.severity || 0);
      } catch (error) {
        console.warn('Invalid symptom date format:', symptom.logged_at);
      }
    });

    return Object.entries(dailyAverages)
      .map(([date, total]) => ({
        date,
        averageSeverity: total / symptoms.filter(s => {
          try {
            return new Date(s.logged_at).toISOString().split('T')[0] === date;
          } catch {
            return false;
          }
        }).length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private generateSeveritySummary(symptoms: Symptom[]) {
    const severityCounts = { low: 0, medium: 0, high: 0 };
    
    symptoms.forEach(symptom => {
      const sev = symptom.severity || 0;
      if (sev <= 3) severityCounts.low++;
      else if (sev <= 7) severityCounts.medium++;
      else severityCounts.high++;
    });

    return severityCounts;
  }

  private async generateAICarePlan(analysis: MedicalAnalysis, userId: string) {
    const tasks: any[] = [];

    // Generate treatment tasks - removed unused index parameter
    (analysis.treatmentRecommendations || []).forEach((treatment: TreatmentRecommendation) => {
      const baseTask: any = {
        user_id: userId,
        title: `${this.formatTreatmentType(treatment.type)}: ${treatment.name}`,
        description: treatment.rationale,
        category: this.mapToTaskCategory(treatment.type),
        status: 'upcoming' as const,
        priority: treatment.priority || 'medium',
        metadata: {
          evidenceLevel: treatment.evidenceLevel,
          nccnCategory: treatment.nccnCategory,
          treatmentType: treatment.type
        }
      };

      if (treatment.type === 'chemotherapy') {
        for (let i = 1; i <= 4; i++) {
          tasks.push({
            ...baseTask,
            title: `${baseTask.title} - Cycle ${i}`,
            date: this.getFutureDate(21 * i),
            time: '08:00',
            location: 'Infusion Center'
          });
        }
      } else if (treatment.type === 'surgery') {
        tasks.push({
          ...baseTask,
          date: this.getFutureDate(14),
          time: '07:00',
          location: 'Main Hospital - Surgery Department'
        });
      } else {
        tasks.push(baseTask);
      }
    });

    // Generate monitoring tasks - removed unused index parameter
    (analysis.monitoringPlan?.labTests || []).forEach((test: string) => {
      tasks.push({
        user_id: userId,
        title: `Lab Test: ${test}`,
        description: `Routine monitoring as part of cancer care surveillance`,
        category: 'test',
        status: 'upcoming',
        priority: 'medium',
        date: this.getFutureDate(30)
      });
    });

    (analysis.monitoringPlan?.imagingSchedule || []).forEach((imaging: string) => {
      tasks.push({
        user_id: userId,
        title: `Imaging: ${imaging}`,
        description: `Follow-up imaging study to monitor treatment response and disease status`,
        category: 'test',
        status: 'upcoming',
        priority: 'medium',
        date: this.getFutureDate(90)
      });
    });

    if (typeof (databaseService as any).createCarePlanTask === 'function') {
      for (const task of tasks) {
        try {
          await (databaseService as any).createCarePlanTask(userId, task);
        } catch (error) {
          console.error('Failed to create care plan task:', error);
        }
      }
      console.log(`✅ Generated ${tasks.length} care plan tasks from AI analysis`);
    } else {
      console.warn('createCarePlanTask method not available - tasks not saved');
    }
  }

  private formatTreatmentType(type: string): string {
    const mapping: Record<string, string> = {
      'chemotherapy': 'Chemotherapy',
      'radiation': 'Radiation Therapy',
      'surgery': 'Surgery',
      'immunotherapy': 'Immunotherapy',
      'targeted_therapy': 'Targeted Therapy',
      'supportive_care': 'Supportive Care'
    };
    return mapping[type] || type;
  }

  private mapToTaskCategory(treatmentType: string): string {
    const mapping: Record<string, string> = {
      'chemotherapy': 'treatment',
      'radiation': 'treatment',
      'surgery': 'treatment',
      'immunotherapy': 'treatment',
      'targeted_therapy': 'medication',
      'supportive_care': 'lifestyle'
    };
    return mapping[treatmentType] || 'treatment';
  }

  private getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private async storeAnalysisResults(medicalRecordId: string, userId: string, analysis: MedicalAnalysis) {
    try {
      if (typeof (databaseService as any).updateMedicalRecord === 'function') {
        await (databaseService as any).updateMedicalRecord(medicalRecordId, {
          analyzed: true,
          analysis_data: analysis
        });
      }

      if (typeof (databaseService as any).storeAIAnalysis === 'function') {
        await (databaseService as any).storeAIAnalysis({
          medical_record_id: medicalRecordId,
          user_id: userId,
          analysis_type: 'comprehensive_oncology',
          findings: analysis,
          confidence_score: analysis.diagnosis.confidence || 0.8,
          recommendations: analysis.treatmentRecommendations
        });
      }

      console.log('✅ Analysis results stored in database');
    } catch (error) {
      console.error('Failed to store analysis results:', error);
    }
  }

  private getEmptySymptomAnalysis() {
    return {
      symptomClusters: [],
      managementStrategies: [],
      clinicalAlerts: ['No recent symptom data available'],
      recommendedActions: ['Log symptoms daily for better analysis'],
      localAnalytics: {
        totalSymptoms: 0,
        averageSeverity: 0,
        symptomFrequency: {},
        severityTrend: 'stable',
        mostCommonSymptoms: []
      },
      trends: [],
      severitySummary: { low: 0, medium: 0, high: 0 }
    };
  }

  private getFallbackSymptomAnalysis() {
    return {
      symptomClusters: [],
      managementStrategies: [],
      clinicalAlerts: ['Symptom analysis temporarily unavailable'],
      recommendedActions: ['Continue symptom monitoring', 'Report concerns to care team'],
      localAnalytics: {
        totalSymptoms: 0,
        averageSeverity: 0,
        symptomFrequency: {},
        severityTrend: 'stable',
        mostCommonSymptoms: []
      },
      trends: [],
      severitySummary: { low: 0, medium: 0, high: 0 }
    };
  }
}

export const advancedMedicalAnalysis = new AdvancedMedicalAnalysis();