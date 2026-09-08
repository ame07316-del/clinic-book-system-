"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  Loader2,
  Pencil,
  Search,
  Trash2,
  CalendarCog,
} from "lucide-react";
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
import { StatusBadge, STATUS_META, PaymentBadge } from "@/components/shared/status-badge";
import { useConfirmClick } from "@/components/admin/use-confirm-click";
import { useAppData, useAppointments, useDoctors, usePatients } from "@/lib/data";
import type { Appointment, AppointmentFullPatch, AppointmentStatus } from "@/lib/types";
import {
  addDays,
  avatarHue,
  cn,
  formatCurrency,
  formatDateShort,
  formatTimeSlot,
  generateSlotsSafe,
  initials,
  todayStr,
} from "@/lib/admin-helpers";

const STATUSES: AppointmentStatus[] = [
  "scheduled",
  "waiting",
  "in_consultation",
  "completed",
  "cancelled",
];

interface FormState {
  patientId: string;
  doctorId: string;
  date: string;
  slot: string;
  status: AppointmentStatus;
  paymentStatus: "pending" | "paid";
  reason: string;
}

const EMPTY_FORM: FormState = {
  patientId: "",
  doctorId: "",
  date: todayStr(),
  slot: "",
  status: "scheduled",
  paymentStatus: "pending",
  reason: "",
};

export function AppointmentsAdmin() {
  const { ds } = useAppData();
  const { data: appointments, loading } = useAppointments();
  const { data: doctors } = useDoctors();
  const { data: patients } = usePatients();
  const { armedId, click } = useConfirmClick();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const slots = useMemo(() => generateSlotsSafe(), []);
  const dateOptions = useMemo(
    () => Array.from({ length: 30 }, (_, i) => addDays(todayStr(), -7 + i)),
    [],
  );

  const filtered = (appointments ?? [])
    .filter((a) => statusFilter === "all" || a.status === statusFilter)
    .filter((a) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        (a.patient?.full_name ?? "").includes(q) ||
        (a.doctor?.profile?.full_name ?? "").includes(q) ||
        a.appointment_date.includes(q)
      );
    })
    .sort(
      (a, b) =>
        b.appointment_date.localeCompare(a.appointment_date) ||
        b.time_slot.localeCompare(a.time_slot),
    );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (a: Appointment) => {
    setEditing(a);
    setForm({
      patientId: a.patient_id,
      doctorId: a.doctor_id,
      date: a.appointment_date,
      slot: a.time_slot,
      status: a.status,
      paymentStatus: a.payment_status,
      reason: a.reason ?? "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!ds) return;
    if (!form.patientId || !form.doctorId || !form.date || !form.slot) {
      toast.error("أكمل: المريض والطبيب والتاريخ والمعاد");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        const patch: AppointmentFullPatch = {
          patient_id: form.patientId,
          doctor_id: form.doctorId,
          appointment_date: form.date,
          time_slot: form.slot,
          status: form.status,
          reason: form.reason || null,
          payment_status: form.paymentStatus,
          payment_method: form.paymentStatus === "paid" ? "cash" : null,
        };
        await ds.updateAppointment(editing.id, patch);
        toast.success("تم تعديل الموعد بالكامل", {
          description: `${formatDateShort(form.date)} · ${formatTimeSlot(form.slot)}`,
        });
      } else {
        await ds.createAppointment({
          patient_id: form.patientId,
          doctor_id: form.doctorId,
          appointment_date: form.date,
          time_slot: form.slot,
          status: form.status,
          reason: form.reason || null,
          payment_status: form.paymentStatus,
        });
        toast.success("تم إنشاء الموعد", {
          description: `${formatDateShort(form.date)} · ${formatTimeSlot(form.slot)}`,
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

  const remove = (a: Appointment) => {
    click(a.id, () => {
      void ds
        ?.deleteAppointment(a.id)
        .then(() =>
          toast.success("تم حذف الموعد", {
            description: `${a.patient?.full_name} · ${formatDateShort(a.appointment_date)}`,
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
          <h2 className="text-lg font-bold text-slate-900">إدارة المواعيد</h2>
          <p className="text-sm text-muted-foreground">
            تعديل أي موعد بالكامل (المريض/الطبيب/الوقت/الحالة/الدفع) أو إنشاء أو حذف.
          </p>
        </div>
        <Button onClick={openCreate}>
          <CalendarPlus /> موعد جديد
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مريض أو طبيب أو تاريخ…"
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {loading ? "جارٍ المزامنة…" : `${filtered.length} موعد`}
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCog}
          title="لا توجد مواعيد مطابقة"
          description="أنشئ موعدًا جديدًا أو غيّر الفلتر."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="py-3 ps-4">المريض</TableHead>
                <TableHead>الطبيب</TableHead>
                <TableHead>الموعد</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الدفع</TableHead>
                <TableHead className="text-end pr-4">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="ps-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: avatarHue(a.patient?.full_name ?? "؟") }}
                      >
                        {initials(a.patient?.full_name ?? "؟")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {a.patient?.full_name}
                        </p>
                        {a.reason && (
                          <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                            {a.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-700">{a.doctor?.profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{a.doctor?.specialty}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatDateShort(a.appointment_date)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTimeSlot(a.time_slot)}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} animated />
                  </TableCell>
                  <TableCell>
                    <PaymentBadge paid={a.payment_status === "paid"} />
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatCurrency(a.doctor?.consultation_fee ?? 0)}
                    </p>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                        <Pencil /> تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          armedId === a.id
                            ? "bg-rose-600 text-white hover:bg-rose-600 hover:text-white"
                            : "text-slate-400 hover:text-destructive",
                        )}
                        onClick={() => remove(a)}
                      >
                        <Trash2 /> {armedId === a.id ? "تأكيد؟" : "حذف"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCog className="h-5 w-5 text-teal-600" />
              {editing ? "تعديل الموعد بالكامل" : "إنشاء موعد جديد"}
            </DialogTitle>
            <DialogDescription>
              صلاحيات كاملة: غيّر المريض والطبيب والمعاد والحالة والدفع — كل الشاشات تتحدث لحظيًا.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>المريض *</Label>
              <Select
                value={form.patientId}
                onValueChange={(v) => setForm((f) => ({ ...f, patientId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المريض" />
                </SelectTrigger>
                <SelectContent>
                  {(patients ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} {p.phone ? `(${p.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>الطبيب *</Label>
              <Select
                value={form.doctorId}
                onValueChange={(v) => setForm((f) => ({ ...f, doctorId: v }))}
              >
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
              <Label>التاريخ *</Label>
              <Select
                value={form.date}
                onValueChange={(v) => setForm((f) => ({ ...f, date: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {dateOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d === todayStr() ? "اليوم — " : ""}
                      {formatDateShort(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>المعاد *</Label>
              <Select
                value={form.slot}
                onValueChange={(v) => setForm((f) => ({ ...f, slot: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المعاد" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {slots.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatTimeSlot(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as AppointmentStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الدفع</Label>
              <Select
                value={form.paymentStatus}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, paymentStatus: v as "pending" | "paid" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>سبب الزيارة</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="مثال: متابعة ضغط"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {editing ? "حفظ التعديلات" : "إنشاء الموعد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
