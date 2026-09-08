"use client";

import { Activity, Armchair, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { Appointment } from "@/lib/types";
import { cn, formatTimeSlot, initials } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  WaitingFeed — realtime waiting room list for one doctor.           */
/* ------------------------------------------------------------------ */

export function WaitingFeed({
  appointments,
  loading,
  selectedId,
  onSelect,
}: {
  appointments: Appointment[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (a: Appointment) => void;
}) {
  const waiting = appointments.filter((a) => a.status === "waiting");
  const inConsultation = appointments.filter((a) => a.status === "in_consultation");
  const completedToday = appointments.filter((a) => a.status === "completed").length;
  const scheduledAhead = appointments.filter((a) => a.status === "scheduled").length;

  return (
    <Card className="animate-rise">
      <CardHeader className="border-b border-slate-100 pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Armchair className="h-4.5 w-4.5 text-amber-500" /> Waiting Room
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            {waiting.length} seated
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {inConsultation.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border-2 border-teal-500 bg-teal-50/70 px-3 py-2.5 text-left transition-shadow hover:shadow-soft",
              selectedId === a.id && "ring-2 ring-teal-300 ring-offset-1",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
              {initials(a.patient?.full_name ?? "?")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-teal-900">
                {a.patient?.full_name}
              </span>
              <span className="text-xs text-teal-700">In consultation now</span>
            </span>
            <StatusBadge status="in_consultation" animated />
          </button>
        ))}

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : waiting.length === 0 ? (
          <EmptyState
            icon={Armchair}
            title="Waiting room is empty"
            description="Patients checked in by reception appear here instantly — no refresh needed."
            className="py-8"
          />
        ) : (
          waiting.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-all hover:border-teal-300 hover:shadow-soft active:scale-[0.99]",
                selectedId === a.id && "border-teal-500 bg-teal-50/50 ring-1 ring-teal-300",
              )}
            >
              <span className="w-5 text-center text-xs font-bold text-slate-300">{i + 1}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {initials(a.patient?.full_name ?? "?")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {a.patient?.full_name}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {formatTimeSlot(a.time_slot)}
                  {a.reason ? ` · ${a.reason}` : ""}
                </span>
              </span>
              <StatusBadge status="waiting" animated />
            </button>
          ))
        )}

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-muted-foreground ring-1 ring-slate-100">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-teal-500" /> {scheduledAhead} scheduled ahead
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {completedToday} completed
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
