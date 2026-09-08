"use client";

import { useCallback } from "react";
import {
  Armchair,
  CalendarPlus,
  ClipboardCheck,
  MonitorSmartphone,
  Radio,
  Stethoscope,
} from "lucide-react";
import { Hero } from "@/components/portal/hero";
import { DoctorExplorer } from "@/components/portal/doctor-explorer";
import { MyAppointments } from "@/components/portal/my-appointments";
import { SiteHeader } from "@/components/shared/site-header";
import { Logo } from "@/components/shared/logo";

const STEPS = [
  {
    icon: Stethoscope,
    title: "1 · اختر تخصصك",
    text: "تصفح ستة تخصصات مع أقرب المواعيد المتاحة محسوبة من الطابور الحقيقي.",
  },
  {
    icon: CalendarPlus,
    title: "2 · احجز معادًا",
    text: "المواعيد الممتلئة واستراحات الأطباء تتشطب تلقائيًا — اختر أي معيد متاح.",
  },
  {
    icon: Armchair,
    title: "3 · سجّل حضورك",
    text: "الاستقبال يسجل حضورك — حالتك تتحول إلى «في الانتظار» وشاشة الطبيب تتحدث فورًا.",
  },
  {
    icon: ClipboardCheck,
    title: "4 · ادخل واتعالج",
    text: "كشف + وصفة إلكترونية جاهزة للطباعة، وتابع كل شيء من الصفحة دي لحظة بلحظة.",
  },
];

export default function PatientPortalPage() {
  const scrollToFind = useCallback(() => {
    document.getElementById("find")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero onBrowse={scrollToFind} />

        {/* إزاي بتشتغل */}
        <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <span className="mb-3 inline-flex rounded-xl bg-teal-50 p-2.5 ring-1 ring-teal-100">
                  <s.icon className="h-5 w-5 text-teal-600" />
                </span>
                <p className="font-semibold text-slate-800">{s.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            مدعوم بـ Supabase Realtime على جدول{" "}
            <code className="rounded bg-slate-100 px-1 font-mono" dir="ltr">appointments</code> — افتح
            شاشة الاستقبال أو الطبيب في تاب آخر وشاهد المزامنة مباشرة.
          </p>
        </section>

        <DoctorExplorer />
        <MyAppointments />
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-xs text-muted-foreground">
            تطبيق تجريبي — بيانات عيادة محاكاة، ومدفوعات وإيصالات تجريبية.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MonitorSmartphone className="h-3.5 w-3.5" /> Next.js · Supabase · Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}
