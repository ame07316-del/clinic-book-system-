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
    title: "1 · Find a specialist",
    text: "Browse six specialties with live next-available slots computed from the real queue.",
  },
  {
    icon: CalendarPlus,
    title: "2 · Grab a live slot",
    text: "Fully booked times and doctor breaks are greyed out automatically — pick anything teal.",
  },
  {
    icon: Armchair,
    title: "3 · Check in at reception",
    text: "Front desk checks you in — your status flips to Waiting and the doctor's feed updates instantly.",
  },
  {
    icon: ClipboardCheck,
    title: "4 · Get seen & get well",
    text: "Consult, receive a digital prescription, and track everything from this page in realtime.",
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

        {/* how it works */}
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
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            Powered by Supabase Realtime on the <code className="rounded bg-slate-100 px-1 font-mono">appointments</code> table
            — open the Reception or Doctor dashboard in another tab and watch changes sync live.
          </p>
        </section>

        <DoctorExplorer />
        <MyAppointments />
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-xs text-muted-foreground">
            Demo application — simulated clinic data, payments and receipts.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MonitorSmartphone className="h-3.5 w-3.5" /> Next.js · Supabase · Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}
