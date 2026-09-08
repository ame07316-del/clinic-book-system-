"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { SiteHeader } from "@/components/shared/site-header";
import { WaitingFeed } from "@/components/doctor/waiting-feed";
import { ConsultationPanel } from "@/components/doctor/consultation-panel";
import { useAppData, useAppointments, useDoctors } from "@/lib/data";
import { initials, todayStr } from "@/lib/utils";

export function DoctorWorkspace({ doctorId }: { doctorId: string }) {
  const { mode } = useAppData();
  const { data: doctors, loading: doctorsLoading } = useDoctors();
  const today = todayStr();
  const { data: appointments, loading } = useAppointments({ date: today, doctorId });
  const [explicitId, setExplicitId] = useState<string | null>(null);

  const doctor = doctors?.find((d) => d.id === doctorId) ?? null;

  // Selection is derived from live data (no effect needed):
  // - the doctor's explicit pick wins while it still exists,
  // - otherwise auto-select the in-consultation patient, then the first waiting.
  const autoId = useMemo(() => {
    if (!appointments) return null;
    return (
      appointments.find((a) => a.status === "in_consultation")?.id ??
      appointments.find((a) => a.status === "waiting")?.id ??
      null
    );
  }, [appointments]);

  const selectedId =
    explicitId && appointments?.some((a) => a.id === explicitId) ? explicitId : autoId;

  const selected = useMemo(
    () => appointments?.find((a) => a.id === selectedId) ?? null,
    [appointments, selectedId],
  );

  // If the selected appointment's status flips to completed elsewhere, keep it
  // visible (doctor may still write notes) — no forced deselection.

  if (doctorsLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6">
          <Skeleton className="h-20 rounded-xl" />
          <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <EmptyState
            icon={Stethoscope}
            title="Doctor not found"
            description="This doctor profile doesn't exist in the current backend. Seed demo data from the header menu, then pick a doctor from the list."
            action={
              <Button asChild>
                <Link href="/doctor">
                  <ArrowLeft /> Back to doctor list
                </Link>
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  const name = doctor.profile?.full_name ?? "Doctor";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {/* doctor identity bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="Back to doctors">
              <Link href="/doctor">
                <ArrowLeft />
              </Link>
            </Button>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-bold text-white shadow-lift">
              {initials(name)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{name}</h1>
                <LiveIndicator mode={mode} />
              </div>
              <p className="text-sm text-muted-foreground">
                {doctor.specialty} · consultation fee ${doctor.consultation_fee} ·{" "}
                <span className="font-medium text-teal-700">today&apos;s clinic</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <WaitingFeed
            appointments={appointments ?? []}
            loading={loading}
            selectedId={selectedId}
            onSelect={(a) => setExplicitId(a.id)}
          />
          <ConsultationPanel
            selected={selected}
            onFinished={() => {
              /* keep panel open so doctor can print the saved prescription */
            }}
          />
        </div>
      </main>
    </div>
  );
}
