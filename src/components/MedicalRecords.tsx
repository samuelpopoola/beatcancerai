import React, { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Search, Filter, LayoutGrid, List as ListIcon, Sparkles, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { databaseService } from '../services/database';
import { aiAnalysisService } from '../services/aiAnalysisService';
import { NarrativeMedicalAnalysis } from '../utils/geminiAnalysis';

const isNarrativeAnalysis = (payload: any): payload is NarrativeMedicalAnalysis => (
  payload &&
  Array.isArray(payload.keyFindings) &&
  Array.isArray(payload.analysisBreakdown) &&
  typeof payload.disclaimer === 'string'
);

const tryParseJson = (value: any) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const SECTION_DEFINITIONS = [
  { id: 'clinical', title: 'Clinical Findings & Imaging' },
  { id: 'patient', title: 'Patient & Diagnosis Information' },
  { id: 'treatment', title: 'Treatment Plan & History' },
  { id: 'preventive', title: 'Preventive Measures' },
  { id: 'monitoring', title: 'Monitoring & Follow-Up' },
  { id: 'symptoms', title: 'Symptoms' },
  { id: 'supportive', title: 'Supportive Care & Additional Information' },
] as const;

const SECTION_EMPTY_TEXT = 'Information not provided in this AI summary.';
const PREVENTIVE_KEYWORDS = ['prevent', 'prevention', 'lifestyle', 'nutrition', 'exercise', 'screen', 'vaccine', 'reduce risk'];
const MONITORING_KEYWORDS = ['monitor', 'follow-up', 'follow up', 'check', 'review', 'track', 'schedule', 'scan', 'imaging', 'labs'];

const uniqueStrings = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const ensureStringArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => ensureStringArray(entry));
  }
  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (value && typeof value === 'object') {
    if ('name' in value || 'type' in value || 'rationale' in value) {
      return [
        [value.name || value.type, value.rationale ? `Reason: ${value.rationale}` : null, value.urgency ? `Urgency: ${value.urgency}` : null]
          .filter(Boolean)
          .join(' • '),
      ];
    }
    if ('title' in value && 'description' in value) {
      return [`${value.title}: ${value.description}`];
    }
    try {
      return [JSON.stringify(value)];
    } catch (err) {
      return [String(value)];
    }
  }
  return [];
};

const filterByKeywords = (entries: string[], keywords: string[]) => {
  if (!entries.length) return [];
  const lowered = keywords.map((keyword) => keyword.toLowerCase());
  return entries.filter((entry) => {
    const text = entry.toLowerCase();
    return lowered.some((keyword) => text.includes(keyword));
  });
};

const formatDiagnosisSummary = (diagnosis: any) => {
  if (!diagnosis || typeof diagnosis !== 'object') return null;
  const parts: string[] = [];
  if (diagnosis.primary) parts.push(`Primary: ${diagnosis.primary}`);
  if (Array.isArray(diagnosis.differentials) && diagnosis.differentials.length) {
    parts.push(`Differentials: ${diagnosis.differentials.join(', ')}`);
  }
  if (diagnosis.staging) parts.push(`Stage: ${diagnosis.staging}`);
  if (typeof diagnosis.confidence === 'number') {
    const pct = diagnosis.confidence > 1 ? diagnosis.confidence : diagnosis.confidence * 100;
    parts.push(`Confidence: ${pct.toFixed(1)}%`);
  }
  if (diagnosis.notes) parts.push(`Notes: ${diagnosis.notes}`);
  return parts.length ? parts.join(' • ') : null;
};

