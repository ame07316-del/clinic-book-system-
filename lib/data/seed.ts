import type {
  AppointmentRow,
  BlockType,
  MedicalRecord,
  PaymentStatus,
  PrescriptionItem,
  Profile,
  ScheduleBlock,
  DoctorRow,
  AppointmentStatus,
} from "@/lib/types";
import { uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Realistic demo seed — doctors, patients, today's queue with a      */
/*  healthy mix of statuses, records and schedule blocks.              */
/* ------------------------------------------------------------------ */

interface DoctorSeed {
  name: string;
  specialty: string;
  fee: number;
  phone: string;
}

const DOCTORS: DoctorSeed[] = [
  { name: "Dr. Sarah Mitchell", specialty: "Cardiology", fee: 180, phone: "+1 (555) 010-1101" },
  { name: "Dr. James Okafor", specialty: "Pediatrics", fee: 120, phone: "+1 (555) 010-1102" },
  { name: "Dr. Priya Sharma", specialty: "Dermatology", fee: 140, phone: "+1 (555) 010-1103" },
  { name: "Dr. Michael Chen", specialty: "Orthopedics", fee: 160, phone: "+1 (555) 010-1104" },
  { name: "Dr. Elena Rodriguez", specialty: "Neurology", fee: 200, phone: "+1 (555) 010-1105" },
  { name: "Dr. David Kim", specialty: "General Medicine", fee: 90, phone: "+1 (555) 010-1106" },
];

const PATIENT_NAMES: Array<[string, string]> = [
  ["Ava Thompson", "+1 (555) 231-4401"],
  ["Liam Rodriguez", "+1 (555) 231-4402"],
  ["Sophia Nguyen", "+1 (555) 231-4403"],
  ["Noah Patel", "+1 (555) 231-4404"],
  ["Mia Johansson", "+1 (555) 231-4405"],
  ["Ethan Brooks", "+1 (555) 231-4406"],
  ["Isabella Rossi", "+1 (555) 231-4407"],
  ["Lucas Mendes", "+1 (555) 231-4408"],
  ["Amara Diallo", "+1 (555) 231-4409"],
  ["Benjamin Clarke", "+1 (555) 231-4410"],
  ["Chloe Dubois", "+1 (555) 231-4411"],
  ["Daniel Kim", "+1 (555) 231-4412"],
  ["Grace Osei", "+1 (555) 231-4413"],
  ["Henry Walsh", "+1 (555) 231-4414"],
  ["Zoe Anderson", "+1 (555) 231-4415"],
  ["Omar Farouk", "+1 (555) 231-4416"],
];

function rx(
  medicine: string,
  dosage: string,
  frequency: string,
  duration: string,
  instructions?: string,
): PrescriptionItem {
  return { id: uid(), medicine, dosage, frequency, duration, instructions };
}

export interface SeedBundle {
  profiles: Profile[];
  doctors: DoctorRow[];
  appointments: AppointmentRow[];
  medical_records: MedicalRecord[];
  schedule_blocks: ScheduleBlock[];
}

export function buildSeedBundle(today: string, tomorrow: string): SeedBundle {
  const now = new Date().toISOString();

  const doctorProfiles: Profile[] = DOCTORS.map((d) => ({
    id: uid(),
    full_name: d.name,
    role: "doctor" as const,
    phone: d.phone,
    created_at: now,
  }));

  const patientProfiles: Profile[] = PATIENT_NAMES.map(([name, phone]) => ({
    id: uid(),
    full_name: name,
    role: "patient" as const,
    phone,
    created_at: now,
  }));

  const receptionist: Profile = {
    id: uid(),
    full_name: "Rachel Green (Reception)",
    role: "receptionist",
    phone: "+1 (555) 010-1000",
    created_at: now,
  };

  const doctors: DoctorRow[] = DOCTORS.map((d, i) => ({
    id: uid(),
    user_id: doctorProfiles[i]!.id,
    specialty: d.specialty,
    consultation_fee: d.fee,
  }));

  const profiles = [...doctorProfiles, ...patientProfiles, receptionist];

  const p = (name: string) => patientProfiles.find((x) => x.full_name === name)!.id;
  const d = (i: number) => doctors[i]!.id;

  interface RowSeed {
    doctor: number;
    patient: string;
    date: string;
    slot: string;
    status: AppointmentStatus;
    reason: string;
    payment: PaymentStatus;
    method?: "cash" | "card" | "insurance" | "upi";
    diagnosis?: string;
    prescription?: PrescriptionItem[];
  }

  const rows: RowSeed[] = [
    // — Cardiology (Dr. Mitchell) —
    { doctor: 0, patient: "Ava Thompson", date: today, slot: "09:00", status: "completed", reason: "Hypertension follow-up", payment: "paid", method: "card", diagnosis: "Stage 1 hypertension — well controlled on current therapy. BP 128/82, HR 72.", prescription: [rx("Lisinopril", "10 mg", "Once daily (morning)", "30 days", "Take with a full glass of water."), rx("Atorvastatin", "20 mg", "Once at night", "30 days", "Avoid grapefruit juice.")] },
    { doctor: 0, patient: "Liam Rodriguez", date: today, slot: "09:30", status: "completed", reason: "Chest discomfort on exertion", payment: "paid", method: "insurance", diagnosis: "Non-cardiac chest pain — musculoskeletal. ECG normal, troponin negative.", prescription: [rx("Ibuprofen", "400 mg", "Twice daily", "5 days", "Take after food.")] },
    { doctor: 0, patient: "Sophia Nguyen", date: today, slot: "10:00", status: "completed", reason: "Palpitations", payment: "paid", method: "upi", diagnosis: "Sinus tachycardia secondary to anxiety. Holter not indicated at this time.", prescription: [rx("Magnesium glycinate", "200 mg", "Once daily", "60 days")] },
    { doctor: 0, patient: "Noah Patel", date: today, slot: "10:30", status: "waiting", reason: "Annual cardiac screening", payment: "pending" },
    { doctor: 0, patient: "Mia Johansson", date: today, slot: "11:00", status: "waiting", reason: "High BP reading at pharmacy", payment: "pending" },
    { doctor: 0, patient: "Ethan Brooks", date: today, slot: "11:30", status: "scheduled", reason: "Cholesterol review", payment: "pending" },
    { doctor: 0, patient: "Isabella Rossi", date: today, slot: "14:00", status: "scheduled", reason: "Post-COVID fatigue", payment: "pending" },
    { doctor: 0, patient: "Lucas Mendes", date: today, slot: "14:30", status: "scheduled", reason: "Family history of heart disease", payment: "pending" },

    // — Pediatrics (Dr. Okafor) —
    { doctor: 1, patient: "Amara Diallo", date: today, slot: "09:00", status: "completed", reason: "Child wellness visit", payment: "paid", method: "cash", diagnosis: "Healthy 6-year-old. Growth on 60th percentile. Vaccines up to date.", prescription: [rx("Vitamin D3", "600 IU", "Once daily", "90 days", "Chewable, with meals.")] },
    { doctor: 1, patient: "Benjamin Clarke", date: today, slot: "09:30", status: "in_consultation", reason: "Fever for 2 days", payment: "pending" },
    { doctor: 1, patient: "Chloe Dubois", date: today, slot: "10:00", status: "waiting", reason: "Persistent cough", payment: "pending" },
    { doctor: 1, patient: "Daniel Kim", date: today, slot: "10:30", status: "waiting", reason: "School physical form", payment: "paid", method: "card" },
    { doctor: 1, patient: "Grace Osei", date: today, slot: "14:00", status: "scheduled", reason: "Ear pain", payment: "pending" },
    { doctor: 1, patient: "Omar Farouk", date: today, slot: "15:00", status: "scheduled", reason: "Rash on arms", payment: "pending" },

    // — Dermatology (Dr. Sharma) —
    { doctor: 2, patient: "Henry Walsh", date: today, slot: "10:00", status: "completed", reason: "Acne consultation", payment: "paid", method: "card", diagnosis: "Moderate inflammatory acne vulgaris, face. Grade II.", prescription: [rx("Adapalene 0.1% gel", "Pea-sized amount", "Once at night", "8 weeks", "Apply to dry skin, avoid eyes."), rx("Doxycycline", "100 mg", "Once daily", "6 weeks", "Take with plenty of water, stay upright 30 min.")] },
    { doctor: 2, patient: "Zoe Anderson", date: today, slot: "10:30", status: "waiting", reason: "Eczema flare-up", payment: "pending" },
    { doctor: 2, patient: "Ava Thompson", date: today, slot: "11:30", status: "scheduled", reason: "Mole check", payment: "pending" },
    { doctor: 2, patient: "Ethan Brooks", date: today, slot: "15:30", status: "cancelled", reason: "Laser consultation", payment: "pending" },

    // — Orthopedics (Dr. Chen) —
    { doctor: 3, patient: "Lucas Mendes", date: today, slot: "09:30", status: "completed", reason: "Ankle sprain", payment: "paid", method: "insurance", diagnosis: "Grade II lateral ankle sprain. No fracture on X-ray. RICE protocol advised.", prescription: [rx("Naproxen", "250 mg", "Twice daily", "7 days", "Take with food."), rx("Physiotherapy", "45 min session", "3× per week", "4 weeks", "Book at front desk.")] },
    { doctor: 3, patient: "Grace Osei", date: today, slot: "10:30", status: "waiting", reason: "Lower back pain", payment: "pending" },
    { doctor: 3, patient: "Henry Walsh", date: today, slot: "11:00", status: "scheduled", reason: "Knee pain while running", payment: "pending" },

    // — Neurology (Dr. Rodriguez) —
    { doctor: 4, patient: "Mia Johansson", date: today, slot: "13:00", status: "scheduled", reason: "Recurrent migraines", payment: "pending" },
    { doctor: 4, patient: "Daniel Kim", date: today, slot: "14:30", status: "scheduled", reason: "Numbness in left hand", payment: "pending" },

    // — General Medicine (Dr. Kim) —
    { doctor: 5, patient: "Noah Patel", date: today, slot: "13:30", status: "scheduled", reason: "Fatigue work-up", payment: "pending" },
    { doctor: 5, patient: "Chloe Dubois", date: tomorrow, slot: "09:00", status: "scheduled", reason: "Blood pressure re-check", payment: "pending" },
    { doctor: 5, patient: "Benjamin Clarke", date: tomorrow, slot: "09:30", status: "scheduled", reason: "Thyroid results review", payment: "pending" },
    { doctor: 0, patient: "Sophia Nguyen", date: tomorrow, slot: "10:00", status: "scheduled", reason: "Cardiology follow-up", payment: "pending" },
  ];

  const appointments: AppointmentRow[] = rows.map((r) => ({
    id: uid(),
    patient_id: p(r.patient),
    doctor_id: d(r.doctor),
    appointment_date: r.date,
    time_slot: r.slot,
    status: r.status,
    reason: r.reason,
    payment_status: r.payment,
    payment_method: r.method ?? null,
    paid_at: r.payment === "paid" ? new Date(Date.now() - Math.random() * 5 * 3600_000).toISOString() : null,
    created_at: now,
  }));

  const medical_records: MedicalRecord[] = rows
    .filter((r) => r.diagnosis)
    .map((r) => {
      const appt = appointments.find(
        (a) => a.patient_id === p(r.patient) && a.time_slot === r.slot && a.appointment_date === r.date,
      )!;
      return {
        id: uid(),
        appointment_id: appt.id,
        diagnosis: r.diagnosis ?? null,
        prescription: r.prescription ?? [],
        created_at: now,
        updated_at: now,
      };
    });

  const schedule_blocks: ScheduleBlock[] = [
    {
      id: uid(),
      doctor_id: d(0),
      block_date: today,
      start_time: "13:00",
      end_time: "14:00",
      type: "break" as BlockType,
      reason: "Lunch break",
      created_at: now,
    },
    {
      id: uid(),
      doctor_id: d(1),
      block_date: today,
      start_time: "15:00",
      end_time: "16:00",
      type: "emergency" as BlockType,
      reason: "Reserved — pediatric emergency window",
      created_at: now,
    },
    {
      id: uid(),
      doctor_id: d(3),
      block_date: today,
      start_time: "11:30",
      end_time: "12:30",
      type: "custom" as BlockType,
      reason: "Surgery round at City Hospital",
      created_at: now,
    },
  ];

  return {
    profiles,
    doctors,
    appointments,
    medical_records,
    schedule_blocks,
  };
}
