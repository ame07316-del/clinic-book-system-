"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Banknote, Loader2, Pencil, Stethoscope, Trash2, UserRoundPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { useConfirmClick } from "@/components/admin/use-confirm-click";
import { useAppData, useAppointments, useDoctors } from "@/lib/data";
import type { Doctor } from "@/lib/types";
import { avatarHue, cn, formatCurrency, initials, todayStr } from "@/lib/utils";

const KNOWN_SPECIALTIES = [
  "القلب والأوعية الدموية",
  "طب الأطفال",
  "الأمراض الجلدية",
  "جراحة العظام",
  "المخ والأعصاب",
  "الباطنة العامة",
  "الأنف والجيوب الأنفية",
  "النساء والتوليد",
  "طب الأسنان",
  "الجراحة العامة",
];

export function DoctorsAdmin() {
  const { ds } = useAppData();
  const { data: doctors, loading } = useDoctors();
  const { data: todayAppointments } = useAppointments({ date: todayStr() });
  const { armedId, click } = useConfirmClick();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [fee, setFee] = useState("400");

  const openCreate = () => {
    setEditing(null);
    setFullName("");
    setPhone("");
    setSpecialty("");
    setFee("400");
    setDialogOpen(true);
  };

  const openEdit = (d: Doctor) => {
    setEditing(d);
    setFullName(d.profile?.full_name ?? "");
    setPhone(d.profile?.phone ?? "");
    setSpecialty(d.specialty);
    setFee(String(d.consultation_fee));
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!ds) return;
    if (!fullName.trim() || !specialty.trim()) {
      toast.error("الاسم والتخصص مطلوبان");
      return;
    }
    const feeNum = Number(fee);
    if (Number.isNaN(feeNum) || feeNum < 0) {
      toast.error("رسوم الكشف لازم تكون رقمًا صحيحًا");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await ds.updateDoctor(editing.id, {
          full_name: fullName,
          phone,
          specialty,
          consultation_fee: feeNum,
        });
        toast.success("تم تحديث بيانات الطبيب", { description: fullName });
      } else {
        await ds.createDoctorWithProfile({
          full_name: fullName,
          phone: phone || null,
          specialty,
          consultation_fee: feeNum,
        });
        toast.success("تمت إضافة الطبيب", {
          description: `${fullName} — ${specialty}`,
        });
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error("فشلت العملية", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = (d: Doctor) => {
    click(d.id, () => {
      void ds
        ?.deleteDoctor(d.id)
        .then(() =>
          toast.success("تم حذف الطبيب", {
            description: `${d.profile?.full_name} — ومعه كل مواعيده وسجلاته وحظر مواعيده`,
          }),
        )
        .catch((e) =>
          toast.error("فشل الحذف", {
            description: e instanceof Error ? e.message : "خطأ غير معروف",
          }),
        );
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">إدارة الأطباء</h2>
          <p className="text-sm text-muted-foreground">
            إضافة وتعديل وحذف الأطباء — الحذف يشمل مواعيدهم وسجلاتهم وحظرهم.
          </p>
        </div>
        <Button onClick={openCreate}>
          <UserRoundPlus /> إضافة طبيب
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (doctors ?? []).length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="لا يوجد أطباء"
          description="أضف أول طبيب أو حمّل البيانات التجريبية من تبويب «نظرة عامة»."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="py-3 ps-4">الطبيب</TableHead>
                <TableHead>التخصص</TableHead>
                <TableHead>رسوم الكشف</TableHead>
                <TableHead>مواعيد اليوم</TableHead>
                <TableHead className="text-end pr-4">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(doctors ?? []).map((d) => {
                const name = d.profile?.full_name ?? "طبيب";
                const todayCount = (todayAppointments ?? []).filter((a) => a.doctor_id === d.id).length;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="ps-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: avatarHue(name) }}
                        >
                          {initials(name)}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">{name}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">
                            {d.profile?.phone ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="teal">{d.specialty}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5 text-teal-500" />
                        {formatCurrency(d.consultation_fee)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                        {todayCount}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                          <Pencil /> تعديل
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            armedId === d.id
                              ? "bg-rose-600 text-white hover:bg-rose-600 hover:text-white"
                              : "text-slate-400 hover:text-destructive",
                          )}
                          onClick={() => remove(d)}
                        >
                          <Trash2 /> {armedId === d.id ? "تأكيد الحذف؟" : "حذف"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-600" />
              {editing ? "تعديل بيانات الطبيب" : "إضافة طبيب جديد"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "عدّل الهوية أو التخصص أو الرسوم — التغييرات تظهر في كل الشاشات فورًا."
                : "سيُنشأ ملف طبيب كامل مع بروفايل يظهر في البوابة والاستقبال والكشفية."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>اسم الطبيب *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: د. هالة يوسف"
              />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 1xx xxx xxxx"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>التخصص *</Label>
              <Input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="مثال: القلب والأوعية الدموية"
                list="specialties-list"
              />
              <datalist id="specialties-list">
                {KNOWN_SPECIALTIES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>رسوم الكشف (ج.م) *</Label>
              <Input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                inputMode="numeric"
                placeholder="400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {editing ? "حفظ التعديلات" : "إضافة الطبيب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
