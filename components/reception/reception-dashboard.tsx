"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  BedDouble,
  CalendarOff,
  CheckCircle2,
  DoorOpen,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { StatCard } from "@/components/shared/stat-card";
import { QueueTable } from "@/components/reception/queue-table";
import { QuickRegisterDialog } from "@/components/reception/quick-register-dialog";
import { SlotBlockerDialog } from "@/components/reception/slot-blocker-dialog";
import { PaymentDialog } from "@/components/reception/payment-dialog";
import { SiteHeader } from "@/components/shared/site-header";
import { useAppData, useAppointments, useScheduleBlocks } from "@/lib/data";
import type { Appointment } from "@/lib/types";
import { formatCurrency, formatTimeSlot, todayStr } from "@/lib/utils";

const BLOCK_STYLE: Record<string, { label: string; className: string }> = {
  break: { label: "استراحة", className: "border-amber-200 bg-amber-50 text-amber-700" },
  emergency: { label: "طوارئ", className: "border-rose-200 bg-rose-50 text-rose-700" },
  custom: { label: "محجوب", className: "border-slate-200 bg-slate-100 text-slate-600" },
};

export function ReceptionDashboard() {
  const { ds } = useAppData();
  const today = todayStr();
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [quickOpen, setQuickOpen] = useState(false);
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [paymentFor, setPaymentFor] = useState<Appointment | null>(null);

  const { data: allAppointments, loading } = useAppointments({ date: today });
  const { data: blocks, loading: loadingBlocks } = useScheduleBlocks({ date: today });

  const appointments = useMemo(() => {
    const rows = allAppointments ?? [];
    return doctorFilter === "all" ? rows : rows.filter((a) => a.doctor_id === doctorFilter);
  }, [allAppointments, doctorFilter]);

  const stats = useMemo(() => {
    const rows = allAppointments ?? [];
    return {
      total: rows.length,
      waiting: rows.filter((a) => a.status === "waiting").length,
      inConsultation: rows.filter((a) => a.status === "in_consultation").length,
      completed: rows.filter((a) => a.status === "completed").length,
      collected: rows
        .filter((a) => a.payment_status === "paid")
        .reduce((sum, a) => sum + (a.doctor?.consultation_fee ?? 0), 0),
      pending: rows.filter((a) => a.payment_status === "pending" && a.status !== "cancelled").length,
    };
  }, [allAppointments]);

  const doctorName = (id: string) => doctorIdToName(allAppointments ?? [], id);
  const filterLabel = doctorFilter === "all" ? undefined : doctorName(doctorFilter);

  return (
    <div className="min-h-screen">
      <SiteHeader
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <Button variant="outline" size="sm" onClick={() => setBlockerOpen(true)}>
              <CalendarOff /> حظر وقت
            </Button>
            <Button size="sm" onClick={() => setQuickOpen(true)}>
              <UserPlus /> تسجيل سريع
            </Button>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* عنوان الصفحة */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                كونسول الاستقبال
              </h1>
              <LiveIndicator mode={ds ? ds.mode : "connecting"} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              طابور المرضى المباشر لليوم — كل تغيير في الحالة يوصلك فورًا عبر Supabase Realtime.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <Button variant="outline" size="sm" onClick={() => setBlockerOpen(true)}>
              <CalendarOff />
            </Button>
            <Button size="sm" onClick={() => setQuickOpen(true)}>
              <UserPlus /> تسجيل سريع
            </Button>
          </div>
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label="إجمالي اليوم"
            value={stats.total}
            icon={Users}
            tint="bg-slate-100 text-slate-600 ring-slate-200"
            loading={loading}
          />
          <StatCard
            label="غرفة الانتظار"
            value={stats.waiting}
            sub="مرضى بالانتظار"
            icon={BedDouble}
            tint="bg-amber-50 text-amber-600 ring-amber-100"
            loading={loading}
          />
          <StatCard
            label="داخل الكشفية"
            value={stats.inConsultation}
            sub="مع الأطباء الآن"
            icon={Activity}
            tint="bg-teal-50 text-teal-600 ring-teal-100"
            loading={loading}
          />
          <StatCard
            label="تم الكشف"
            value={stats.completed}
            sub="كشوفيات منتهية اليوم"
            icon={CheckCircle2}
            tint="bg-emerald-50 text-emerald-600 ring-emerald-100"
            loading={loading}
          />
          <StatCard
            label="المُحصَّل"
            value={formatCurrency(stats.collected)}
            sub={`${stats.pending} دفعات معلقة`}
            icon={Wallet}
            tint="bg-cyan-50 text-cyan-600 ring-cyan-100"
            loading={loading}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* الطابور */}
          <Card className="animate-rise">
            <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <DoorOpen className="h-4.5 w-4.5 text-teal-600" /> مدير طابور المرضى المباشر
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">فلتر:</span>
                <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                  <SelectTrigger className="h-8 w-[190px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأطباء</SelectItem>
                    {doctorOptions(allAppointments ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <QueueTable
                appointments={appointments}
                loading={loading}
                onCollectPayment={setPaymentFor}
                doctorFilterLabel={filterLabel}
              />
            </CardContent>
          </Card>

          {/* الشريط الجانبي: المواعيد المحجوبة */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarOff className="h-4 w-4 text-teal-600" /> المواعيد المحجوبة
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setBlockerOpen(true)}>
                  <Plus /> جديد
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {loadingBlocks ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))
                ) : (blocks ?? []).length === 0 ? (
                  <EmptyState
                    icon={CalendarOff}
                    title="لا يوجد حظر اليوم"
                    description="استخدم «منع المواعيد الديناميكي» لحجز الاستراحات أو الطوارئ."
                    className="py-8"
                  />
                ) : (
                  (blocks ?? []).map((b) => {
                    const style = BLOCK_STYLE[b.type] ?? BLOCK_STYLE.custom!;
                    return (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-slate-50/60 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={`justify-center ${style.className}`}>
                              {style.label}
                            </Badge>
                            <span className="text-xs font-semibold text-slate-700">
                              {formatTimeSlot(b.start_time)}–{formatTimeSlot(b.end_time)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {doctorName(b.doctor_id)} · {b.reason ?? "غير متاح"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="إزالة الحظر"
                          onClick={() => {
                            void ds
                              ?.deleteScheduleBlock(b.id)
                              .then(() => toast.success("تم إزالة الحظر — المعادات متاحة من جديد"));
                          }}
                        >
                          <Trash2 className="text-slate-400 hover:text-destructive" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-teal-100 bg-gradient-to-br from-teal-50/80 to-cyan-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-teal-900">
                  دليل سير الحالة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-relaxed text-teal-800">
                <p>
                  <span className="font-semibold">محجوز</span> ← سجّل حضور المريض عند وصوله ←{" "}
                  <span className="font-semibold">في الانتظار</span>.
                </p>
                <Separator className="bg-teal-100" />
                <p>
                  الطبيب يضغط <span className="font-semibold">بدء الكشفية</span> في مساحة عمله ←{" "}
                  <span className="font-semibold">داخل الكشفية</span> (تظهر هنا لحظيًا).
                </p>
                <Separator className="bg-teal-100" />
                <p>
                  الإنهاء من جهة الطبيب أو اضغط <span className="font-semibold">إكمال</span> هنا ←{" "}
                  <span className="font-semibold">تم الكشف</span>. بعدها حصّل الدفع واطبع الإيصال.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <QuickRegisterDialog open={quickOpen} onOpenChange={setQuickOpen} />
      <SlotBlockerDialog
        key={`blocker-${doctorFilter}`}
        open={blockerOpen}
        onOpenChange={setBlockerOpen}
        defaultDoctorId={doctorFilter !== "all" ? doctorFilter : null}
      />
      <PaymentDialog appointment={paymentFor} open={Boolean(paymentFor)} onOpenChange={(v) => !v && setPaymentFor(null)} />
    </div>
  );
}

/* دوال مساعدة على صفوف المواعيد المضمومة */
function doctorOptions(appointments: Appointment[]): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  appointments.forEach((a) => {
    if (a.doctor && !map.has(a.doctor.id)) {
      map.set(a.doctor.id, `${a.doctor.profile?.full_name ?? "طبيب"} — ${a.doctor.specialty}`);
    }
  });
  return Array.from(map, ([id, name]) => ({ id, name }));
}

function doctorIdToName(appointments: Appointment[], id: string): string {
  const found = appointments.find((a) => a.doctor_id === id);
  return found?.doctor?.profile?.full_name ?? "طبيب";
}
