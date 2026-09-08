"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BedDouble,
  CheckCircle2,
  CreditCard,
  LogOut,
  Receipt,
  Search,
  Stethoscope,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentBadge, StatusBadge } from "@/components/shared/status-badge";
import { useAppData } from "@/lib/data";
import type { Appointment } from "@/lib/types";
import { cn, formatCurrency, formatTimeSlot, initials, timeAgo } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  QueueTable — the live patient queue. Status transitions:           */
/*  Scheduled → Waiting → In Consultation → Completed  (+ Cancelled)   */
/*  Updates in realtime via the Supabase bus (or local demo bus).      */
/* ------------------------------------------------------------------ */

export function QueueTable({
  appointments,
  loading,
  onCollectPayment,
  doctorFilterLabel,
}: {
  appointments: Appointment[];
  loading: boolean;
  onCollectPayment: (a: Appointment) => void;
  doctorFilterLabel?: string;
}) {
  const { ds } = useAppData();
  const [search, setSearch] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  const filtered = appointments.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.patient?.full_name ?? "").toLowerCase().includes(q) ||
      (a.doctor?.profile?.full_name ?? "").toLowerCase().includes(q) ||
      (a.doctor?.specialty ?? "").toLowerCase().includes(q)
    );
  });

  const setTransition = async (a: Appointment, status: Appointment["status"], message: string) => {
    if (!ds) return;
    setBusyId(a.id);
    try {
      await ds.updateAppointment(a.id, { status });
      toast.success(message, {
        description: `${a.patient?.full_name} → ${status.replace("_", " ")}`,
      });
    } catch (e) {
      toast.error("Status update failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const cancel = (a: Appointment) => {
    if (confirmCancelId !== a.id) {
      setConfirmCancelId(a.id);
      confirmTimer.current = setTimeout(() => setConfirmCancelId(null), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmCancelId(null);
    void setTransition(a, "cancelled", "Appointment cancelled");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, doctor, specialty…"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {loading ? "Syncing…" : `${filtered.length} appointment${filtered.length === 1 ? "" : "s"}${doctorFilterLabel ? ` · ${doctorFilterLabel}` : " · all doctors"}`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No appointments in view"
          description="Seed demo data from the header menu or register a walk-in to populate today's queue."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="w-10 pl-4">#</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a, i) => {
                const busy = busyId === a.id;
                const paid = a.payment_status === "paid";
                return (
                  <TableRow key={a.id} className="group">
                    <TableCell className="pl-4">
                      <span className="text-xs font-semibold text-slate-300">{i + 1}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: `oklch(0.55 0.09 ${((a.patient?.full_name ?? "?").length * 37) % 360})` }}
                        >
                          {initials(a.patient?.full_name ?? "?")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">
                            {a.patient?.full_name ?? "Unknown patient"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.reason ?? a.patient?.phone ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-700">
                        {a.doctor?.profile?.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.doctor?.specialty}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatTimeSlot(a.time_slot)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{a.appointment_date}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} animated />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <PaymentBadge paid={paid} />
                        <span className="text-[11px] text-muted-foreground">
                          {paid ? `${formatCurrency(a.doctor?.consultation_fee ?? 0)} · ${timeAgo(a.paid_at)}` : formatCurrency(a.doctor?.consultation_fee ?? 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === "scheduled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                            onClick={() => void setTransition(a, "waiting", "Patient moved to waiting room")}
                          >
                            <BedDouble /> Check in
                          </Button>
                        )}
                        {a.status === "waiting" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void setTransition(a, "in_consultation", "Patient moved to consultation")
                            }
                          >
                            <Stethoscope /> Send in
                            <ArrowRight />
                          </Button>
                        )}
                        {a.status === "in_consultation" && (
                          <Button
                            size="sm"
                            variant="success"
                            disabled={busy}
                            onClick={() => void setTransition(a, "completed", "Consultation completed")}
                          >
                            <CheckCircle2 /> Complete
                          </Button>
                        )}
                        {(a.status === "completed" || a.status === "waiting" || a.status === "scheduled") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            title={paid ? "View payment" : "Collect payment"}
                            onClick={() => onCollectPayment(a)}
                            className={cn(!paid && "text-teal-700 hover:bg-teal-50")}
                          >
                            {paid ? <Receipt /> : <CreditCard />}
                          </Button>
                        )}
                        {(a.status === "scheduled" || a.status === "waiting") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => cancel(a)}
                            className={cn(
                              confirmCancelId === a.id
                                ? "bg-rose-600 text-white hover:bg-rose-600 hover:text-white"
                                : "text-slate-400 hover:text-destructive",
                            )}
                          >
                            {confirmCancelId === a.id ? <X /> : <LogOut />}
                            {confirmCancelId === a.id ? "Confirm" : ""}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