const buildNarrativeSectionMap = (analysis: NarrativeMedicalAnalysis) => {
  const nextSteps = ensureStringArray(analysis.nextSteps);
  const preventive = filterByKeywords(nextSteps, PREVENTIVE_KEYWORDS);
  const monitoring = filterByKeywords(nextSteps, MONITORING_KEYWORDS);

  return {
    clinical: uniqueStrings([
      ...ensureStringArray(analysis.keyFindings),
      ...ensureStringArray(analysis.analysisBreakdown?.slice(0, 1)),
    ]),
    patient: uniqueStrings([
      ...ensureStringArray(analysis.analysisBreakdown?.slice(1)),
    ]),
    treatment: uniqueStrings(ensureStringArray(analysis.treatmentConsiderations)),
    preventive: uniqueStrings(preventive.length ? preventive : nextSteps),
    monitoring: uniqueStrings(monitoring.length ? monitoring : nextSteps),
    symptoms: uniqueStrings(ensureStringArray(analysis.symptomManagement)),
    supportive: uniqueStrings([
      ...ensureStringArray(analysis.encouragement),
      ...ensureStringArray(analysis.disclaimer),
    ]),
  } as Record<string, string[]>;
};

const buildStructuredSectionMap = (analysis: any) => {
  const treatmentPlans = Array.isArray(analysis.treatmentRecommendations)
    ? analysis.treatmentRecommendations.map((item: any) =>
        [item.name || item.type || 'Treatment', item.rationale ? `Reason: ${item.rationale}` : null, item.priority ? `Priority: ${item.priority}` : null]
          .filter(Boolean)
          .join(' • ')
      )
    : ensureStringArray(analysis.treatmentPlan);

  if (Array.isArray(analysis.treatmentHistory)) {
    treatmentPlans.push(
      ...analysis.treatmentHistory.map((entry: any) =>
        typeof entry === 'string' ? `History: ${entry}` : `History: ${JSON.stringify(entry)}`
      ),
    );
  }

  const nextSteps = ensureStringArray(analysis.suggestedNextSteps);
  const preventive = filterByKeywords([...treatmentPlans, ...nextSteps], PREVENTIVE_KEYWORDS);

  return {
    clinical: uniqueStrings([
      ...ensureStringArray(analysis.findings),
      ...ensureStringArray(analysis.imagingFindings),
      ...ensureStringArray(analysis.imagingSummary),
      ...ensureStringArray(analysis.diagnosis?.notes),
    ]),
    patient: uniqueStrings([
      ...ensureStringArray(formatDiagnosisSummary(analysis.diagnosis)),
      ...ensureStringArray(analysis.patientFriendlySummary),
    ]),
    treatment: uniqueStrings(treatmentPlans),
    preventive: uniqueStrings(preventive.length ? preventive : nextSteps),
    monitoring: uniqueStrings([
      ...ensureStringArray(analysis.monitoring),
      ...ensureStringArray(analysis.monitoringPlan?.labTests),
      ...ensureStringArray(analysis.monitoringPlan?.imagingSchedule),
      ...ensureStringArray(analysis.monitoringPlan?.followUpTimeline),
      ...ensureStringArray(filterByKeywords(nextSteps, MONITORING_KEYWORDS)),
    ]),
    symptoms: uniqueStrings([
      ...ensureStringArray(analysis.symptoms),
      ...ensureStringArray(analysis.symptomManagement),
      ...ensureStringArray(analysis.symptomSummary),
    ]),
    supportive: uniqueStrings([
      ...ensureStringArray(analysis.supportiveCare),
      ...ensureStringArray(analysis.additionalNotes),
      ...ensureStringArray(analysis.encouragement),
      ...ensureStringArray(analysis.patientFriendlySummary ? `Summary: ${analysis.patientFriendlySummary}` : null),
    ]),
  } as Record<string, string[]>;
};

const buildAnalysisSections = (analysis: any | null) => {
  const map = analysis
    ? isNarrativeAnalysis(analysis)
      ? buildNarrativeSectionMap(analysis)
      : buildStructuredSectionMap(analysis)
    : {};

  return SECTION_DEFINITIONS.map((section) => ({
    ...section,
    entries: map[section.id] || [],
  }));
};

