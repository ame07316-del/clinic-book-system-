import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint = "bg-teal-50 text-teal-600 ring-teal-100",
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: LucideIcon;
  tint?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          )}
          {sub && !loading && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("rounded-xl p-2.5 ring-1 transition-transform group-hover:scale-105", tint)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-teal-100/50 to-cyan-100/20 blur-2xl" />
    </div>
  );
}
