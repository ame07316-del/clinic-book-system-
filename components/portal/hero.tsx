"use client";

import { ShieldCheck, Sparkles, Timer, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero({ onBrowse }: { onBrowse: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-teal-100/60 bg-gradient-to-b from-teal-50/80 via-cyan-50/40 to-transparent">
      <div className="absolute inset-0 bg-grid-teal [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="teal" className="mb-5 px-3 py-1 text-xs shadow-soft">
            <Sparkles /> Realtime clinic operations demo
          </Badge>
          <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
            Book a doctor.{" "}
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Skip the queue.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            MediCore is a full medical-center operations demo — find a specialist, grab a live
            slot, then watch your status update in realtime from the waiting room to
            consultation.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={onBrowse} className="px-7">
              Find a specialist
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/reception">Peek at reception</a>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-teal-500" /> 30-minute slots
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-500" /> Verified specialists
            </span>
            <span className="flex items-center gap-2">
              <Video className="h-4 w-4 text-teal-500" /> In-clinic &amp; follow-up visits
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
