"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, CreditCard, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentBadge } from "@/components/shared/status-badge";
import { useAppData } from "@/lib/data";
import { useBranding } from "@/lib/branding";
import { printReceipt } from "@/lib/print";
import type { Appointment, PaymentMethod } from "@/lib/types";
import { formatCurrency, formatTimeSlot } from "@/lib/utils";

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "نقدي" },
  { value: "card", label: "بطاقة" },
  { value: "insurance", label: "تأمين" },
  { value: "upi", label: "محفظة إلكترونية" },
];

export function PaymentDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { ds } = useAppData();
  const { branding } = useBranding();
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [busy, setBusy] = useState(false);

  if (!appointment) return null;
  const fee = appointment.doctor?.consultation_fee ?? 0;
  const paid = appointment.payment_status === "paid";

  const markPaid = async () => {
    if (!ds) return;
    setBusy(true);
    try {
      await ds.updateAppointment(appointment.id, {
        payment_status: "paid",
        payment_method: method,
      });
      toast.success("تم تحصيل الدفع", {
        description: `${formatCurrency(fee)} — ${METHODS.find((m) => m.value === method)?.label} — ${appointment.patient?.full_name}.`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("فشل عملية الدفع", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    } finally {
      setBusy(false);
    }
  };

  const markPending = async () => {
    if (!ds) return;
    setBusy(true);
    try {
      await ds.updateAppointment(appointment.id, { payment_status: "pending" });
      toast.info("أُرجعت الحالة إلى «معلق»");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-600" /> تحصيل الدفع
          </DialogTitle>
          <DialogDescription>
            بدّل حالة كشفية الدفع وأنشئ إيصالًا تجريبيًا للطباعة.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">{appointment.patient?.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {appointment.doctor?.profile?.full_name} ·{" "}
                {appointment.doctor?.specialty} · {formatTimeSlot(appointment.time_slot)}
              </p>
            </div>
            <PaymentBadge paid={paid} />
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-dashed pt-3">
            <span className="text-xs font-semibold text-slate-400">رسوم الكشف</span>
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(fee)}</span>
          </div>
        </div>

        {!paid && (
          <div className="space-y-2">
            <Label>طريقة الدفع</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الطريقة" />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter className="gap-2">
          {paid ? (
            <>
              <Button variant="outline" onClick={() => printReceipt(appointment, branding)}>
                <Printer /> إعادة طباعة الإيصال
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void markPending()}>
                <RotateCcw /> إرجاع للمعلق
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => printReceipt(appointment)} disabled>
                <Printer /> الإيصال
              </Button>
              <Button onClick={() => void markPaid()} disabled={busy}>
                <BadgeCheck />
                {busy ? "جارٍ المعالجة…" : `تأكيد الدفع · ${formatCurrency(fee)}`}
              </Button>
            </>
          )}
        </DialogFooter>
        <p className="text-center text-[11px] text-muted-foreground">
          يمكن طباعة الإيصالات / حفظها PDF بعد تأكيد الدفع.
        </p>
      </DialogContent>
    </Dialog>
  );
}
