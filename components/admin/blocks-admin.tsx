"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SlotBlockerDialog } from "@/components/reception/slot-blocker-dialog";
import { useConfirmClick } from "@/components/admin/use-confirm-click";
import { useAppData, useDoctors, useScheduleBlocks } from "@/lib/data";
import { avatarHue, cn, formatDateShort, formatTimeSlot, initials } from "@/lib/utils";

const BLOCK_LABEL: Record<string, { label: string; className: string }> = {
  break: { label: "استراحة", className: "border-amber-200 bg-amber-50 text-amber-700" },
  emergency: { label: "طوارئ", className: "border-rose-200 bg-rose-50 text-rose-700" },
  custom: { label: "محجوب", className: "border-slate-200 bg-slate-100 text-slate-600" },
};

export function BlocksAdmin() {
  const { ds } = useAppData();
  const { data: blocks, loading } = useScheduleBlocks();
  const { data: doctors } = useDoctors();
  const { armedId, click } = useConfirmClick();
  const [createOpen, setCreateOpen] = useState(false);

  const doctorOf = (id: string) => doctors?.find((d) => d.id === id) ?? null;

  const rows = [...(blocks ?? [])].sort(
    (a, b) =>
      b.block_date.localeCompare(a.block_date) || a.start_time.localeCompare(b.start_time),
  );

  const remove = (id: string, label: string) => {
    click(id, () => {
      void ds
        ?.deleteScheduleBlock(id)
        .then(() => toast.success("تم إزالة الحظر", { description: `${label} — المعادات متاحة من جديد` }))
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
          <h2 className="text-lg font-bold text-slate-900">حظر المواعيد</h2>
          <p className="text-sm text-muted-foreground">
            كل أيام الحظر (استراحات / طوارئ / مخصص) — الإزالة تعيد المعادات فورًا في كل الشاشات.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> حظر جديد
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="لا يوجد حظر مواعيد"
          description="أنشئ حظرًا لاستراحة طبيب أو نافذة طوارئ."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="py-3 ps-4">الطبيب</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الفترة</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>السبب</TableHead>
                <TableHead className="text-end pr-4">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => {
                const doc = doctorOf(b.doctor_id);
                const name = doc?.profile?.full_name ?? "طبيب محذوف";
                const style = BLOCK_LABEL[b.type] ?? BLOCK_LABEL.custom!;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="ps-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: avatarHue(name) }}
                        >
                          {initials(name)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{name}</p>
                          <p className="text-xs text-muted-foreground">{doc?.specialty ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {formatDateShort(b.block_date)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">
                      {formatTimeSlot(b.start_time)}–{formatTimeSlot(b.end_time)}
                    </TableCell>
                    <TableCell>
                      <Badge className={style.className}>{style.label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-slate-600">
                      {b.reason ?? "—"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            armedId === b.id
                              ? "bg-rose-600 text-white hover:bg-rose-600 hover:text-white"
                              : "text-slate-400 hover:text-destructive",
                          )}
                          onClick={() => remove(b.id, `${name} ${formatDateShort(b.block_date)}`)}
                        >
                          <Trash2 /> {armedId === b.id ? "تأكيد؟" : "إزالة"}
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

      <SlotBlockerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
