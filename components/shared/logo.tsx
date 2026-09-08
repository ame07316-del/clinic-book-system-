import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lift">
        <Stethoscope className="h-5 w-5" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight text-slate-900">
            ميدي<span className="text-teal-600">كور</span>
          </div>
          <div className="text-[10px] font-medium text-slate-400">مركز طبي متكامل</div>
        </div>
      )}
    </div>
  );
}
