"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, CircleDollarSign, Search, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { BookingDialog } from "@/components/portal/booking-dialog";
import { computeSlotStates } from "@/lib/slots";
import { specialtyMeta } from "@/lib/specialties";
import { useAppointments, useDoctors, useScheduleBlocks } from "@/lib/data";
import type { Doctor } from "@/lib/types";
import { cn, formatTimeSlot, initials, todayStr } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  DoctorExplorer — specialty & doctor finder with live next-slot     */
/*  availability computed from appointments + schedule blocks.         */
/* ------------------------------------------------------------------ */

export function DoctorExplorer() {
  const today = todayStr();
  const { data: doctors, loading } = useDoctors();
  const { data: todayAppointments } = useAppointments({ date: today });
  const { data: todayBlocks } = useScheduleBlocks({ date: today });

  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string>("all");
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);

  const specialties = useMemo(() => {
    const set = new Set((doctors ?? []).map((d) => d.specialty));
    return Array.from(set).sort();
  }, [doctors]);

  const nextAvailable = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const d of doctors ?? []) {
      const states = computeSlotStates({
        date: today,
        appointments: (todayAppointments ?? []).filter((a) => a.doctor_id === d.id),
        blocks: (todayBlocks ?? []).filter((b) => b.doctor_id === d.id),
      });
      const first = states.find((s) => s.available);
      map.set(d.id, first?.slot ?? null);
    }
    return map;
  }, [doctors, todayAppointments, todayBlocks, today]);

  const filtered = (doctors ?? []).filter((d) => {
    if (specialty !== "all" && d.specialty !== specialty) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (d.profile?.full_name ?? "").toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q)
    );
  });

  return (
    <section id="find" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Find your specialist
          </h2>
          <p className="mt-1.5 text-muted-foreground">
            Availability below is computed live — booked slots and doctor breaks grey out
            automatically.
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctor or specialty…"
            className="pl-9"
          />
        </div>
      </div>

      {/* specialty chips */}
      <div className="mb-7 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSpecialty("all")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
            specialty === "all"
              ? "border-teal-600 bg-teal-600 text-white shadow-lift"
              : "border-slate-200 bg-card text-slate-600 hover:border-teal-300 hover:text-teal-700",
          )}
        >
          All specialties
        </button>
        {specialties.map((s) => {
          const meta = specialtyMeta(s);
          const Icon = meta.icon;
          const active = specialty === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSpecialty(active ? "all" : s)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                active
                  ? "border-teal-600 bg-teal-600 text-white shadow-lift"
                  : "border-slate-200 bg-card text-slate-600 hover:border-teal-300 hover:text-teal-700",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {s}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No doctors match your search"
          description="Try a different specialty or clear the search box."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const name = d.profile?.full_name ?? "Doctor";
            const meta = specialtyMeta(d.specialty);
            const Icon = meta.icon;
            const next = nextAvailable.get(d.id);
            return (
              <div
                key={d.id}
                className="group animate-rise flex flex-col rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-3 text-sm font-bold text-white shadow-lift">
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
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-600 ring-1 ring-amber-100">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CircleDollarSign className="h-3.5 w-3.5 text-teal-500" /> $
                    {d.consultation_fee} consult
                  </span>
                  {next ? (
                    <Badge variant="success" className="text-[10px]">
                      Next: today {formatTimeSlot(next)}
                    </Badge>
                  ) : (
                    <Badge variant="slate" className="text-[10px]">
                      Next: tomorrow
                    </Badge>
                  )}
                </div>

                <Button
                  className="mt-4 w-full"
                  variant="outline"
                  onClick={() => setBookingDoctor(d)}
                >
                  <CalendarPlus /> Book appointment
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <BookingDialog doctor={bookingDoctor} onClose={() => setBookingDoctor(null)} />
    </section>
  );
}
