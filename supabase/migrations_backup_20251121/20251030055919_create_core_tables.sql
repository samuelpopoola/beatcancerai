/*
  # Create Core Database Schema for Beat Cancer AI

  ## Overview
  This migration sets up the complete database schema for the cancer care management platform.

  ## 1. New Tables

  ### `user_profiles`
  - `id` (uuid, primary key) - References auth.users
  - `age` (integer) - User's age
  - `gender` (text) - Gender identity
  - `cancer_type` (text) - Type of cancer diagnosis
  - `cancer_stage` (text) - Stage of cancer
  - `diagnosis_date` (date) - Date of diagnosis
  - `biomarkers` (text) - Genetic/molecular biomarkers
  - `treatment_goal` (text) - Treatment objective (curative, management, palliative)
  - `oncologist` (text) - Oncologist name and contact
  - `primary_care` (text) - Primary care physician details
  - `family_contact` (text) - Emergency contact information
  - `completed_onboarding` (boolean) - Onboarding completion status
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `medical_records`
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `name` (text) - Document name
  - `file_type` (text) - File type (pdf, image)
  - `category` (text) - Category (Pathology, Radiology, Clinical Notes, Lab Results, Other)
  - `file_url` (text) - Storage URL for the file
  - `analyzed` (boolean) - AI analysis completion status
  - `analysis_data` (jsonb) - Structured AI analysis results
  - `upload_date` (timestamptz) - Upload timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ### `care_plan_tasks`
  - `id` (uuid, primary key) - Unique task identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `title` (text) - Task title
  - `description` (text) - Task description
  - `category` (text) - Task category (treatment, test, medication, lifestyle)
  - `status` (text) - Task status (upcoming, in-progress, completed, monitoring)
  - `date` (date) - Scheduled date (optional)
  - `time` (text) - Scheduled time (optional)
  - `location` (text) - Location details (optional)
  - `order_index` (integer) - Display order within status column
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `appointments`
  - `id` (uuid, primary key) - Unique appointment identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `title` (text) - Appointment title
  - `type` (text) - Type (treatment, lab, appointment)
  - `date` (date) - Appointment date
  - `time` (text) - Appointment time
  - `location` (text) - Location
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### `medications`
  - `id` (uuid, primary key) - Unique medication identifier
  - `user_id` (uuid, foreign key) - References user_profiles
  - `name` (text) - Medication name
  - `dosage` (text) - Dosage amount
  - `frequency` (text) - Frequency of administration
  - `active` (boolean) - Currently active medication
  - `start_date` (date) - Start date
  - `end_date` (date) - End date (optional)
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own data only
  - Restrict all data access to the owning user

  ## 3. Important Notes
  - All tables use uuid primary keys with automatic generation
  - Foreign keys enforce referential integrity
  - Timestamps use timestamptz for timezone awareness
  - RLS policies ensure data isolation between users
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age integer,
  gender text,
  cancer_type text,
  cancer_stage text,
  diagnosis_date date,
  biomarkers text,
  treatment_goal text,
  oncologist text,
  primary_care text,
  family_contact text,
  completed_onboarding boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_type text NOT NULL,
  category text NOT NULL,
  file_url text,
  analyzed boolean DEFAULT false,
  analysis_data jsonb,
  upload_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create care_plan_tasks table
CREATE TABLE IF NOT EXISTS care_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  status text NOT NULL,
  date date,
  time text,
  location text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  location text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  active boolean DEFAULT true,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
DO $$ BEGIN
  CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for medical_records
DO $$ BEGIN
  CREATE POLICY "Users can view own medical records"
    ON medical_records FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own medical records"
    ON medical_records FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own medical records"
    ON medical_records FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own medical records"
    ON medical_records FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for care_plan_tasks
DO $$ BEGIN
  CREATE POLICY "Users can view own tasks"
    ON care_plan_tasks FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own tasks"
    ON care_plan_tasks FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own tasks"
    ON care_plan_tasks FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own tasks"
    ON care_plan_tasks FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for appointments
DO $$ BEGIN
  CREATE POLICY "Users can view own appointments"
    ON appointments FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own appointments"
    ON appointments FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own appointments"
    ON appointments FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own appointments"
    ON appointments FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for medications
DO $$ BEGIN
  CREATE POLICY "Users can view own medications"
    ON medications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own medications"
    ON medications FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own medications"
    ON medications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own medications"
    ON medications FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medical_records_user_id ON medical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_user_id ON care_plan_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_status ON care_plan_tasks(status);
