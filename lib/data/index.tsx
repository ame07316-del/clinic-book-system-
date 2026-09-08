"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onChange } from "@/lib/data/bus";
import { LocalStore } from "@/lib/data/local-store";
import { SupabaseAdapter } from "@/lib/data/supabase-adapter";
import { getSupabaseClient, withTimeout } from "@/lib/supabase/client";
import type {
  Appointment,
  AppointmentStatus,
  Doctor,
  MedicalRecord,
  NewAppointmentInput,
  NewScheduleBlockInput,
  PaymentMethod,
  PaymentStatus,
  Profile,
  RealtimeTable,
  ScheduleBlock,
  SeedCounts,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  DataSource — the single contract every feature talks to.           */
/*  Two implementations: SupabaseAdapter (production) and LocalStore   */
/*  (auto-fallback demo backend with simulated realtime).              */
/* ------------------------------------------------------------------ */

export interface DataSource {
  mode: "supabase" | "demo";
  getDoctors(): Promise<Doctor[]>;
  getPatients(): Promise<Profile[]>;
  getAppointments(filter?: {
    date?: string;
    doctorId?: string;
    patientId?: string;
  }): Promise<Appointment[]>;
  getMedicalRecords(): Promise<MedicalRecord[]>;
  getScheduleBlocks(filter?: { date?: string; doctorId?: string }): Promise<ScheduleBlock[]>;
  createPatient(input: { full_name: string; phone?: string | null }): Promise<Profile>;
  createAppointment(input: NewAppointmentInput): Promise<Appointment>;
  updateAppointment(
    id: string,
    patch: Partial<{
      status: AppointmentStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      time_slot: string;
      reason: string;
    }>,
  ): Promise<Appointment>;
  upsertMedicalRecord(record: {
    appointment_id: string;
    diagnosis: string;
    prescription: MedicalRecord["prescription"];
  }): Promise<MedicalRecord>;
  createScheduleBlock(input: NewScheduleBlockInput): Promise<ScheduleBlock>;
  deleteScheduleBlock(id: string): Promise<void>;
  seedDemoData(): Promise<SeedCounts>;
  resetAll(): Promise<void>;
}

export type ConnectionMode = "connecting" | "supabase" | "demo";

interface AppDataValue {
  ds: DataSource | null;
  mode: ConnectionMode;
  message: string | null;
  reconnect: () => void;
}

const AppDataContext = createContext<AppDataValue>({
  ds: null,
  mode: "connecting",
  message: null,
  reconnect: () => {},
});

let localStoreSingleton: LocalStore | null = null;
let cleanupRealtime: (() => void) | null = null;

async function getLocalStore(): Promise<LocalStore> {
  if (!localStoreSingleton) localStoreSingleton = new LocalStore();
  await localStoreSingleton.init();
  return localStoreSingleton;
}

async function resolveDataSource(): Promise<{ ds: DataSource; message: string | null }> {
  const sb = getSupabaseClient();

  if (sb) {
    try {
      // Probe: does the project respond AND have the schema deployed?
      await withTimeout(sb.from("doctors").select("id").limit(1), 6000);
      const adapter = new SupabaseAdapter(sb);
      cleanupRealtime?.();
      cleanupRealtime = adapter.init();
      return { ds: adapter, message: null };
    } catch (err) {
      const reason =
        err instanceof Error && err.message.startsWith("timeout")
          ? "Supabase is unreachable (connection timed out)"
          : "Supabase schema not found — run supabase/schema.sql to go live";
      const local = await getLocalStore();
      await local.seedIfEmpty();
      return { ds: local, message: reason };
    }
  }

  const local = await getLocalStore();
  await local.seedIfEmpty();
  return {
    ds: local,
    message: "Supabase env vars not configured — running on local demo data",
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ds, setDs] = useState<DataSource | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    resolveDataSource()
      .then((r) => {
        if (cancelled) return;
        setDs(r.ds);
        setMessage(r.message);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("DataSource resolution failed", e);
        setMessage("Data backend unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reconnect = useCallback(() => setAttempt((a) => a + 1), []);

  // mode is derived: no backend yet = still connecting.
  const value = useMemo<AppDataValue>(
    () => ({ ds, mode: ds ? ds.mode : "connecting", message, reconnect }),
    [ds, message, reconnect],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  return useContext(AppDataContext);
}

/* ------------------------------------------------------------------ */
/*  useCollection — fetch + auto-refetch on realtime bus events.       */
/*  `fetcher` must be stable (wrap in useCallback with primitive deps).*/
/* ------------------------------------------------------------------ */

const DOCTOR_TOPICS: RealtimeTable[] = ["doctors", "patients"];
const APPOINTMENT_TOPICS: RealtimeTable[] = ["appointments", "patients", "doctors"];
const RECORD_TOPICS: RealtimeTable[] = ["medical_records"];
const BLOCK_TOPICS: RealtimeTable[] = ["schedule_blocks"];
const PATIENT_TOPICS: RealtimeTable[] = ["patients"];

export function useCollection<T>(
  topics: RealtimeTable[],
  fetcher: (ds: DataSource) => Promise<T>,
): { data: T | null; loading: boolean; refetch: () => void } {
  const { ds, mode } = useAppData();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial (and refetch-on-backend-change) load.
  useEffect(() => {
    if (!ds) return;
    let live = true;
    void (async () => {
      try {
        const result = await fetcher(ds);
        if (live) setData(result);
      } catch (e) {
        console.error("useCollection fetch failed", e);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [ds, fetcher]);

  // Realtime: refetch silently whenever a relevant table changes.
  useEffect(() => {
    if (!ds) return;
    return onChange((table) => {
      if (!topics.includes(table)) return;
      void fetcher(ds)
        .then((result) => setData(result))
        .catch((e) => console.error("useCollection refetch failed", e));
    });
  }, [ds, fetcher, topics]);

  const refetch = useCallback(() => {
    if (!ds) return;
    void fetcher(ds)
      .then((result) => setData(result))
      .catch(() => {});
  }, [ds, fetcher]);

  return { data, loading: loading || mode === "connecting", refetch };
}

export function useDoctors() {
  const fetcher = useCallback((ds: DataSource) => ds.getDoctors(), []);
  return useCollection<Doctor[]>(DOCTOR_TOPICS, fetcher);
}

export function usePatients() {
  const fetcher = useCallback((ds: DataSource) => ds.getPatients(), []);
  return useCollection<Profile[]>(PATIENT_TOPICS, fetcher);
}

export function useAppointments(filter?: {
  date?: string;
  doctorId?: string;
  patientId?: string;
}) {
  const date = filter?.date ?? "";
  const doctorId = filter?.doctorId ?? "";
  const patientId = filter?.patientId ?? "";
  const fetcher = useCallback(
    (ds: DataSource) =>
      ds.getAppointments({
        date: date || undefined,
        doctorId: doctorId || undefined,
        patientId: patientId || undefined,
      }),
    [date, doctorId, patientId],
  );
  return useCollection<Appointment[]>(APPOINTMENT_TOPICS, fetcher);
}

export function useMedicalRecords() {
  const fetcher = useCallback((ds: DataSource) => ds.getMedicalRecords(), []);
  return useCollection<MedicalRecord[]>(RECORD_TOPICS, fetcher);
}

export function useScheduleBlocks(filter?: { date?: string; doctorId?: string }) {
  const date = filter?.date ?? "";
  const doctorId = filter?.doctorId ?? "";
  const fetcher = useCallback(
    (ds: DataSource) =>
      ds.getScheduleBlocks({ date: date || undefined, doctorId: doctorId || undefined }),
    [date, doctorId],
  );
  return useCollection<ScheduleBlock[]>(BLOCK_TOPICS, fetcher);
}
