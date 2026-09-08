"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BedDouble,
  CalendarCog,
  CheckCircle2,
  Database,
  FileText,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { SiteHeader } from "@/components/shared/site-header";
import { SettingsDialog, useDemoActions } from "@/components/shared/settings-dialog";
import { DoctorsAdmin } from "@/components/admin/doctors-admin";
import { PatientsAdmin } from "@/components/admin/patients-admin";
import { AppointmentsAdmin } from "@/components/admin/appointments-admin";
import { RecordsAdmin } from "@/components/admin/records-admin";
import { BlocksAdmin } from "@/components/admin/blocks-admin";
import { BrandingAdmin } from "@/components/admin/branding-admin";
import { useAppData, useAppointments, useDoctors, useMedicalRecords, usePatients, useScheduleBlocks } from "@/lib/data";
import { formatCurrency, todayStr } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "نظرة عامة", icon: Activity },
  { id: "doctors", label: "الأطباء", icon: Stethoscope },
  { id: "patients", label: "المرضى", icon: Users },
  { id: "appointments", label: "المواعيد", icon: CalendarCog },
  { id: "records", label: "السجلات الطبية", icon: FileText },
  { id: "blocks", label: "حظر المواعيد", icon: BedDouble },
  { id: "branding", label: "هوية العيادة", icon: ShieldCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminDashboard() {
  const { mode, message } = useAppData();
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {/* ترويسة الأدمن */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-gradient-to-l from-teal-50/80 to-cyan-50/40 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lift">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  لوحة تحكم المطوّر
                </h1>
                <Badge className="bg-slate-900 text-white hover:bg-slate-900">
                  صلاحيات كاملة
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                تحكم غير محدود: الأطباء، المرضى، المواعيد، السجلات، الحظر، وهوية العيادة —
                كل شيء يتزامن لحظيًا مع كل الشاشات.
              </p>
            </div>
          </div>
          <LiveIndicator mode={mode} />
        </div>

        {/* تبويبات */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "flex shrink-0 items-center gap-1.5 rounded-xl border border-teal-600 bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lift"
                  : "flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-card px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal-300 hover:text-teal-700"
              }
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab mode={mode} message={message} />}
        {tab === "doctors" && <DoctorsAdmin />}
        {tab === "patients" && <PatientsAdmin />}
        {tab === "appointments" && <AppointmentsAdmin />}
        {tab === "records" && <RecordsAdmin />}
        {tab === "blocks" && <BlocksAdmin />}
        {tab === "branding" && <BrandingAdmin />}
      </main>
    </div>
  );
}

