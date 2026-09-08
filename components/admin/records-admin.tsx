"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Pencil, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { PrescriptionBuilder } from "@/components/doctor/prescription-builder";
import { useAppData, useAppointments, useMedicalRecords } from "@/lib/data";
import type { MedicalRecord, PrescriptionItem } from "@/lib/types";
import { avatarHue, cn, formatDateShort, formatTimeSlot, initials } from "@/lib/utils";

export function RecordsAdmin() {
  const { ds } = useAppData();
  const { data: records, loading } = useMedicalRecords();
  const { data: appointments } = useAppointments();
  const { armedId, click } = useConfirmClick();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalRecord | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () =>
      (records ?? [])
        .map((r) => ({
          record: r,
          appt: (appointments ?? []).find((a) => a.id === r.appointment_id) ?? null,
        }))
        .sort((a, b) => {
          const da = a.appt?.appointment_date ?? "";
          const db = b.appt?.appointment_date ?? "";
          return db.localeCompare(da);
        }),
    [records, appointments],
  );

  const openEdit = (r: MedicalRecord) => {
    setEditing(r);
    setDiagnosis(r.diagnosis ?? "");
    setItems(r.prescription ?? []);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!ds || !editing) return;
    setBusy(true);
    try {
      await ds.upsertMedicalRecord({
        appointment_id: editing.appointment_id,
        diagnosis: diagnosis.trim(),
        prescription: items.filter((i) => i.medicine.trim()),
      });
      toast.success("تم حفظ السجل الطبي", {
        description: `${items.filter((i) => i.medicine.trim()).length} دواء في الوصفة`,
      });
      setDialogOpen(false);
    } catch (e) {
      toast.error("فشل الحفظ", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = (r: MedicalRecord) => {
    click(r.id, () => {
      void ds
        ?.deleteMedicalRecord(r.id)
        .then(() => toast.success("تم حذف السجل الطبي"))
        .catch((e) =>
          toast.error("فشل الحذف", {
            description: e instanceof Error ? e.message : "خطأ غير معروف",
          }),
        );
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">السجلات الطبية</h2>
        <p className="text-sm text-muted-foreground">
          تعديل التشخيص والوصفات (JSONB) أو حذف أي سجل نهائيًا.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="لا توجد سجلات طبية"
          description="تُنشأ السجلات تلقائيًا عند حفظ وصفة من غرفة الكشفية."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="py-3 ps-4">المريض / الموعد</TableHead>
                <TableHead>التشخيص</TableHead>
                <TableHead>الوصفة</TableHead>
                <TableHead className="text-end pr-4">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ record, appt }) => (
                <TableRow key={record.id}>
                  <TableCell className="ps-4">
                    {appt ? (
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: avatarHue(appt.patient?.full_name ?? "؟") }}
                        >
                          {initials(appt.patient?.full_name ?? "؟")}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {appt.patient?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateShort(appt.appointment_date)} ·{" "}
                            {formatTimeSlot(appt.time_slot)} · {appt.doctor?.profile?.full_name}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        موعد محذوف — #{record.appointment_id.slice(0, 8)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[280px] truncate text-sm text-slate-700">
                      {record.diagnosis || "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                      {record.prescription.length} دواء
                    </span>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>
                        <Pencil /> تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          armedId === record.id
                            ? "bg-rose-600 text-white hover:bg-rose-600 hover:text-white"
                            : "text-slate-400 hover:text-destructive",
                        )}
                        onClick={() => remove(record)}
                      >
                        <Trash2 /> {armedId === record.id ? "تأكيد؟" : "حذف"}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" /> تعديل السجل الطبي
            </DialogTitle>
            <DialogDescription>
              غيّر التشخيص أو الوصفة — العدّاد يُحدَّث في كل الشاشات.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>التشخيص والملاحظات</Label>
              <Textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>الوصفة (JSONB)</Label>
              <PrescriptionBuilder items={items} onChange={setItems} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />} حفظ السجل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
