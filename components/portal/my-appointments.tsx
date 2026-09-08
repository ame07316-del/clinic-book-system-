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
import { avatarHue, formatDateShort, formatTimeSlot, initials, todayStr } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  MyAppointments — المريض يتابع حالة الطابور برقم هاتفه.             */
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
      toast.success("تم إلغاء الموعد", {
        description: `${formatDateShort(a.appointment_date)} ${formatTimeSlot(a.time_slot)} — المعاد متاح للحجز من جديد.`,
      });
    } catch (e) {
      toast.error("فشل الإلغاء", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    }
  };

  return (
    <section id="track" className="border-t border-slate-100 bg-white/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              مواعيدي
            </h2>
            <p className="mt-1.5 text-muted-foreground">
              أدخل رقم الهاتف الذي حجزت به لمتابعة حالة موعدك لحظيًا.
            </p>
          </div>
          <LiveIndicator mode={ds ? ds.mode : "connecting"} />
        </div>

        <div className="flex max-w-md gap-2">
          <div className="relative flex-1">
            <PhoneCall className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setLookup(phone.trim() || null)}
              placeholder="+20 101 234 4401"
              className="ps-9"
            />
          </div>
          <Button onClick={() => setLookup(phone.trim() || null)}>
            <Search /> متابعة
          </Button>
        </div>

        {lookup && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <AppointmentGroup
              title="القادمة والنشطة"
              appointments={upcoming}
              emptyText="لا توجد مواعيد نشطة بهذا الرقم."
              cancellable
              onCancel={cancel}
            />
            <AppointmentGroup
              title="السابقة والملغاة"
              appointments={past}
              emptyText="لا يوجد سجل بعد."
            />
          </div>
        )}
        {!lookup && (
          <p className="mt-6 rounded-xl border border-dashed bg-slate-50/70 px-4 py-3 text-sm text-muted-foreground">
            نصيحة: حمّل البيانات التجريبية (قائمة ⋮) ثم جرّب متابعة{" "}
            <button
              type="button"
              className="font-mono text-teal-700 underline decoration-dotted"
              dir="ltr"
              onClick={() => {
                setPhone("+20 101 234 4401");
                setLookup("+20 101 234 4401");
              }}
            >
              +20 101 234 4401
            </button>{" "}
            — أمنية جمال لديها مواعيد اليوم.
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
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                style={{ background: avatarHue(a.doctor?.profile?.full_name ?? "؟") }}
              >
                {initials(a.doctor?.profile?.full_name ?? "؟")}
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
                  aria-label="إلغاء الموعد"
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
