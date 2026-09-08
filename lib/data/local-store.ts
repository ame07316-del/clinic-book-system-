import { emitChange } from "@/lib/data/bus";
import { buildSeedBundle, type SeedBundle } from "@/lib/data/seed";
import type {
  Appointment,
  AppointmentRow,
  Doctor,
  DoctorRow,
  MedicalRecord,
  NewAppointmentInput,
  NewScheduleBlockInput,
  PaymentMethod,
  PaymentStatus,
  AppointmentStatus,
  Profile,
  ScheduleBlock,
  SeedCounts,
} from "@/lib/types";
import { sleep, uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  LocalStore — a browser-local backend used when the Supabase        */
/*  project is unreachable or its schema hasn't been provisioned yet.  */
/*  Mirrors the Supabase schema 1:1, persists to localStorage and      */
/*  simulates realtime across tabs via the `storage` event.            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "medicore.demo.db.v1";

interface DemoDB {
  profiles: Profile[];
  doctors: DoctorRow[];
  appointments: AppointmentRow[];
  medical_records: MedicalRecord[];
  schedule_blocks: ScheduleBlock[];
}

function emptyDB(): DemoDB {
  return { profiles: [], doctors: [], appointments: [], medical_records: [], schedule_blocks: [] };
}

function loadDB(): DemoDB {
  if (typeof window === "undefined") return emptyDB();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw) as DemoDB;
    return {
      profiles: parsed.profiles ?? [],
      doctors: parsed.doctors ?? [],
      appointments: parsed.appointments ?? [],
      medical_records: parsed.medical_records ?? [],
      schedule_blocks: parsed.schedule_blocks ?? [],
    };
  } catch {
    return emptyDB();
  }
}

export class LocalStore {
  readonly mode = "demo" as const;
  private db: DemoDB = emptyDB();
  private ready = false;
  private storageHandler?: (e: StorageEvent) => void;

  async init(): Promise<void> {
    if (this.ready) return;
    this.db = loadDB();
    // Cross-tab realtime: another tab wrote to localStorage.
    this.storageHandler = () => {
      this.db = loadDB();
      emitChange("appointments");
      emitChange("doctors");
      emitChange("patients");
      emitChange("medical_records");
      emitChange("schedule_blocks");
    };
    window.addEventListener("storage", this.storageHandler);
    this.ready = true;
  }

  dispose(): void {
    if (this.storageHandler) window.removeEventListener("storage", this.storageHandler);
    this.ready = false;
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      /* storage full / private mode — demo keeps working in-memory */
    }
  }

  private latency(ms = 140): Promise<void> {
    return sleep(ms + Math.random() * 160);
  }

  /* ---------------- getters ---------------- */

  private doctorView(row: DoctorRow): Doctor {
    return { ...row, profile: this.db.profiles.find((p) => p.id === row.user_id) ?? null };
  }

  private appointmentView(row: AppointmentRow): Appointment {
    const patient = this.db.profiles.find((p) => p.id === row.patient_id) ?? null;
    const doctorRow = this.db.doctors.find((d) => d.id === row.doctor_id) ?? null;
    return {
      ...row,
      patient,
      doctor: doctorRow ? this.doctorView(doctorRow) : null,
    };
  }

  async getDoctors(): Promise<Doctor[]> {
    await this.latency();
    return this.db.doctors.map((d) => this.doctorView(d));
  }

  async getPatients(): Promise<Profile[]> {
    await this.latency();
    return this.db.profiles
      .filter((p) => p.role === "patient")
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  async getAppointments(filter?: {
    date?: string;
    doctorId?: string;
    patientId?: string;
  }): Promise<Appointment[]> {
    await this.latency();
    let rows = [...this.db.appointments];
    if (filter?.date) rows = rows.filter((a) => a.appointment_date === filter.date);
    if (filter?.doctorId) rows = rows.filter((a) => a.doctor_id === filter.doctorId);
    if (filter?.patientId) rows = rows.filter((a) => a.patient_id === filter.patientId);
    return rows
      .map((r) => this.appointmentView(r))
      .sort(
        (a, b) =>
          a.appointment_date.localeCompare(b.appointment_date) ||
          a.time_slot.localeCompare(b.time_slot),
      );
  }

  async getMedicalRecords(): Promise<MedicalRecord[]> {
    await this.latency();
    return [...this.db.medical_records];
  }

  async getScheduleBlocks(filter?: { date?: string; doctorId?: string }): Promise<ScheduleBlock[]> {
    await this.latency();
    let rows = [...this.db.schedule_blocks];
    if (filter?.date) rows = rows.filter((b) => b.block_date === filter.date);
    if (filter?.doctorId) rows = rows.filter((b) => b.doctor_id === filter.doctorId);
    return rows.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  /* ---------------- mutations ---------------- */

  async createPatient(input: { full_name: string; phone?: string | null }): Promise<Profile> {
    await this.latency();
    const existingPhone = input.phone?.trim();
    if (existingPhone) {
      const existing = this.db.profiles.find(
        (p) => p.role === "patient" && p.phone === existingPhone,
      );
      if (existing) return existing;
    }
    const profile: Profile = {
      id: uid(),
      full_name: input.full_name.trim(),
      role: "patient",
      phone: existingPhone || null,
      created_at: new Date().toISOString(),
    };
    this.db.profiles.push(profile);
    this.persist();
    emitChange("patients");
    return profile;
  }

  async createAppointment(input: NewAppointmentInput): Promise<Appointment> {
    await this.latency();
    const row: AppointmentRow = {
      id: uid(),
      patient_id: input.patient_id,
      doctor_id: input.doctor_id,
      appointment_date: input.appointment_date,
      time_slot: input.time_slot,
      status: input.status ?? "scheduled",
      reason: input.reason ?? null,
      payment_status: input.payment_status ?? "pending",
      payment_method: null,
      paid_at: null,
      created_at: new Date().toISOString(),
    };
    this.db.appointments.push(row);
    this.persist();
    emitChange("appointments");
    return this.appointmentView(row);
  }

  async updateAppointment(
    id: string,
    patch: Partial<{
      status: AppointmentStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      time_slot: string;
      reason: string;
    }>,
  ): Promise<Appointment> {
    await this.latency();
    const row = this.db.appointments.find((a) => a.id === id);
    if (!row) throw new Error("Appointment not found");
    Object.assign(row, patch);
    if (patch.payment_status === "paid" && !row.paid_at) {
      row.paid_at = new Date().toISOString();
    }
    this.persist();
    emitChange("appointments");
    return this.appointmentView(row);
  }

  async upsertMedicalRecord(record: {
    appointment_id: string;
    diagnosis: string;
    prescription: MedicalRecord["prescription"];
  }): Promise<MedicalRecord> {
    await this.latency();
    const existing = this.db.medical_records.find((r) => r.appointment_id === record.appointment_id);
    if (existing) {
      existing.diagnosis = record.diagnosis;
      existing.prescription = record.prescription;
      existing.updated_at = new Date().toISOString();
      this.persist();
      emitChange("medical_records");
      return existing;
    }
    const created: MedicalRecord = {
      id: uid(),
      appointment_id: record.appointment_id,
      diagnosis: record.diagnosis,
      prescription: record.prescription,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.db.medical_records.push(created);
    this.persist();
    emitChange("medical_records");
    return created;
  }

  async createScheduleBlock(input: NewScheduleBlockInput): Promise<ScheduleBlock> {
    await this.latency();
    const block: ScheduleBlock = {
      id: uid(),
      doctor_id: input.doctor_id,
      block_date: input.block_date,
      start_time: input.start_time,
      end_time: input.end_time,
      type: input.type,
      reason: input.reason ?? null,
      created_at: new Date().toISOString(),
    };
    this.db.schedule_blocks.push(block);
    if (input.cancelAffected) {
      const affected = this.db.appointments.filter(
        (a) =>
          a.doctor_id === input.doctor_id &&
          a.appointment_date === input.block_date &&
          a.time_slot >= input.start_time &&
          a.time_slot < input.end_time &&
          (a.status === "scheduled" || a.status === "waiting"),
      );
      affected.forEach((a) => (a.status = "cancelled"));
    }
    this.persist();
    emitChange("schedule_blocks");
    if (input.cancelAffected) emitChange("appointments");
    return block;
  }

  async deleteScheduleBlock(id: string): Promise<void> {
    await this.latency();
    this.db.schedule_blocks = this.db.schedule_blocks.filter((b) => b.id !== id);
    this.persist();
    emitChange("schedule_blocks");
  }

  /* ---------------- demo lifecycle ---------------- */

  hasSeededData(): boolean {
    return this.db.doctors.length > 0;
  }

  /** First-run convenience: auto-seed when the local DB is empty. */
  async seedIfEmpty(): Promise<void> {
    if (!this.hasSeededData()) {
      await this.seedDemoData();
    }
  }

  async seedDemoData(): Promise<SeedCounts> {
    await this.latency(200);
    const bundle = buildSeedBundleDemo();
    this.db = {
      profiles: bundle.profiles,
      doctors: bundle.doctors,
      appointments: bundle.appointments,
      medical_records: bundle.medical_records,
      schedule_blocks: bundle.schedule_blocks,
    };
    this.persist();
    emitChange("doctors");
    emitChange("patients");
    emitChange("appointments");
    emitChange("medical_records");
    emitChange("schedule_blocks");
    return {
      doctors: bundle.doctors.length,
      patients: bundle.profiles.filter((p) => p.role === "patient").length,
      appointments: bundle.appointments.length,
      medical_records: bundle.medical_records.length,
      schedule_blocks: bundle.schedule_blocks.length,
    };
  }

  async resetAll(): Promise<void> {
    await this.latency(120);
    this.db = emptyDB();
    this.persist();
    emitChange("doctors");
    emitChange("patients");
    emitChange("appointments");
    emitChange("medical_records");
    emitChange("schedule_blocks");
  }
}

function buildSeedBundleDemo(): SeedBundle {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;
  const tomorrowDate = new Date(y, now.getMonth(), now.getDate() + 1);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;
  return buildSeedBundle(today, tomorrow);
}
