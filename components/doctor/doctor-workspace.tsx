"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { SiteHeader } from "@/components/shared/site-header";
import { WaitingFeed } from "@/components/doctor/waiting-feed";
import { ConsultationPanel } from "@/components/doctor/consultation-panel";
import { useAppData, useAppointments, useDoctors } from "@/lib/data";
import { avatarHue, formatCurrency, initials, todayStr } from "@/lib/utils";

export function DoctorWorkspace({ doctorId }: { doctorId: string }) {
  const { mode } = useAppData();
  const { data: doctors, loading: doctorsLoading } = useDoctors();
  const today = todayStr();
  const { data: appointments, loading } = useAppointments({ date: today, doctorId });
  const [explicitId, setExplicitId] = useState<string | null>(null);

  const doctor = doctors?.find((d) => d.id === doctorId) ?? null;

  // الاختيار مشتق من البيانات الحية (من غير أي useEffect):
  // - اختيار الطبيب الصريح له الأولوية ما دام موجودًا،
  // - وإلا نختار تلقائيًا مريض الكشفية الحالي ثم أول مريض انتظار.
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
            title="الطبيب غير موجود"
            description="ملف الطبيب ده غير موجود في قاعدة البيانات الحالية. حمّل البيانات التجريبية من قائمة الهيدر ثم اختر طبيبًا من القائمة."
            action={
              <Button asChild>
                <Link href="/doctor">
                  <ArrowRight /> رجوع لقائمة الأطباء
                </Link>
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  const name = doctor.profile?.full_name ?? "طبيب";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {/* شريط هوية الطبيب */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="رجوع للأطباء">
              <Link href="/doctor">
                <ArrowRight />
              </Link>
            </Button>
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lift"
              style={{ background: avatarHue(name) }}
            >
              {initials(name)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{name}</h1>
                <LiveIndicator mode={mode} />
              </div>
              <p className="text-sm text-muted-foreground">
                {doctor.specialty} · رسوم الكشف {formatCurrency(doctor.consultation_fee)} ·{" "}
                <span className="font-medium text-teal-700">عيادة اليوم</span>
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
              /* نُبقي اللوحة مفتوحة ليطبع الطبيب الوصفة المحفوظة */
            }}
          />
        </div>
      </main>
    </div>
  );
}
