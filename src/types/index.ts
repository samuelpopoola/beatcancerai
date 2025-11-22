export interface UserProfile {
  id?: string;
  first_name?: string;
  last_name?: string;
  age?: number;
  gender?: string;
  cancer_type?: string;
  cancer_stage?: string;
  diagnosis_date?: string;
  biomarkers?: string;
  treatment_goal?: string;
  oncologist?: string;
  primary_care?: string;
  family_contact?: string;
  completed_onboarding?: boolean;
}

export interface OnboardingData {
  step1?: {
    first_name?: string;
    last_name?: string;
    age: number;
    gender: string;
  };
  step2?: {
    cancer_type: string;
    cancer_stage: string;
    diagnosis_date: string;
    biomarkers: string;
  };
  step3?: {
    treatment_goal: string;
  };
  step4?: {
    oncologist: string;
    primary_care: string;
    family_contact: string;
  };
}

export interface Appointment {
  id: string;
  user_id?: string;
  title: string;
  type: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
}

export interface Medication {
  id: string;
  user_id?: string;
  name: string;
  dosage: string;
  frequency: string;
  active?: boolean;
  start_date?: string;
  end_date?: string;
  notes?: string;
}
