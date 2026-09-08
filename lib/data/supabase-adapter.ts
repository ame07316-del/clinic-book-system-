import type { SupabaseClient } from "@supabase/supabase-js";
import { emitChange } from "@/lib/data/bus";
import { buildSeedBundle } from "@/lib/data/seed";
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
  RealtimeTable,
  ScheduleBlock,
  SeedCounts,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  SupabaseAdapter — production data source backed by supabase-js.    */
/*  Uses PostgREST joins for doctors/appointments and Postgres         */
/*  Changes (Realtime) to broadcast table events to the UI bus.        */
/* ------------------------------------------------------------------ */

const APPOINTMENT_SELECT =
  "*, patient:profiles(*), doctor:doctors(*, profile:profiles(*))";

export class SupabaseAdapter {
  readonly mode = "supabase" as const;

  constructor(private sb: SupabaseClient) {}

  init(): () => void {
    const channel = this.sb
      .channel("medicore-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => emitChange("appointments"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "doctors" },
        () => emitChange("doctors"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => emitChange("patients"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medical_records" },
        () => emitChange("medical_records"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_blocks" },
        () => emitChange("schedule_blocks"),
      )
      .subscribe();
    return () => {
      void this.sb.removeChannel(channel);
    };
  }

  /* ---------------- getters ---------------- */

  async getDoctors(): Promise<Doctor[]> {
    const { data, error } = await this.sb
      .from("doctors")
      .select("*, profile:profiles(*)")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const r = row as unknown as DoctorRow & { profile: Profile | null };
      return { ...r, profile: r.profile ?? null };
    });
  }

  async getPatients(): Promise<Profile[]> {
    const { data, error } = await this.sb
      .from("profiles")
      .select("*")
      .eq("role", "patient")
      .order("full_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Profile[];
  }

  async getAppointments(filter?: {
    date?: string;
    doctorId?: string;
    patientId?: string;
  }): Promise<Appointment[]> {
    let q = this.sb.from("appointments").select(APPOINTMENT_SELECT);
    if (filter?.date) q = q.eq("appointment_date", filter.date);
    if (filter?.doctorId) q = q.eq("doctor_id", filter.doctorId);
    if (filter?.patientId) q = q.eq("patient_id", filter.patientId);
    const { data, error } = await q
      .order("appointment_date", { ascending: true })
      .order("time_slot", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const r = row as unknown as Appointment & {
        patient: Profile | null;
        doctor: (DoctorRow & { profile: Profile | null }) | null;
      };
      return {
        ...r,
        patient: r.patient ?? null,
        doctor: r.doctor
          ? { ...r.doctor, profile: r.doctor.profile ?? null }
          : null,
      } satisfies Appointment;
    });
  }

  async getMedicalRecords(): Promise<MedicalRecord[]> {
    const { data, error } = await this.sb.from("medical_records").select("*");
    if (error) throw error;
    return (data ?? []).map((row) => {
      const r = row as unknown as MedicalRecord;
      return { ...r, prescription: Array.isArray(r.prescription) ? r.prescription : [] };
    });
  }

  async getScheduleBlocks(filter?: {
    date?: string;
    doctorId?: string;
  }): Promise<ScheduleBlock[]> {
    let q = this.sb.from("schedule_blocks").select("*");
    if (filter?.date) q = q.eq("block_date", filter.date);
    if (filter?.doctorId) q = q.eq("doctor_id", filter.doctorId);
    const { data, error } = await q.order("start_time", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ScheduleBlock[];
  }

  /* ---------------- mutations ---------------- */

  async createPatient(input: { full_name: string; phone?: string | null }): Promise<Profile> {
    const phone = input.phone?.trim() || null;
    if (phone) {
      const { data: existing } = await this.sb
        .from("profiles")
        .select("*")
        .eq("role", "patient")
        .eq("phone", phone)
        .limit(1);
      const found = (existing ?? [])[0] as Profile | undefined;
      if (found) return found;
    }
    const { data, error } = await this.sb
      .from("profiles")
      .insert({ full_name: input.full_name.trim(), role: "patient", phone })
      .select("*")
      .single();
    if (error) throw error;
    emitChange("patients");
    return data as unknown as Profile;
  }

  async createAppointment(input: NewAppointmentInput): Promise<Appointment> {
    const { data, error } = await this.sb
      .from("appointments")
      .insert({
        patient_id: input.patient_id,
        doctor_id: input.doctor_id,
        appointment_date: input.appointment_date,
        time_slot: input.time_slot,
        status: input.status ?? "scheduled",
        reason: input.reason ?? null,
        payment_status: input.payment_status ?? "pending",
      })
      .select(APPOINTMENT_SELECT)
      .single();
    if (error) throw error;
    emitChange("appointments");
    const r = data as unknown as Appointment;
    return { ...r, patient: r.patient ?? null, doctor: r.doctor ?? null };
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
    const body: Record<string, unknown> = { ...patch };
    if (patch.payment_status === "paid") body.paid_at = new Date().toISOString();
    const { data, error } = await this.sb
      .from("appointments")
      .update(body)
      .eq("id", id)
      .select(APPOINTMENT_SELECT)
      .single();
    if (error) throw error;
    emitChange("appointments");
    const r = data as unknown as Appointment;
    return { ...r, patient: r.patient ?? null, doctor: r.doctor ?? null };
  }

  async upsertMedicalRecord(record: {
    appointment_id: string;
    diagnosis: string;
    prescription: MedicalRecord["prescription"];
  }): Promise<MedicalRecord> {
    const { data, error } = await this.sb
      .from("medical_records")
      .upsert(
        { appointment_id: record.appointment_id, diagnosis: record.diagnosis, prescription: record.prescription },
        { onConflict: "appointment_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    emitChange("medical_records");
    const r = data as unknown as MedicalRecord;
    return { ...r, prescription: Array.isArray(r.prescription) ? r.prescription : [] };
  }

  async createScheduleBlock(input: NewScheduleBlockInput): Promise<ScheduleBlock> {
    const { data, error } = await this.sb
      .from("schedule_blocks")
      .insert({
        doctor_id: input.doctor_id,
        block_date: input.block_date,
        start_time: input.start_time,
        end_time: input.end_time,
        type: input.type,
        reason: input.reason ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    emitChange("schedule_blocks");
    if (input.cancelAffected) {
      await this.sb
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("doctor_id", input.doctor_id)
        .eq("appointment_date", input.block_date)
        .gte("time_slot", input.start_time)
        .lt("time_slot", input.end_time)
        .in("status", ["scheduled", "waiting"]);
      emitChange("appointments");
    }
    return data as unknown as ScheduleBlock;
  }

  async deleteScheduleBlock(id: string): Promise<void> {
    const { error } = await this.sb.from("schedule_blocks").delete().eq("id", id);
    if (error) throw error;
    emitChange("schedule_blocks");
  }

  /* ---------------- demo lifecycle ---------------- */

  async seedDemoData(): Promise<SeedCounts> {
    const bundle = buildSeedBundleSupabase();

    // Clear existing demo tables (FK-safe order) so reseeding is idempotent.
    await this.sb.from("medical_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.sb.from("schedule_blocks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.sb.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.sb.from("doctors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.sb.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const ins = async <T>(table: string, rows: unknown[]): Promise<T[]> => {
      if (!rows.length) return [];
      const { data, error } = await this.sb.from(table).insert(rows).select("*");
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    };

    await ins<Profile>("profiles", bundle.profiles);
    await ins<DoctorRow>("doctors", bundle.doctors);
    await ins<AppointmentRow>("appointments", bundle.appointments);
    await ins<MedicalRecord>("medical_records", bundle.medical_records);
    await ins<ScheduleBlock>("schedule_blocks", bundle.schedule_blocks);

    (
      [
        "doctors",
        "patients",
        "appointments",
        "medical_records",
        "schedule_blocks",
      ] as RealtimeTable[]
    ).forEach(emitChange);

    return {
      doctors: bundle.doctors.length,
      patients: bundle.profiles.filter((p) => p.role === "patient").length,
      appointments: bundle.appointments.length,
      medical_records: bundle.medical_records.length,
      schedule_blocks: bundle.schedule_blocks.length,
    };
  }

  async resetAll(): Promise<void> {
    await this.sb.from("medical_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.sb.from("schedule_blocks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.sb.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.sb.from("doctors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.sb.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    (
      [
        "doctors",
        "patients",
        "appointments",
        "medical_records",
        "schedule_blocks",
      ] as RealtimeTable[]
    ).forEach(emitChange);
  }
}

function buildSeedBundleSupabase() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrow = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  return buildSeedBundle(today, tomorrow);
}
