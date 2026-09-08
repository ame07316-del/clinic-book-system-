import {
  Activity,
  BadgeCheck,
  Ban,
  BedDouble,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; variant: "teal" | "warning" | "info" | "success" | "destructive" | "slate"; icon: typeof Activity; dot: string }
> = {
  scheduled: { label: "محجوز", variant: "info", icon: CalendarClock, dot: "bg-sky-500" },
  waiting: { label: "في الانتظار", variant: "warning", icon: BedDouble, dot: "bg-amber-500" },
  in_consultation: { label: "داخل الكشفية", variant: "teal", icon: Activity, dot: "bg-teal-500" },
  completed: { label: "تم الكشف", variant: "success", icon: CheckCircle2, dot: "bg-emerald-500" },
  cancelled: { label: "ملغي", variant: "destructive", icon: Ban, dot: "bg-rose-500" },
};

export function StatusBadge({
  status,
  className,
  animated = false,
}: {
  status: AppointmentStatus;
  className?: string;
  /** نبض خفيف للحالات الحية */
  animated?: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className={cn("font-medium", className)}>
      <span className="relative flex h-1.5 w-1.5">
        {animated && (status === "waiting" || status === "in_consultation") && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", meta.dot)} />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", meta.dot)} />
      </span>
      <Icon className="hidden" />
      {meta.label}
    </Badge>
  );
}

export function PaymentBadge({ paid, className }: { paid: boolean; className?: string }) {
  return paid ? (
    <Badge variant="success" className={cn("font-medium", className)}>
      <BadgeCheck /> مدفوع
    </Badge>
  ) : (
    <Badge variant="warning" className={cn("font-medium", className)}>
      <CalendarClock /> معلق
    </Badge>
  );
}

export { STATUS_META };
