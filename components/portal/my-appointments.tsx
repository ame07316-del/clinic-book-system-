"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PhoneCall, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppData, useAppointments } from "@/lib/data";
import type { Appointment } from "@/lib/types";
import { formatDateShort, formatTimeSlot, initials, todayStr } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  MyAppointments — patients track their live queue status by phone.  */
/* ------------------------------------------------------------------ */

export function MyAppointments() {
  const { ds } = useAppData();
  const { data: appointments } = useAppointments();
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);

  const mine: Appointment[] = (appointments ?? [])
    .filter((a) => (lookup ? a.patient?.phone === lookup : false))
    .sort((a, b) =>
      b.appointment_date.localeCompare(a.appointment_date) ||
      b.time_slot.localeCompare(a.time_slot),
    );

  const upcoming = mine.filter(
    (a) =>
      a.appointment_date >= todayStr() &&
      (a.status === "scheduled" || a.status === "waiting" || a.status === "in_consultation"),
  );
  const past = mine.filter((a) => !upcoming.includes(a));

  const cancel = async (a: Appointment) => {
    if (!ds) return;
    try {
      await ds.updateAppointment(a.id, { status: "cancelled" });
      toast.success("Appointment cancelled", {
        description: `${formatDateShort(a.appointment_date)} ${formatTimeSlot(a.time_slot)} — the slot is free again.`,
      });
    } catch (e) {
      toast.error("Cancellation failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    }
  };

  return (
    <section id="track" className="border-t border-slate-100 bg-white/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              My appointments
            </h2>
            <p className="mt-1.5 text-muted-foreground">
              Enter the phone number you booked with to track your live queue status.
            </p>
          </div>
          <LiveIndicator mode={ds ? ds.mode : "connecting"} />
        </div>

        <div className="flex max-w-md gap-2">
          <div className="relative flex-1">
            <PhoneCall className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setLookup(phone.trim() || null)}
              placeholder="+1 (555) 231-4401"
              className="pl-9"
            />
          </div>
          <Button onClick={() => setLookup(phone.trim() || null)}>
            <Search /> Track
          </Button>
        </div>

        {lookup && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <AppointmentGroup
              title="Upcoming & active"
              appointments={upcoming}
              emptyText="No active appointments for this number."
              cancellable
              onCancel={cancel}
            />
            <AppointmentGroup
              title="Past & cancelled"
              appointments={past}
              emptyText="No history yet."
            />
          </div>
        )}
        {!lookup && (
          <p className="mt-6 rounded-xl border border-dashed bg-slate-50/70 px-4 py-3 text-sm text-muted-foreground">
            Tip: seed demo data (header ⋮ menu) and try tracking{" "}
            <button
              type="button"
              className="font-mono text-teal-700 underline decoration-dotted"
              onClick={() => {
                setPhone("+1 (555) 231-4401");
                setLookup("+1 (555) 231-4401");
              }}
            >
              +1 (555) 231-4401
            </button>{" "}
            — Ava Thompson has appointments today.
          </p>
        )}
      </div>
    </section>
  );
}

function AppointmentGroup({
  title,
  appointments,
  emptyText,
  cancellable = false,
  onCancel,
}: {
  title: string;
  appointments: Appointment[];
  emptyText: string;
  cancellable?: boolean;
  onCancel?: (a: Appointment) => void;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-100 pb-3">
        <CardTitle className="text-sm font-semibold text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-4">
        {appointments.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          appointments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3 shadow-xs"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                {initials(a.doctor?.profile?.full_name ?? "?")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {a.doctor?.profile?.full_name}{" "}
                  <span className="font-normal text-muted-foreground">· {a.doctor?.specialty}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateShort(a.appointment_date)} · {formatTimeSlot(a.time_slot)}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
              </div>
              <StatusBadge status={a.status} animated />
              {cancellable && (a.status === "scheduled" || a.status === "waiting") && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Cancel appointment"
                  onClick={() => onCancel?.(a)}
                >
                  <X className="text-slate-400 hover:text-destructive" />
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
