"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, UserPlus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateStrip, SlotGrid } from "@/components/shared/slot-grid";
import { useAppData, useDoctors } from "@/lib/data";
import type { Appointment } from "@/lib/types";
import { cn, todayStr, addDays, minutesToTime, formatTimeSlot } from "@/lib/utils";

/** أقرب معاد ربع ساعة من الآن، محدود بمواعيد العيادة (وقت الدخول الفوري). */
function walkInSlotNow(): string {
  const now = new Date();
  const mins = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
  return minutesToTime(Math.min(mins, 16 * 60 + 45));
}

export function QuickRegisterDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRegistered?: (appt: Appointment) => void;
}) {
  const { ds } = useAppData();
  const { data: doctors } = useDoctors();

  const [mode, setMode] = useState<"walkin" | "book">("walkin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dateOptions = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(todayStr(), i)), []);

  const walkInSlot = walkInSlotNow();

  const reset = () => {
    setFullName("");
    setPhone("");
    setReason("");
    setDoctorId(null);
    setSlot(null);
    setDate(todayStr());
    setMode("walkin");
  };

  const submit = async () => {
    if (!ds || !doctorId) {
      toast.error("من فضلك اختر الطبيب");
      return;
    }
    if (!fullName.trim()) {
      toast.error("اسم المريض مطلوب");
      return;
    }
    setBusy(true);
    try {
      const patient = await ds.createPatient({
        full_name: fullName,
        phone: phone || null,
      });
      const isWalkIn = mode === "walkin";
      const appt = await ds.createAppointment({
        patient_id: patient.id,
        doctor_id: doctorId,
        appointment_date: isWalkIn ? todayStr() : date,
        time_slot: isWalkIn ? walkInSlot : (slot ?? ""),
        status: isWalkIn ? "waiting" : "scheduled",
        reason: reason || null,
      });
      toast.success(isWalkIn ? "تم تسجيل الحالة الفورية" : "تم حجز الموعد", {
        description: isWalkIn
          ? `${patient.full_name} — أُضيف لغرفة الانتظار الآن`
          : `${patient.full_name} — محجوز الساعة ${formatTimeSlot(slot ?? "")}`,
      });
      onRegistered?.(appt);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("فشل التسجيل", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-600" /> تسجيل سريع وحجز
          </DialogTitle>
          <DialogDescription>
            سجّل مريضًا فوريًا وأدخله غرفة الانتظار مباشرة، أو احجز له معادًا في نفس اللحظة.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "walkin" | "book")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="walkin">
              <Zap /> دخول فوري (انتظار الآن)
            </TabsTrigger>
            <TabsTrigger value="book">
              <CalendarPlus /> حجز معاد
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="qr-name">اسم المريض بالكامل *</Label>
            <Input
              id="qr-name"
              placeholder="مثال: أوليفيا بنيонтакте"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-phone">رقم الهاتف</Label>
            <Input
              id="qr-phone"
              placeholder="+20 1xx xxx xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>الطبيب *</Label>
            <Select value={doctorId ?? ""} onValueChange={(v) => setDoctorId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الطبيب" />
              </SelectTrigger>
              <SelectContent>
                {(doctors ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.profile?.full_name} — {d.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-reason">سبب الزيارة</Label>
            <Input
              id="qr-reason"
              placeholder="مثال: التهاب حلق، إعادة فحص…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        {mode === "walkin" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <span className="font-semibold">وضع الدخول الفوري:</span> سيتم إنشاء المريض وإضافته
            مباشرة إلى غرفة <span className="font-semibold">الانتظار</span> الساعة{" "}
            {formatTimeSlot(walkInSlot)} (اليوم)، وشاشة الطبيب تتحدث فورًا.
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border p-3">
            <DateStrip dates={dateOptions} selected={date} onSelect={(d) => { setDate(d); setSlot(null); }} />
            {doctorId ? (
              <SlotGrid
                doctorId={doctorId}
                date={date}
                selected={slot}
                onSelect={setSlot}
                includePast={date === todayStr()}
              />
            ) : (
              <p className={cn("text-sm text-muted-foreground")}>اختر الطبيب لعرض المعادات المتاحة لحظيًا.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || (mode === "book" && (!slot || !doctorId)) || (mode === "walkin" && !doctorId)}
          >
            {busy ? "جارٍ التسجيل…" : mode === "walkin" ? "تسجيل الحالة الفورية" : "حجز الموعد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
