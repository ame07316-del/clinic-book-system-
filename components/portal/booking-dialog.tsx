"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarPlus,
  CircleCheckBig,
  Info,
  Loader2,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DateStrip, SlotGrid } from "@/components/shared/slot-grid";
import { specialtyMeta } from "@/lib/specialties";
import { useAppData } from "@/lib/data";
import type { Appointment, Doctor } from "@/lib/types";
import {
  addDays,
  avatarHue,
  formatCurrency,
  formatDateLong,
  formatTimeSlot,
  initials,
  todayStr,
} from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  BookingDialog — منتقي التاريخ والوقت التفاعلي للمريض.              */
/* ------------------------------------------------------------------ */

export function BookingDialog({
  doctor,
  onClose,
}: {
  doctor: Doctor | null;
  onClose: () => void;
}) {
  const { ds } = useAppData();
  const dateOptions = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(todayStr(), i)), []);

  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  const meta = doctor ? specialtyMeta(doctor.specialty) : null;
  const Icon = meta?.icon ?? Stethoscope;

  const reset = () => {
    setDate(todayStr());
    setSlot(null);
    setFullName("");
    setPhone("");
    setReason("");
    setBusy(false);
    setConfirmed(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const confirm = async () => {
    if (!ds || !doctor) return;
    if (!fullName.trim()) {
      toast.error("من فضلك اكتب اسمك بالكامل");
      return;
    }
    if (!phone.trim()) {
      toast.error("من فضلك اكتب رقم الهاتف", {
        description: "هتستخدمه لمتابعة موعدك في الأسفل.",
      });
      return;
    }
    if (!slot) {
      toast.error("اختر معادًا أولًا");
      return;
    }
    setBusy(true);
    try {
      const patient = await ds.createPatient({ full_name: fullName, phone });
      const appt = await ds.createAppointment({
        patient_id: patient.id,
        doctor_id: doctor.id,
        appointment_date: date,
        time_slot: slot,
        status: "scheduled",
        reason: reason || null,
      });
      setConfirmed(appt);
      toast.success("تم تأكيد الموعد", {
        description: `${formatDateLong(date)} الساعة ${formatTimeSlot(slot)} مع ${doctor.profile?.full_name}.`,
      });
    } catch (e) {
      toast.error("فشل الحجز", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(doctor)} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        {doctor && confirmed ? (
          /* ---------- حالة التأكيد ---------- */
          <div className="py-2 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
              <CircleCheckBig className="h-8 w-8 text-emerald-500" />
            </div>
            <DialogHeader className="items-center">
              <DialogTitle className="text-2xl">تم الحجز!</DialogTitle>
            </DialogHeader>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              تابع حالتك في لوحة <span className="font-medium text-slate-700">«مواعيدي»</span>{" "}
              بالأسفل برقم هاتفك — تتحدث لحظيًا أثناء تحركك في طابور العيادة.
            </p>
            <div className="mx-auto mt-5 max-w-sm space-y-2.5 rounded-xl border bg-slate-50/70 p-4 text-right text-sm">
              <Row label="المريض" value={confirmed.patient?.full_name ?? fullName} />
              <Row
                label="الطبيب"
                value={`${doctor.profile?.full_name} · ${doctor.specialty}`}
              />
              <Row label="الموعد" value={`${formatDateLong(confirmed.appointment_date)} · ${formatTimeSlot(confirmed.time_slot)}`} />
              <Row label="الحالة" value="محجوز — احضر قبل المعاد بـ 10 دقائق" />
              <Row label="الرسوم (بالعيادة)" value={formatCurrency(doctor.consultation_fee)} />
            </div>
            <Button className="mt-5" onClick={() => handleClose(false)}>
              <BadgeCheck /> تم
            </Button>
          </div>
        ) : doctor ? (
          /* ---------- نموذج الحجز ---------- */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white shadow-lift"
                  style={{ background: avatarHue(doctor.profile?.full_name ?? "؟") }}
                >
                  {initials(doctor.profile?.full_name ?? "؟")}
                </span>
                <span>
                  <span className="block text-base leading-relaxed">{doctor.profile?.full_name}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" /> {doctor.specialty} ·{" "}
                    {formatCurrency(doctor.consultation_fee)}
                  </span>
                </span>
              </DialogTitle>
            </DialogHeader>

            <DateStrip
              dates={dateOptions}
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setSlot(null);
              }}
            />

            <SlotGrid doctorId={doctor.id} date={date} selected={slot} onSelect={setSlot} />

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bk-name">الاسم بالكامل *</Label>
                <Input
                  id="bk-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: هدى إبراهيم"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-phone">رقم الهاتف *</Label>
                <Input
                  id="bk-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 1xx xxx xxxx"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bk-reason">سبب الزيارة (اختياري)</Label>
                <Input
                  id="bk-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: صداع مستمر من أسبوع"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" /> الإلغاء مجاني حتى ساعة قبل الموعد.
              </p>
              <Button onClick={() => void confirm()} disabled={busy || !slot}>
                {busy ? <Loader2 className="animate-spin" /> : <CalendarPlus />}
                {busy ? "جارٍ الحجز…" : slot ? `تأكيد ${formatTimeSlot(slot)}` : "اختر معادًا أولًا"}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs font-semibold text-slate-400">{label}</span>
      <span className="text-left font-medium text-slate-700">{value}</span>
    </div>
  );
}
