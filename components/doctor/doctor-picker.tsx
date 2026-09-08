"use client";

import Link from "next/link";
import { ArrowRight, BedDouble, CalendarCheck2, CircleDollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { SiteHeader } from "@/components/shared/site-header";
import { specialtyMeta } from "@/lib/specialties";
import { useAppointments, useDoctors } from "@/lib/data";
import { initials, todayStr } from "@/lib/utils";

export function DoctorPicker() {
  const today = todayStr();
  const { data: doctors, loading } = useDoctors();
  const { data: appointments } = useAppointments({ date: today });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Doctor Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a doctor profile to open their consultation workspace with a realtime waiting
            room feed, e-prescriptions and one-click visit completion.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : (doctors ?? []).length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="No doctors found"
            description="Seed the demo data from the header menu (⋮ → Seed demo data) to populate six specialists with today's queue."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(doctors ?? []).map((d) => {
              const name = d.profile?.full_name ?? "Doctor";
              const meta = specialtyMeta(d.specialty);
              const Icon = meta.icon;
              const todayAppts = (appointments ?? []).filter((a) => a.doctor_id === d.id);
              const waiting = todayAppts.filter((a) => a.status === "waiting").length;
              const total = todayAppts.length;
              return (
                <Link
                  key={d.id}
                  href={`/doctor/${d.id}`}
                  className="group animate-rise rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-bold text-white shadow-lift">
                        {initials(name)}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{name}</p>
                        <span
                          className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${meta.tint}`}
                        >
                          <Icon className="h-3 w-3" /> {d.specialty}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-teal-500" />
                  </div>
                  <div className="mt-4 flex items-center gap-4 border-t border-dashed pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-semibold text-slate-700">{waiting}</span> waiting
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck2 className="h-3.5 w-3.5 text-sky-500" />
                      <span className="font-semibold text-slate-700">{total}</span> today
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CircleDollarSign className="h-3.5 w-3.5 text-teal-500" /> ${d.consultation_fee}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
