/* ------------------------------------------------------------------ */
/*  Domain types — mirror the Supabase schema                          */
/* ------------------------------------------------------------------ */

export type UserRole = "doctor" | "receptionist" | "patient";

export type AppointmentStatus =
  | "scheduled"
  | "waiting"
  | "in_consultation"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid";

export type PaymentMethod = "cash" | "card" | "insurance" | "upi";

export type BlockType = "break" | "emergency" | "custom";

/** profiles table */
export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  created_at?: string;
}

/** doctors table row with the joined profile */
export interface Doctor {
  id: string;
  user_id: string | null;
  specialty: string;
  consultation_fee: number;
  profile: Profile | null;
}

export interface DoctorRow {
  id: string;
  user_id: string | null;
  specialty: string;
  consultation_fee: number;
}

/** appointments table row with joined relations */
export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string; // YYYY-MM-DD
  time_slot: string; // HH:MM
  status: AppointmentStatus;
  reason: string | null;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  created_at?: string;
  patient: Profile | null;
  doctor: Doctor | null;
}

export interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  time_slot: string;
  status: AppointmentStatus;
  reason: string | null;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  created_at?: string;
}

export interface NewAppointmentInput {
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  time_slot: string;
  status?: AppointmentStatus;
  reason?: string | null;
  payment_status?: PaymentStatus;
}

/** One medication line inside the JSONB prescription column */
export interface PrescriptionItem {
  id: string;
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

/** medical_records table row */
export interface MedicalRecord {
  id: string;
  appointment_id: string;
  diagnosis: string | null;
  prescription: PrescriptionItem[];
  created_at?: string;
  updated_at?: string;
}

/** schedule_blocks table (dynamic slot creator) */
export interface ScheduleBlock {
  id: string;
  doctor_id: string;
  block_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  type: BlockType;
  reason: string | null;
  created_at?: string;
}

export interface NewScheduleBlockInput {
  doctor_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  type: BlockType;
  reason?: string | null;
  cancelAffected?: boolean;
}

export interface SeedCounts {
  doctors: number;
  patients: number;
  appointments: number;
  medical_records: number;
  schedule_blocks: number;
}

export type RealtimeTable =
  | "appointments"
  | "doctors"
  | "patients"
  | "medical_records"
  | "schedule_blocks";
