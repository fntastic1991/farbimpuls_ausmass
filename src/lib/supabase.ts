import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Customer = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  address: string;
  status: 'offeriert' | 'ausfuehrung' | 'abgeschlossen';
  appointment_date: string | null;
  notes: string;
  bexio_sent: boolean;
  scope?: 'innen' | 'aussen';
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  customer_id: string | null;
  project_id: string | null;
  title: string;
  description: string;
  appointment_date: string;
  appointment_time: string | null;
  duration_minutes: number;
  status: 'geplant' | 'bestaetigt' | 'abgeschlossen' | 'abgesagt';
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type MeasurementCategory = string;
export type MeasurementUnit = 'm2' | 'lfm' | 'stk' | 'pauschal';

export type Measurement = {
  id: string;
  room_id: string;
  category: MeasurementCategory;
  description: string;
  quantity: number;
  unit: MeasurementUnit;
  length: number | null;
  width: number | null;
  height: number | null;
  notes: string;
  created_at: string;
};

export type MeasurementPhoto = {
  id: string;
  measurement_id: string;
  url: string;
  created_at: string;
};

export type CategorySetting = {
  id: string;
  category: MeasurementCategory;
  offer_title: string;
  offer_description: string | null;
  tax_rate: number;
  unit_price: number;
  is_active: boolean;
  scope?: 'innen' | 'aussen';
  created_at: string;
  updated_at: string;
};