const MedicalRecords: React.FC = () => {
  const { user } = useApp();
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const renderStructuredAnalysis = (analysis: any) => {
    if (!analysis) return null;

    const diagnosis = analysis.diagnosis;
    const findings = Array.isArray(analysis.findings) ? analysis.findings : [];
    const treatmentRecommendations = Array.isArray(analysis.treatmentRecommendations)
      ? analysis.treatmentRecommendations
      : Array.isArray(analysis.treatmentSuggestions)
      ? analysis.treatmentSuggestions
      : [];
    const monitoring = Array.isArray(analysis.monitoring)
      ? analysis.monitoring
      : Array.isArray(analysis.monitoringPlan)
      ? [
          ...(Array.isArray(analysis.monitoringPlan.labTests) ? analysis.monitoringPlan.labTests : []),
          ...(Array.isArray(analysis.monitoringPlan.imagingSchedule) ? analysis.monitoringPlan.imagingSchedule : []),
          ...(Array.isArray(analysis.monitoringPlan.followUpTimeline) ? analysis.monitoringPlan.followUpTimeline : []),
        ]
      : [];
    const patientSummary = analysis.patientFriendlySummary;
    const nextSteps = Array.isArray(analysis.suggestedNextSteps) ? analysis.suggestedNextSteps : [];
    const riskAssessment = analysis.riskAssessment;
    const guidelineMatches = Array.isArray(analysis.nccnGuidelineMatches) ? analysis.nccnGuidelineMatches : [];

    const rawConfidence = typeof analysis.confidence === 'number' ? analysis.confidence : null;
    const confidencePercent = rawConfidence === null ? null : rawConfidence > 1 ? rawConfidence : rawConfidence * 100;

    const hasSummaryContent = Boolean(
      diagnosis || findings.length || treatmentRecommendations.length || monitoring.length || patientSummary || nextSteps.length || riskAssessment || guidelineMatches.length
    );

    const renderList = (items: string[]) => (
      <ul className="list-disc list-inside space-y-1">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    );

    return (
      <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
        {diagnosis && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Diagnosis Overview</h4>
            {typeof diagnosis === 'string' ? (
              <p className="mt-1 leading-relaxed">{diagnosis}</p>
            ) : (
              <div className="mt-2 space-y-1">
                {diagnosis.primary && (
                  <p><span className="font-medium">Primary:</span> {diagnosis.primary}</p>
                )}
                {Array.isArray(diagnosis.differentials) && diagnosis.differentials.length > 0 && (
                  <p>
                    <span className="font-medium">Differentials:</span> {diagnosis.differentials.join(', ')}
                  </p>
                )}
                {diagnosis.notes && (
                  <p><span className="font-medium">Notes:</span> {diagnosis.notes}</p>
                )}
                {diagnosis.staging && (
                  <p><span className="font-medium">Staging:</span> {diagnosis.staging}</p>
                )}
              </div>
            )}
          </div>
        )}

        {confidencePercent !== null && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Confidence Score</h4>
            <p className="mt-1">{confidencePercent.toFixed(1)}%</p>
          </div>
        )}

        {findings.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Key Findings</h4>
            <div className="mt-2">{renderList(findings.map((f) => String(f)))}</div>
          </div>
        )}

        {treatmentRecommendations.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Treatment Recommendations</h4>
            <div className="mt-2 space-y-3">
              {treatmentRecommendations.map((t: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t.name || t.type || 'Recommendation'}</div>
                    {t.priority && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">{t.priority}</span>
                    )}
                  </div>
                  {t.rationale && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{t.rationale}</p>}
                  {t.evidence && Array.isArray(t.evidence) && t.evidence.length > 0 && (
                    <p className="text-[11px] text-gray-500 mt-1">Evidence: {t.evidence.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {monitoring.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Monitoring & Follow-up</h4>
            <div className="mt-2">{renderList(monitoring.map((item: any) => String(item)))}</div>
          </div>
        )}

        {patientSummary && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-4">
            <h4 className="text-base font-semibold text-emerald-900 dark:text-emerald-100">Patient-Friendly Summary</h4>
            <p className="mt-2 text-sm leading-relaxed text-emerald-900 dark:text-emerald-50">{patientSummary}</p>
          </div>
        )}

        {nextSteps.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Suggested Next Steps</h4>
            <div className="mt-2">{renderList(nextSteps.map((step) => String(step)))}</div>
          </div>
        )}

        {riskAssessment && typeof riskAssessment === 'object' && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Risk Assessment</h4>
            <div className="mt-2 space-y-1">
              {Object.entries(riskAssessment).map(([key, value]) => (
                <p key={key} className="capitalize">
                  <span className="font-medium">{key.replace(/_/g, ' ')}:</span> {String(value)}
                </p>
              ))}
            </div>
          </div>
        )}

        {guidelineMatches.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">NCCN Guideline References</h4>
            <div className="mt-2">{renderList(guidelineMatches)}</div>
          </div>
        )}

        {!hasSummaryContent && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The AI response did not include a patient-friendly summary. Try re-running the analysis or use the “Show raw” toggle for technical JSON details.
            </p>
          </div>
        )}
      </div>
    );
  };

  const resolveAnalysisPayload = React.useCallback((record: any) => {
    const payload = record?.analysis_data ?? record?.analysis ?? null;
    if (!payload) return null;
    return tryParseJson(payload);
  }, []);

  const summarizeAnalysisSnippet = React.useCallback((record: any) => {
    const analysis = resolveAnalysisPayload(record);
    if (!analysis) return null;

    if (isNarrativeAnalysis(analysis)) {
      return (
        analysis.keyFindings?.[0] ||
        analysis.analysisBreakdown?.[0] ||
        analysis.nextSteps?.[0] ||
        analysis.disclaimer ||
        null
      );
    }

    if (Array.isArray(analysis.findings) && analysis.findings.length > 0) {
      const firstFinding = analysis.findings[0];
      return typeof firstFinding === 'string' ? firstFinding : JSON.stringify(firstFinding);
    }

    if (Array.isArray(analysis.treatmentRecommendations) && analysis.treatmentRecommendations.length > 0) {
      const recommendation = analysis.treatmentRecommendations[0];
      return typeof recommendation === 'string' ? recommendation : JSON.stringify(recommendation);
    }

    if (typeof analysis.summary === 'string') {
      return analysis.summary;
    }

    return null;
  }, [resolveAnalysisPayload]);

  const categories = React.useMemo(() => {
    const unique = new Set(
      medicalRecords.map((record) => record.category || 'Other')
    );
    return ['All', ...Array.from(unique)];
  }, [medicalRecords]);

  const filteredRecords = React.useMemo(() => {
    return medicalRecords.filter((record) => {
      const matchesCategory = categoryFilter === 'All' || record.category === categoryFilter;
      const matchesSearch = !searchTerm || record.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [medicalRecords, categoryFilter, searchTerm]);

  const totalRecords = medicalRecords.length;
  const analyzedRecords = medicalRecords.filter((record) => record.analyzed).length;
  const pendingRecords = Math.max(totalRecords - analyzedRecords, 0);
  const coveragePercentage = totalRecords ? Math.round((analyzedRecords / totalRecords) * 100) : 0;
  const lastUpdated = medicalRecords[0]?.upload_date
    ? new Date(medicalRecords[0].upload_date).toLocaleDateString()
    : '—';

  const timelineRecords = React.useMemo(() => {
    return [...medicalRecords]
      .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
      .slice(0, 6);
  }, [medicalRecords]);

  const aiHighlights = React.useMemo(() => {
    return medicalRecords
      .filter((record) => record.analyzed)
      .map((record) => {
        const summary = summarizeAnalysisSnippet(record);
        if (!summary) return null;
        return {
          id: record.id,
          name: record.name,
          category: record.category,
          summary,
          date: record.upload_date,
        };
      })
      .filter((entry): entry is { id: string; name: string; category: string; summary: string; date?: string } => Boolean(entry))
      .slice(0, 3);
  }, [medicalRecords, summarizeAnalysisSnippet]);

  const analysisSections = React.useMemo(() => {
    if (!selectedRecord?.analysis) return [];
    return buildAnalysisSections(selectedRecord.analysis);
  }, [selectedRecord?.analysis]);

  useEffect(() => {
    if (user?.id) {
      loadMedicalRecords(user.id);
    }
  }, [user]);

  const loadMedicalRecords = async (userId: string) => {
    try {
      const records = await databaseService.getMedicalRecords(userId);
      setMedicalRecords(records);
    } catch (error) {
      console.error('Error loading medical records:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    try {
      const fileUrl = await databaseService.uploadMedicalRecord(file as File, user.id);
      
      const record = await databaseService.createMedicalRecord(user.id, {
        name: file.name,
        file_type: file.type,
        category: 'Other',
        file_url: fileUrl,
        analyzed: false,
      } as any);

      setAnalyzing(record.id);
      await aiAnalysisService.analyzeMedicalRecord(record.id, user.id);
      await loadMedicalRecords(user.id);
    } catch (error) {
      console.error('Error uploading medical record:', error);
    } finally {
      setUploading(false);
      setAnalyzing(null);
    }
  };

  const handleAnalyzeRecord = async (recordId: string) => {
    if (!user?.id) return;
    setAnalyzing(recordId);
    try {
      await aiAnalysisService.analyzeMedicalRecord(recordId, user.id);
      await loadMedicalRecords(user.id);
    } catch (error) {
      console.error('Error analyzing medical record:', error);
    } finally {
      setAnalyzing(null);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!user?.id) return;
    const confirmed = window.confirm('Delete this medical record permanently?');
    if (!confirmed) return;

    setDeletingRecordId(recordId);
    try {
      await databaseService.deleteMedicalRecord(recordId);
      await loadMedicalRecords(user.id);
      if (selectedRecord?.id === recordId) {
        setShowAnalysisModal(false);
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error('Error deleting medical record:', error);
    } finally {
      setDeletingRecordId(null);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Pathology': return 'bg-red-100 text-red-700 border-red-300';
      case 'Radiology': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Clinical Notes': return 'bg-green-100 text-green-700 border-green-300';
      case 'Lab Results': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getDocumentIconStyles = (category: string) => {
    switch (category) {
      case 'Pathology':
        return 'from-rose-500/85 via-orange-400/70 to-yellow-300/60 text-white shadow-rose-500/30';
      case 'Radiology':
        return 'from-sky-500/85 via-blue-500/70 to-indigo-400/60 text-white shadow-sky-500/30';
      case 'Clinical Notes':
        return 'from-emerald-500/85 via-green-500/70 to-lime-400/60 text-white shadow-emerald-500/30';
      case 'Lab Results':
        return 'from-purple-500/85 via-violet-500/70 to-fuchsia-400/60 text-white shadow-purple-500/30';
      default:
        return 'from-slate-500/85 via-slate-500/70 to-slate-400/60 text-white shadow-slate-500/30';
    }
  };

  const openAnalysisModal = async (record: any) => {
    if (!record.analyzed) return;
    try {
      let analysis: any = null;

      if (user?.id) {
        const aiAnalyses = await databaseService.getAIAnalyses(user.id);
        const preferred = (aiAnalyses || []).find(
          (a: any) =>
            a.medical_record_id === record.id &&
            (a.analysis_type === 'comprehensive_oncology' || String(a.analysis_type).toLowerCase().includes('gemini'))
        );
        const fallbackMatch = (aiAnalyses || []).find((a: any) => a.medical_record_id === record.id);
        const match = preferred || fallbackMatch;

        if (match) {
          let findingsField: any = tryParseJson(match.findings ?? match.findings);

          if (isNarrativeAnalysis(findingsField)) {
            analysis = { ...findingsField, _raw: match };
          } else {
            let mappedFindings: any[] = [];
            let mappedRecommendations: any[] = [];

            if (
              findingsField &&
              typeof findingsField === 'object' &&
              !Array.isArray(findingsField) &&
              (Array.isArray(findingsField.findings) || Array.isArray(findingsField.recommendations))
            ) {
              mappedFindings = findingsField.findings ?? [];
              mappedRecommendations = findingsField.recommendations ?? [];
            } else {
              mappedFindings = Array.isArray(findingsField)
                ? findingsField
                : findingsField
                ? [findingsField]
                : [];

              let recField: any = tryParseJson(match.recommendations ?? match.recommendations);
              mappedRecommendations = Array.isArray(recField)
                ? recField
                : recField
                ? [recField]
                : [];
            }

            const sourceDiagnosis =
              typeof findingsField === 'object' && findingsField?.diagnosis
                ? findingsField.diagnosis
                : null;

            analysis = {
              diagnosis: sourceDiagnosis ?? match.diagnosis ?? null,
              confidence:
                match.confidence_score ??
                match.confidence ??
                (findingsField && (findingsField as any).confidence) ??
                null,
              findings: mappedFindings,
              treatmentRecommendations: mappedRecommendations,
              _raw: match,
            };
          }
        }
      }

      if (!analysis) {
        const fresh = await databaseService.getMedicalRecord(record.id);
        let fallbackAnalysis: any =
          (fresh as any)?.analysis_data || (fresh as any)?.analysis || (record as any)?.analysis;
        fallbackAnalysis = tryParseJson(fallbackAnalysis);

        if (isNarrativeAnalysis(fallbackAnalysis)) {
          analysis = { ...fallbackAnalysis, _raw: fallbackAnalysis?._raw ?? null };
        } else {
          analysis = fallbackAnalysis;
        }
      }

      setSelectedRecord({ ...record, analysis });
    } catch (err) {
      setSelectedRecord(record);
    }

    setShowAnalysisModal(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Medical Records Vault</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Securely store, organize, and analyze your complete health history with AI-powered context
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Records</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{totalRecords}</span>
            <span className="text-xs text-gray-500">documents</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs uppercase tracking-wide text-gray-500">AI Coverage</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{coveragePercentage}%</span>
            <div className="text-xs text-gray-500">
              <p>{analyzedRecords} analyzed</p>
              <p>{pendingRecords} pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs uppercase tracking-wide text-gray-500">Latest Upload</p>
          <div className="mt-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{lastUpdated}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Most recent document</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-white/80">Suggested Action</p>
          <p className="mt-2 text-lg font-semibold">Run fresh AI summary</p>
          <p className="text-sm text-white/80 mt-1">Upload new labs or scans to keep care team synced</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-dashed border-gray-300 dark:border-gray-600">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30">
                    <Upload className="w-10 h-10" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-3 py-1 text-xs font-semibold bg-white dark:bg-gray-900 rounded-full shadow-lg text-blue-600 dark:text-blue-300 border border-blue-100/60 dark:border-blue-900/40">
                    Secure Upload
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Medical Records</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Drag & drop or browse files. Our AI will classify, extract key data, and prep a shareable summary automatically.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 uppercase tracking-wide">
                  <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">PDF</span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">Imaging</span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">Lab Results</span>
                </div>
              </div>
              <label className="btn-primary cursor-pointer self-start">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.dicom"
                  disabled={uploading}
                />
                {uploading ? 'Uploading...' : 'Choose Files'}
              </label>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search documents by name"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-9 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm appearance-none"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'border-blue-500 text-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 rounded-lg border ${viewMode === 'list' ? 'border-blue-500 text-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 uppercase tracking-wide">
              <span>Showing {filteredRecords.length} of {medicalRecords.length} records</span>
              <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> AI ready</span>
              <span className="flex items-center gap-1 text-amber-500"><AlertCircle className="w-3 h-3" /> Pending</span>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Documents</h3>
                <p className="text-sm text-gray-500">Review uploads, trigger AI when ready, or clean up files</p>
              </div>
              {analyzing && (
                <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  Analyzing new upload...
                </span>
              )}
            </div>

            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No records match your filters yet</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredRecords.map((record) => {
                  const snippet = summarizeAnalysisSnippet(record);
                  const isAnalyzingRecord = analyzing === record.id;
                  const isDeletingRecord = deletingRecordId === record.id;
                  return (
                    <div
                      key={record.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${getDocumentIconStyles(record.category)} flex items-center justify-center shadow-lg`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(record.upload_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(record.category)}`}>
                          {record.category || 'Other'}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{record.name}</h4>
                      {snippet && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mt-2">
                          “{snippet}”
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex items-center text-xs font-medium">
                          {isAnalyzingRecord ? (
                            <span className="flex items-center text-blue-600">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Analyzing...
                            </span>
                          ) : record.analyzed ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Ready
                            </span>
                          ) : (
                            <span className="text-amber-500 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Awaiting AI
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {record.analyzed ? (
                            <button
                              onClick={() => openAnalysisModal(record)}
                              className="px-3 py-1 rounded-lg text-sm font-medium text-blue-600 hover:text-blue-700"
                              disabled={isAnalyzingRecord}
                            >
                              View Analysis
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAnalyzeRecord(record.id)}
                              className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
                              disabled={isAnalyzingRecord}
                            >
                              {isAnalyzingRecord ? 'Analyzing…' : 'Analyze with AI'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="px-3 py-1 rounded-lg text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                            disabled={isDeletingRecord}
                          >
                            {isDeletingRecord ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRecords.map((record) => {
                  const snippet = summarizeAnalysisSnippet(record);
                  const isAnalyzingRecord = analyzing === record.id;
                  const isDeletingRecord = deletingRecordId === record.id;
                  return (
                    <div key={record.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${getDocumentIconStyles(record.category)} flex items-center justify-center shadow-md`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{record.name}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{record.category} • {new Date(record.upload_date).toLocaleDateString()}</p>
                        {snippet && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{snippet}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {isAnalyzingRecord ? (
                          <span className="flex items-center text-blue-600 text-sm">
                            <AlertCircle className="w-4 h-4 mr-1" /> Analyzing…
                          </span>
                        ) : record.analyzed ? (
                          <span className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" /> Analyzed
                          </span>
                        ) : (
                          <span className="flex items-center text-amber-500 text-sm">
                            <AlertCircle className="w-4 h-4 mr-1" /> Pending
                          </span>
                        )}
                        {record.analyzed ? (
                          <button
                            onClick={() => openAnalysisModal(record)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                            disabled={isAnalyzingRecord}
                          >
                            View Analysis
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAnalyzeRecord(record.id)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
                            disabled={isAnalyzingRecord}
                          >
                            {isAnalyzingRecord ? 'Analyzing…' : 'Analyze with AI'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                          disabled={isDeletingRecord}
                        >
                          {isDeletingRecord ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {medicalRecords.length === 0 && !uploading && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-200 mb-2">No medical records yet</h3>
              <p className="text-gray-500 dark:text-gray-300">Upload your first medical document to get AI-powered insights</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* AI Highlights */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 text-white rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-amber-300" />
              <div>
                <p className="text-sm uppercase tracking-wide text-white/70">AI Highlights</p>
                <p className="text-lg font-semibold">Insights to review</p>
              </div>
            </div>
            {aiHighlights.length === 0 ? (
              <p className="text-sm text-white/70">As soon as AI completes analyses, your key findings will appear here.</p>
            ) : (
              <div className="space-y-4">
                {aiHighlights.map((highlight) => (
                  <div key={highlight.id} className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs uppercase text-white/60">{highlight.category}</p>
                    <p className="font-semibold mt-1">{highlight.name}</p>
                    <p className="text-sm text-white/80 mt-1 line-clamp-3">{highlight.summary}</p>
                    <button
                      className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200"
                      onClick={() => {
                        const sourceRecord = medicalRecords.find((r) => r.id === highlight.id);
                        if (sourceRecord) {
                          openAnalysisModal(sourceRecord);
                        }
                      }}
                    >
                      Open analysis →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
            <div className="mt-4 space-y-4">
              {timelineRecords.length === 0 && (
                <p className="text-sm text-gray-500">No uploads recorded yet.</p>
              )}
              {timelineRecords.map((record, index) => (
                <div key={record.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-3 h-3 rounded-full ${record.analyzed ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    {index < timelineRecords.length - 1 && (
                      <span className="flex-1 w-px bg-gray-200 dark:bg-gray-700 mt-1" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{record.name}</p>
                    <p className="text-xs text-gray-500">{new Date(record.upload_date).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">{record.category} • {record.analyzed ? 'AI ready' : 'Processing'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      {showAnalysisModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAnalysisModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/5 max-w-3xl w-full mx-4 p-6 z-10 overflow-auto max-h-[80vh] text-gray-700 dark:text-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Analysis for {selectedRecord.name}</h3>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(() => {
                    const narrativeSource = isNarrativeAnalysis(selectedRecord.analysis)
                      ? 'gemini_patient_summary'
                      : null;
                    const label = selectedRecord.analysis?._raw?.analysis_type || narrativeSource || 'medical_records';
                    return (
                      <span>
                        Source: <span className="font-medium">{String(label)}</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  className="text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
                  onClick={() => setShowRawJson((s) => !s)}
                >
                  {showRawJson ? 'Hide raw' : 'Show raw'}
                </button>
                <button 
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 focus:outline-none"
                  onClick={() => { setShowAnalysisModal(false); setShowRawJson(false); }}
                >
                  Close
                </button>
              </div>
            </div>

            {selectedRecord.analysis ? (
              isNarrativeAnalysis(selectedRecord.analysis) ? (
                <div className="space-y-5 text-sm text-gray-700 dark:text-gray-200">
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-500/40 dark:bg-yellow-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-yellow-700 dark:text-yellow-200 font-semibold">Important Medical Disclaimer</p>
                    <p className="mt-2 leading-relaxed">{selectedRecord.analysis.disclaimer}</p>
                  </div>

                  {Array.isArray(selectedRecord.analysis.keyFindings) && selectedRecord.analysis.keyFindings.length > 0 && (
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Key Findings</h4>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {selectedRecord.analysis.keyFindings.map((finding, idx) => (
                          <li key={idx} className="leading-relaxed">{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(selectedRecord.analysis.analysisBreakdown) && selectedRecord.analysis.analysisBreakdown.length > 0 && (
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Analysis Breakdown</h4>
                      <div className="mt-2 space-y-3">
                        {selectedRecord.analysis.analysisBreakdown.map((paragraph, idx) => (
                          <p key={idx} className="leading-relaxed">{paragraph}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(selectedRecord.analysis.treatmentConsiderations) && selectedRecord.analysis.treatmentConsiderations.length > 0 && (
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Discussion Points for Your Care Team</h4>
                      <div className="mt-2 space-y-2">
                        {selectedRecord.analysis.treatmentConsiderations.map((item, idx) => (
                          <p key={idx} className="leading-relaxed">{item}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(selectedRecord.analysis.symptomManagement) && selectedRecord.analysis.symptomManagement.length > 0 && (
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Symptom & Side-Effect Tips</h4>
                      <div className="mt-2 space-y-2">
                        {selectedRecord.analysis.symptomManagement.map((tip, idx) => (
                          <p key={idx} className="leading-relaxed">{tip}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(selectedRecord.analysis.nextSteps) && selectedRecord.analysis.nextSteps.length > 0 && (
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">Next Steps & Preparation</h4>
                      <div className="mt-2 space-y-2">
                        {selectedRecord.analysis.nextSteps.map((step, idx) => (
                          <p key={idx} className="leading-relaxed">{step}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRecord.analysis.encouragement && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-100">{selectedRecord.analysis.encouragement}</p>
                    </div>
                  )}
                </div>
              ) : (
                renderStructuredAnalysis(selectedRecord.analysis)
              )
            ) : (
              <div className="text-center text-gray-600">No analysis details available.</div>
            )}

            {selectedRecord.analysis && analysisSections.length > 0 && (
              <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Care Topics Overview</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Every report is organized into the categories below so you can quickly find the details you need.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {analysisSections.map((section) => (
                    <div key={section.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
                      <p className="text-xs font-semibold tracking-wide uppercase text-gray-600 dark:text-gray-300">{section.title}</p>
                      {section.entries.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200 list-disc list-inside">
                          {section.entries.map((entry, idx) => (
                            <li key={idx} className="leading-relaxed">{entry}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500 italic">{SECTION_EMPTY_TEXT}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showRawJson && selectedRecord.analysis && (
              <div className="mt-4">
                <strong className="block mb-2 text-xs text-gray-700 dark:text-gray-200">Raw AI JSON</strong>
                <div className="max-w-full max-h-72 overflow-auto bg-gray-50 dark:bg-gray-800 p-3 rounded">
                  <pre className="whitespace-pre-wrap text-xs font-mono">{JSON.stringify(selectedRecord.analysis._raw || selectedRecord.analysis, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;