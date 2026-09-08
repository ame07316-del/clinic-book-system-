"use client";

import { FileText, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { Appointment, MedicalRecord } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  PatientHistory — past medical notes & prescriptions of a patient.  */
/* ------------------------------------------------------------------ */

export function PatientHistory({
  records,
  appointments,
  loading,
  excludeAppointmentId,
}: {
  records: MedicalRecord[];
  appointments: Appointment[];
  loading: boolean;
  excludeAppointmentId?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const relevant = records
    .filter((r) => r.appointment_id !== excludeAppointmentId)
    .map((r) => ({ record: r, appt: appointments.find((a) => a.id === r.appointment_id) }))
    .filter((x): x is { record: MedicalRecord; appt: Appointment } => Boolean(x.appt))
    .sort((a, b) =>
      b.appt.appointment_date.localeCompare(a.appt.appointment_date) ||
      b.appt.time_slot.localeCompare(a.appt.time_slot),
    );

  if (relevant.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No past medical history"
        description="Records saved on completed consultations will appear here for future visits."
      />
    );
  }

  return (
    <div className="space-y-3">
      {relevant.map(({ record, appt }) => (
        <div key={record.id} className="animate-rise rounded-xl border bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed pb-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-teal-50 p-1.5 ring-1 ring-teal-100">
                <FileText className="h-4 w-4 text-teal-600" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDateShort(appt.appointment_date)} · {appt.time_slot}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appt.doctor?.profile?.full_name} — {appt.doctor?.specialty}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {record.prescription.length} medication{record.prescription.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-500">Diagnosis: </span>
            {record.diagnosis || "—"}
          </p>
          {record.prescription.length > 0 && (
            <ul className="mt-2 space-y-1">
              {record.prescription.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-600">
                  <span className="font-semibold text-teal-700">℞ {m.medicine}</span>
                  <span>{[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
