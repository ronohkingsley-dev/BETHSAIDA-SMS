-- Supabase Schema for School Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table (Extends Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'teacher')) NOT NULL,
    tsc_no TEXT,
    assigned_grade TEXT,
    phone_number TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Learners Table
CREATE TABLE learners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    assessment_no TEXT UNIQUE NOT NULL,
    current_grade TEXT NOT NULL,
    parent_name TEXT,
    parent_contact TEXT,
    boarding_status TEXT CHECK (boarding_status IN ('day', 'boarding')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Academic Records Table
CREATE TABLE academic_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID REFERENCES learners(id) ON DELETE CASCADE NOT NULL,
    grade TEXT NOT NULL,
    term INTEGER CHECK (term IN (1, 2, 3)) NOT NULL,
    year INTEGER NOT NULL,
    scores JSONB DEFAULT '{}'::jsonb NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(learner_id, term, year)
);

-- Finance Records Table
CREATE TABLE finance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID REFERENCES learners(id) ON DELETE CASCADE NOT NULL,
    term INTEGER CHECK (term IN (1, 2, 3)) NOT NULL,
    year INTEGER NOT NULL,
    tuition_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    arrears_carried_forward NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total_paid NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    balance NUMERIC(10, 2) GENERATED ALWAYS AS (tuition_fee + arrears_carried_forward - total_paid) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(learner_id, term, year)
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Learners: Authenticated users can read and write
CREATE POLICY "Learners viewable by authenticated users" ON learners FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Learners insertable by authenticated users" ON learners FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Learners updatable by authenticated users" ON learners FOR UPDATE USING (auth.role() = 'authenticated');

-- Academic Records: Authenticated users can read and write
CREATE POLICY "Academic records viewable by authenticated users" ON academic_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Academic records insertable by authenticated users" ON academic_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Academic records updatable by authenticated users" ON academic_records FOR UPDATE USING (auth.role() = 'authenticated');

-- Finance Records: Authenticated users can read and write
CREATE POLICY "Finance records viewable by authenticated users" ON finance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Finance records insertable by authenticated users" ON finance_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Finance records updatable by authenticated users" ON finance_records FOR UPDATE USING (auth.role() = 'authenticated');
