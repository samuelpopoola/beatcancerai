import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { OnboardingData } from '../types';
import { Heart, ChevronRight, ChevronLeft, Check, Loader } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Onboarding: React.FC = () => {
  const { saveUserProfile } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 4;

  const updateStepData = (step: keyof OnboardingData, stepData: Partial<OnboardingData[keyof OnboardingData]>) => {
    setData((prev) => ({
      ...prev,
      [step]: { ...prev[step], ...stepData },
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError('');
    // Ensure there's an active auth session before attempting to save the profile.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authServiceModule: any = await import('../services/auth');
      const currentUser = await authServiceModule.authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        setError('No active session. Please confirm your email (if required) and sign in before completing onboarding.');
        setSaving(false);
        return;
      }
    } catch (checkErr) {
      // If the check fails, proceed; saveUserProfile will perform its own check and report a clear error.
      console.debug('Auth session check failed:', checkErr);
    }

    try {
      const profile = {
        first_name: data.step1?.first_name,
        last_name: data.step1?.last_name,
        age: data.step1?.age,
        gender: data.step1?.gender,
        cancer_type: data.step2?.cancer_type,
        cancer_stage: data.step2?.cancer_stage,
        diagnosis_date: data.step2?.diagnosis_date,
        biomarkers: data.step2?.biomarkers,
        treatment_goal: data.step3?.treatment_goal,
        oncologist: data.step4?.oncologist,
        primary_care: data.step4?.primary_care,
        family_contact: data.step4?.family_contact,
        completed_onboarding: true,
      };

      // Try to save; if app determined there is no active session, buffer locally and inform user
      try {
        await saveUserProfile(profile);
      } catch (saveErr: unknown) {
        // If the save failed because there's no session (email not confirmed), buffer the profile locally
        // and instruct the user to confirm email and sign in. We'll persist it automatically after sign-in.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const se: any = saveErr;
        // Buffer profile locally unconditionally when save fails due to no session or network issue
        try {
          localStorage.setItem('onboarding:pendingProfile', JSON.stringify(profile));
          setError('No active session — your onboarding answers have been saved locally and will be persisted automatically after you sign in. Please confirm your email if required and sign in.');
        } catch (lErr) {
          console.error('Failed to buffer onboarding profile locally', lErr);
          setError('Failed to save profile. Please confirm your email and sign in, then try again.');
        }
        setSaving(false);
        return;
      }
    } catch (err: unknown) {
      // Supabase / network errors can be complex objects; stringify useful fields for debugging and user feedback
      // Also try a fallback save without the new name fields if the error indicates missing columns (migration not applied)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e: any = err;
      console.error('Error saving profile:', e);

      let message = 'Failed to save profile. Please try again.';
      if (e && typeof e === 'object') {
        if (e.message) message = String(e.message);
        else if (e.error) message = typeof e.error === 'string' ? e.error : JSON.stringify(e.error);
        else message = JSON.stringify(e, Object.getOwnPropertyNames(e));
      } else {
        message = String(e);
      }

      // If the error mentions missing columns (migration not applied), try saving without the name fields as a fallback
      if (message.toLowerCase().includes('first_name') || message.toLowerCase().includes('last_name') || message.toLowerCase().includes('column')) {
        try {
          const fallback = {
            age: data.step1?.age,
            gender: data.step1?.gender,
            cancer_type: data.step2?.cancer_type,
            cancer_stage: data.step2?.cancer_stage,
            diagnosis_date: data.step2?.diagnosis_date,
            biomarkers: data.step2?.biomarkers,
            treatment_goal: data.step3?.treatment_goal,
            oncologist: data.step4?.oncologist,
            primary_care: data.step4?.primary_care,
            family_contact: data.step4?.family_contact,
            completed_onboarding: true,
          };
          await saveUserProfile(fallback);
          setError('Saved profile without names (database migration for names not applied). Please apply the migration to persist names.');
          setSaving(false);
          return;
        } catch (err2: unknown) {
          const e2: any = err2;
          console.error('Fallback save failed:', e2);
          message = message + ' | Fallback save failed: ' + (e2 && e2.message ? e2.message : JSON.stringify(e2));
        }
      }

      setError(message || 'Failed to save profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-green-400 rounded-full mb-4 shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Beat Cancer AI</h1>
          <p className="text-gray-600">
            We're here to support you every step of the way. Let's personalize your care journey.
          </p>
        </div>

  <div className="card">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step < currentStep
                        ? 'bg-green-500 text-white'
                        : step === currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-all ${
                        step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>Basics</span>
              <span>Diagnosis</span>
              <span>Goals</span>
              <span>Care Team</span>
            </div>
          </div>

          <div className="min-h-[400px]">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            {currentStep === 1 && (
              <Step1
                data={data.step1}
                onChange={(stepData) => updateStepData('step1', stepData)}
              />
            )}
            {currentStep === 2 && (
              <Step2
                data={data.step2}
                onChange={(stepData) => updateStepData('step2', stepData)}
              />
            )}
            {currentStep === 3 && (
              <Step3
                data={data.step3}
                onChange={(stepData) => updateStepData('step3', stepData)}
              />
            )}
            {currentStep === 4 && (
              <Step4
                data={data.step4}
                onChange={(stepData) => updateStepData('step4', stepData)}
              />
            )}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Previous
            </button>
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Step1: React.FC<{ data?: OnboardingData['step1']; onChange: (data: Partial<OnboardingData['step1']>) => void }> = ({ data = {}, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Let's start with the basics</h2>
        <p className="text-gray-600">This helps us understand you better and personalize your experience.</p>
      </div>

      <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First name</label>
                <input
                  type="text"
                  value={data.first_name || ''}
                  onChange={(e) => onChange({ first_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last name</label>
                <input
                  type="text"
                  value={data.last_name || ''}
                  onChange={(e) => onChange({ last_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Last name"
                />
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
            <input
              type="number"
              value={data.age ?? ''}
              onChange={(e) => onChange({ age: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter your age"
            />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
        <div className="grid grid-cols-3 gap-3">
          {['Male', 'Female', 'Other'].map((option) => (
            <button
              key={option}
              onClick={() => onChange({ gender: option })}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                data.gender === option
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Step2: React.FC<{ data?: OnboardingData['step2']; onChange: (data: Partial<OnboardingData['step2']>) => void }> = ({ data = {}, onChange }) => {
  const cancer_types = [
    'Breast Cancer',
    'Lung Cancer',
    'Prostate Cancer',
    'Colorectal Cancer',
    'Melanoma',
    'Leukemia',
    'Lymphoma',
    'Other',
  ];

  const stages = ['Stage I', 'Stage II', 'Stage III', 'Stage IV', 'Unknown'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">About your diagnosis</h2>
        <p className="text-gray-600">
          Help us understand your specific situation so we can provide the most relevant guidance.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cancer Type</label>
        <select
          value={data?.cancer_type || ''}
          onChange={(e) => onChange({ cancer_type: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          <option value="">Select cancer type</option>
          {cancer_types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
        <div className="grid grid-cols-3 gap-3">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => onChange({ cancer_stage: stage })}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                data?.cancer_stage === stage
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Diagnosis</label>
        <input
          type="date"
          value={data?.diagnosis_date || ''}
          onChange={(e) => onChange({ diagnosis_date: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Biomarkers (Optional)
        </label>
        <input
          type="text"
          value={data?.biomarkers || ''}
          onChange={(e) => onChange({ biomarkers: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="e.g., HER2+, BRCA1, PD-L1"
        />
        <p className="text-xs text-gray-500 mt-2">
          If known, this helps us provide more specific information
        </p>
      </div>
    </div>
  );
};

const Step3: React.FC<{ data?: OnboardingData['step3']; onChange: (data: Partial<OnboardingData['step3']>) => void }> = ({ data = {}, onChange }) => {
  const goals = [
    {
      id: 'curative',
      title: 'Curative Treatment',
      description: 'Aiming to eliminate cancer completely',
    },
    {
      id: 'management',
      title: 'Disease Management',
      description: 'Controlling cancer as a chronic condition',
    },
    {
      id: 'palliative',
      title: 'Palliative Care',
      description: 'Focusing on quality of life and comfort',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your treatment goals</h2>
        <p className="text-gray-600">
          Understanding your goals helps us align our recommendations with what matters most to you.
        </p>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
            <button
            key={goal.id}
            onClick={() => onChange({ treatment_goal: goal.id })}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              data?.treatment_goal === goal.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
            }`}
          >
            <div className="flex items-start">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-1 mr-3 flex items-center justify-center ${
                  data?.treatment_goal === goal.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {data?.treatment_goal === goal.id && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{goal.title}</h3>
                <p className="text-sm text-gray-600">{goal.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const Step4: React.FC<{ data?: OnboardingData['step4']; onChange: (data: Partial<OnboardingData['step4']>) => void }> = ({ data = {}, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your care team</h2>
        <p className="text-gray-600">
          Let us know who's on your team. This information helps coordinate your care journey.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Oncologist Name & Contact
        </label>
        <input
          type="text"
          value={data?.oncologist || ''}
          onChange={(e) => onChange({ oncologist: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Dr. Smith, (555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Care Physician (Optional)
        </label>
        <input
          type="text"
          value={data?.primary_care || ''}
          onChange={(e) => onChange({ primary_care: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Dr. Johnson, (555) 987-6543"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Family/Emergency Contact (Optional)
        </label>
        <input
          type="text"
          value={data?.family_contact || ''}
          onChange={(e) => onChange({ family_contact: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Jane Doe, (555) 456-7890"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-800">
          <strong>Privacy Note:</strong> All your information is encrypted and stored securely. You have
          complete control over your data.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
