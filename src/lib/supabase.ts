/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (url && url.startsWith('http')) {
    return url;
  }
  return 'https://czwcjwogiyafoppdourx.supabase.co';
};

const getSupabaseKey = () => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (key && key.trim().length > 0) {
    return key;
  }
  return 'sb_publishable_l2xBsvkfeLkXuAS-swLn0A_WhBa9839';
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseKey();

if (!supabaseAnonKey.startsWith('eyJ')) {
  console.warn('WARNING: The provided Supabase Anon Key does not appear to be a valid JWT (it should start with "eyJ"). Authentication requests may fail with an "Invalid API key" error.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  role: 'admin' | 'teacher';
  tsc_no?: string;
  assigned_grade?: string;
  phone_number?: string;
  status?: 'pending' | 'approved' | 'rejected';
};

export type Learner = {
  id: string;
  name: string;
  assessment_no: string;
  current_grade: string;
  gender: 'boy' | 'girl';
  parent_name?: string;
  parent_contact?: string;
  boarding_status: 'day' | 'boarding';
};

export type AcademicRecord = {
  id: string;
  learner_id: string;
  grade: string;
  term: number;
  year: number;
  scores: Record<string, number>; // 4: EE, 3: ME, 2: AE, 1: BE
  remarks?: string;
};

export type FinanceRecord = {
  id: string;
  learner_id: string;
  term: number;
  year: number;
  tuition_fee: number;
  boarding_fee: number;
  arrears_carried_forward: number;
  total_paid: number;
  balance: number;
};