function OverviewTab({
  mode,
  message,
}: {
  mode: "supabase" | "demo" | "connecting";
  message: string | null;
}) {
  const { seed, reset, seeding, resetting } = useDemoActions();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: doctors, loading: l1 } = useDoctors();
  const { data: patients, loading: l2 } = usePatients();
  const { data: appointments, loading: l3 } = useAppointments({ date: todayStr() });
  const { data: allAppointments, loading: l4 } = useAppointments();
  const { data: records, loading: l5 } = useMedicalRecords();
  const { data: blocks, loading: l6 } = useScheduleBlocks();

  const stats = useMemo(() => {
    const rows = allAppointments ?? [];
    return {
      waiting: rows.filter((a) => a.status === "waiting").length,
      inConsultation: rows.filter((a) => a.status === "in_consultation").length,
      completed: rows.filter((a) => a.status === "completed").length,
      cancelled: rows.filter((a) => a.status === "cancelled").length,
      scheduled: rows.filter((a) => a.status === "scheduled").length,
      paid: rows
        .filter((a) => a.payment_status === "paid")
        .reduce((s, a) => s + (a.doctor?.consultation_fee ?? 0), 0),
    };
  }, [allAppointments]);

  const loadingAny = l1 || l2 || l3 || l4 || l5 || l6;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "—";
  const keyPreview = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 14)}••••••••`
    : "—";

  return (
    <div className="space-y-5">
      {/* كروت الإحصائيات */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="الأطباء" value={doctors?.length ?? 0} icon={Stethoscope} loading={l1} />
        <StatCard
          label="المرضى"
          value={patients?.length ?? 0}
          icon={Users}
          tint="bg-sky-50 text-sky-600 ring-sky-100"
          loading={l2}
        />
        <StatCard
          label="مواعيد اليوم"
          value={appointments?.length ?? 0}
          icon={CalendarCog}
          tint="bg-violet-50 text-violet-600 ring-violet-100"
          loading={l3}
        />
        <StatCard
          label="السجلات"
          value={records?.length ?? 0}
          icon={FileText}
          tint="bg-emerald-50 text-emerald-600 ring-emerald-100"
          loading={l5}
        />
        <StatCard
          label="الحظر"
          value={blocks?.length ?? 0}
          icon={BedDouble}
          tint="bg-amber-50 text-amber-600 ring-amber-100"
          loading={l6}
        />
        <StatCard
          label="إجمالي التحصيل"
          value={formatCurrency(stats.paid)}
          icon={CheckCircle2}
          tint="bg-cyan-50 text-cyan-600 ring-cyan-100"
          loading={l4}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* توزيع الحالات */}
        <Card className="animate-rise">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base">توزيع حالات المواعيد (كل التواريخ)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {loadingAny ? (
              <Skeleton className="h-36 rounded-lg" />
            ) : (
              (
                [
                  ["محجوز", stats.scheduled, "bg-sky-500"],
                  ["في الانتظار", stats.waiting, "bg-amber-500"],
                  ["داخل الكشفية", stats.inConsultation, "bg-teal-500"],
                  ["تم الكشف", stats.completed, "bg-emerald-500"],
                  ["ملغي", stats.cancelled, "bg-rose-500"],
                ] as const
              ).map(([label, count, color]) => {
                const total = stats.scheduled + stats.waiting + stats.inConsultation + stats.completed + stats.cancelled || 1;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{label}</span>
                      <span className="font-bold text-slate-800">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${color} transition-all`}
                        style={{ width: `${Math.round((count / total) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* النظام والصيانة */}
        <Card className="animate-rise">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-teal-600" /> النظام والصيانة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border bg-slate-50/70 px-3 py-2.5">
              <span className="flex items-center gap-2 font-semibold">
                {mode === "supabase" ? (
                  <>
                    <Server className="h-4 w-4 text-emerald-600" /> Supabase متصل
                  </>
                ) : mode === "demo" ? (
                  <>
                    <TriangleAlert className="h-4 w-4 text-amber-600" /> قاعدة تجريبية محلية
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-400" /> جارٍ الاتصال…
                  </>
                )}
              </span>
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                التفاصيل
              </Button>
            </div>
            {message && (
              <p className="text-xs leading-relaxed text-muted-foreground">{message}</p>
            )}
            <div className="space-y-1.5 text-xs" dir="ltr">
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <span className="text-muted-foreground">SUPABASE_URL</span>
                <code className="max-w-[60%] truncate rounded bg-slate-100 px-2">
                  {supabaseUrl}
                </code>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
                <span className="text-muted-foreground">ANON_KEY</span>
                <code className="rounded bg-slate-100 px-2">{keyPreview}</code>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => void seed()} disabled={seeding || mode === "connecting"}>
                <Sparkles className={seeding ? "animate-pulse" : ""} />
                {seeding ? "جارٍ التحميل…" : "تحميل البيانات التجريبية"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-rose-50 hover:text-destructive"
                onClick={() => void reset()}
                disabled={resetting || mode === "connecting"}
              >
                <Trash2 /> {resetting ? "جارٍ المسح…" : "مسح كل البيانات"}
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              «مسح كل البيانات» يمسح الأطباء والمرضى والمواعيد والسجلات والحظر — مع الاحتفاظ
              بهوية العيادة. البيانات التجريبية تعيد بناء طابور اليوم كاملًا.
            </p>
          </CardContent>
        </Card>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
