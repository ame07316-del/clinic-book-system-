"use client";

import { Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { computeSlotStates, generateDaySlots, summarizeSlotStates } from "@/lib/slots";
import { useAppointments, useScheduleBlocks } from "@/lib/data";
import { cn, formatTimeSlot } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  SlotGrid — interactive day grid. Fully booked / blocked / past     */
/*  slots are greyed out dynamically from live data.                   */
/* ------------------------------------------------------------------ */

export function SlotGrid({
  doctorId,
  date,
  selected,
  onSelect,
  capacity = 1,
  includePast = false,
  className,
}: {
  doctorId: string | null;
  date: string;
  selected: string | null;
  onSelect: (slot: string | null) => void;
  capacity?: number;
  /** reception can override the past-time rule */
  includePast?: boolean;
  className?: string;
}) {
  const { data: appointments, loading: loadingApts } = useAppointments(
    doctorId ? { date, doctorId } : { date },
  );
  const { data: blocks, loading: loadingBlocks } = useScheduleBlocks(
    doctorId ? { date, doctorId } : { date },
  );

  const loading = loadingApts || loadingBlocks;

  const states = computeSlotStates({
    slots: generateDaySlots(),
    date,
    appointments: appointments ?? [],
    blocks: blocks ?? [],
    capacity,
  }).map((s) => ({
    ...s,
    available: s.available || (includePast && !s.blocked && !s.past),
  }));

  const summary = summarizeSlotStates(states);

  if (loading) {
    return (
      <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-5", className)}>
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {states.map((s) => {
          const disabled = !s.available;
          const isSelected = selected === s.slot;
          return (
            <button
              key={s.slot}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(isSelected ? null : s.slot)}
              title={
                s.blocked
                  ? `Blocked — ${s.blockReason}`
                  : s.past && !includePast
                    ? "Time has passed"
                    : !s.available
                      ? "Fully booked"
                      : `${s.booked}/${s.capacity} booked — available`
              }
              className={cn(
                "relative flex h-10 items-center justify-center rounded-lg border text-[13px] font-medium transition-all",
                isSelected
                  ? "border-teal-600 bg-teal-600 text-white shadow-lift"
                  : disabled
                    ? "cursor-not-allowed border-slate-100 bg-slate-100/80 text-slate-300 line-through decoration-slate-300"
                    : "border-slate-200 bg-card text-slate-700 hover:border-teal-400 hover:bg-teal-50/60 hover:text-teal-700 active:scale-95",
              )}
            >
              {formatTimeSlot(s.slot)}
              {s.blocked && (
                <Ban className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-rose-100 p-0.5 text-rose-500" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-teal-500 bg-teal-50" />
          {summary.available} available
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" />
          {summary.booked} booked · {summary.past} past
        </span>
        <span className="inline-flex items-center gap-1">
          <Ban className="h-3 w-3 text-rose-400" />
          {summary.blocked} blocked
        </span>
      </div>
    </div>
  );
}

export function DateStrip({
  dates,
  selected,
  onSelect,
}: {
  dates: string[];
  selected: string;
  onSelect: (d: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {dates.map((d, i) => {
        const day = new Date(d + "T00:00:00");
        const isSel = selected === d;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className={cn(
              "flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 transition-all",
              isSel
                ? "border-teal-600 bg-teal-600 text-white shadow-lift"
                : "border-slate-200 bg-card hover:border-teal-300 hover:bg-teal-50/50",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                isSel ? "text-teal-100" : "text-slate-400",
              )}
            >
              {i === 0 ? "Today" : day.toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            <span className={cn("mt-0.5 text-lg font-bold", isSel ? "text-white" : "text-slate-700")}>
              {day.getDate()}
            </span>
            <span
              className={cn(
                "text-[10px]",
                isSel ? "text-teal-100" : "text-slate-400",
              )}
            >
              {day.toLocaleDateString("en-US", { month: "short" })}
            </span>
          </button>
        );
      })}
    </div>
  );
}

