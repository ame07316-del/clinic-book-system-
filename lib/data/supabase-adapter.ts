import type { SupabaseClient } from "@supabase/supabase-js";
import { emitChange } from "@/lib/data/bus";
import { buildSeedBundle } from "@/lib/data/seed";
import type {
  Appointment,
  AppointmentFullPatch,
  AppointmentRow,
  Doctor,
  DoctorPatch,
  DoctorRow,
  DoctorWithProfileInput,
  MedicalRecord,
  NewAppointmentInput,
  NewScheduleBlockInput,
  Profile,
  ProfilePatch,
  RealtimeTable,
  ScheduleBlock,
  SeedCounts,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  SupabaseAdapter — مصدر البيانات الإنتاجي عبر supabase-js.          */
/*  يستخدم PostgREST للقراءة والكتابة و Postgres Changes (Realtime)    */
/*  لبث أحداث الجداول إلى ناقل الواجهة.                                */
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => emitChange("settings"),
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

  /* ---------------- عمليات المرضى والمواعيد ---------------- */

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

  async updateAppointment(id: string, patch: AppointmentFullPatch): Promise<Appointment> {
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

  async deleteAppointment(id: string): Promise<void> {
    await this.sb.from("medical_records").delete().eq("appointment_id", id);
    const { error } = await this.sb.from("appointments").delete().eq("id", id);
    if (error) throw error;
    emitChange("appointments");
    emitChange("medical_records");
  }

  /* ---------------- السجلات الطبية ---------------- */

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

  async deleteMedicalRecord(id: string): Promise<void> {
    const { error } = await this.sb.from("medical_records").delete().eq("id", id);
    if (error) throw error;
    emitChange("medical_records");
  }

  /* ---------------- حظر المواعيد ---------------- */

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

  /* ---------------- أدوات الأدمن (صلاحيات كاملة) ---------------- */

  async createDoctorWithProfile(input: DoctorWithProfileInput): Promise<Doctor> {
    const { data: profile, error: profileError } = await this.sb
      .from("profiles")
      .insert({
        full_name: input.full_name.trim(),
        role: "doctor",
        phone: input.phone?.trim() || null,
      })
      .select("*")
      .single();
    if (profileError) throw profileError;
    const prof = profile as unknown as Profile;
    const { data, error } = await this.sb
      .from("doctors")
      .insert({
        user_id: prof.id,
        specialty: input.specialty.trim(),
        consultation_fee: input.consultation_fee,
      })
      .select("*, profile:profiles(*)")
      .single();
    if (error) throw error;
    emitChange("doctors");
    const r = data as unknown as DoctorRow & { profile: Profile | null };
    return { ...r, profile: r.profile ?? null };
  }

  async updateDoctor(doctorId: string, patch: DoctorPatch): Promise<void> {
    const doctorBody: Record<string, unknown> = {};
    if (patch.specialty !== undefined) doctorBody.specialty = patch.specialty;
    if (patch.consultation_fee !== undefined) doctorBody.consultation_fee = patch.consultation_fee;
    if (Object.keys(doctorBody).length > 0) {
      const { error } = await this.sb.from("doctors").update(doctorBody).eq("id", doctorId);
      if (error) throw error;
    }
    if (patch.full_name !== undefined || patch.phone !== undefined) {
      const { data: row } = await this.sb
        .from("doctors")
        .select("user_id")
        .eq("id", doctorId)
        .single();
      const userId = (row as { user_id: string | null } | null)?.user_id;
      if (userId) {
        const profileBody: Record<string, unknown> = {};
        if (patch.full_name !== undefined) profileBody.full_name = patch.full_name.trim();
        if (patch.phone !== undefined) profileBody.phone = patch.phone?.trim() || null;
        const { error } = await this.sb.from("profiles").update(profileBody).eq("id", userId);
        if (error) throw error;
      }
    }
    emitChange("doctors");
    emitChange("patients");
    emitChange("appointments");
  }

  async deleteDoctor(doctorId: string): Promise<void> {
    const { data: apptIds } = await this.sb
      .from("appointments")
      .select("id")
      .eq("doctor_id", doctorId);
    const ids = ((apptIds ?? []) as Array<{ id: string }>).map((x) => x.id);
    if (ids.length > 0) {
      await this.sb.from("medical_records").delete().in("appointment_id", ids);
    }
    await this.sb.from("appointments").delete().eq("doctor_id", doctorId);
    await this.sb.from("schedule_blocks").delete().eq("doctor_id", doctorId);
    const { data: row } = await this.sb
      .from("doctors")
      .select("user_id")
      .eq("id", doctorId)
      .single();
    const userId = (row as { user_id: string | null } | null)?.user_id;
    const { error } = await this.sb.from("doctors").delete().eq("id", doctorId);
    if (error) throw error;
    if (userId) await this.sb.from("profiles").delete().eq("id", userId);
    emitChange("doctors");
    emitChange("appointments");
    emitChange("medical_records");
    emitChange("schedule_blocks");
    emitChange("patients");
  }

  async updateProfile(profileId: string, patch: ProfilePatch): Promise<void> {
    const body: Record<string, unknown> = {};
    if (patch.full_name !== undefined) body.full_name = patch.full_name.trim();
    if (patch.phone !== undefined) body.phone = patch.phone?.trim() || null;
    if (Object.keys(body).length === 0) return;
    const { error } = await this.sb.from("profiles").update(body).eq("id", profileId);
    if (error) throw error;
    emitChange("patients");
    emitChange("appointments");
  }

  async deletePatient(patientId: string): Promise<void> {
    const { data: apptIds } = await this.sb
      .from("appointments")
      .select("id")
      .eq("patient_id", patientId);
    const ids = ((apptIds ?? []) as Array<{ id: string }>).map((x) => x.id);
    if (ids.length > 0) {
      await this.sb.from("medical_records").delete().in("appointment_id", ids);
    }
    await this.sb.from("appointments").delete().eq("patient_id", patientId);
    const { error } = await this.sb.from("profiles").delete().eq("id", patientId);
    if (error) throw error;
    emitChange("patients");
    emitChange("appointments");
    emitChange("medical_records");
  }

  async getSettings(): Promise<Record<string, unknown>> {
    const { data, error } = await this.sb.from("app_settings").select("key, value");
    if (error) throw error;
    const out: Record<string, unknown> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: unknown }>) {
      out[row.key] = row.value;
    }
    return out;
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    const { error } = await this.sb
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    emitChange("settings");
  }

  /* ---------------- دورة حياة العرض التجريبي ---------------- */

  async seedDemoData(): Promise<SeedCounts> {
    const bundle = buildSeedBundleSupabase();

    // مسح الجداول التجريبية (بترتيب آمن للمفاتيح الأجنبية) حتى يكون
    // إعادة التعبئة idempotent.
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
