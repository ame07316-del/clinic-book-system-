"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
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
import { useAppData, useAppointments, usePatients } from "@/lib/data";
import type { Profile } from "@/lib/types";
import { avatarHue, cn, formatDateShort, formatTimeSlot, initials } from "@/lib/utils";

export function PatientsAdmin() {
  const { ds } = useAppData();
  const { data: patients, loading } = usePatients();
  const { data: appointments } = useAppointments();
  const { armedId, click } = useConfirmClick();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const filtered = (patients ?? []).filter(
    (p) =>
      !search.trim() ||
      p.full_name.includes(search.trim()) ||
      (p.phone ?? "").includes(search.trim()),
  );

  const openCreate = () => {
    setEditing(null);
    setFullName("");
    setPhone("");
    setDialogOpen(true);
  };

  const openEdit = (p: Profile) => {
    setEditing(p);
    setFullName(p.full_name);
    setPhone(p.phone ?? "");
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!ds) return;
    if (!fullName.trim()) {
      toast.error("اسم المريض مطلوب");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await ds.updateProfile(editing.id, { full_name: fullName, phone });
        toast.success("تم تغيير هوية المريض", {
          description: `${editing.full_name} ← ${fullName}`,
        });
      } else {
        await ds.createPatient({ full_name: fullName, phone: phone || null });
        toast.success("تمت إضافة المريض", { description: fullName });
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

  const remove = (p: Profile) => {
    click(p.id, () => {
      void ds
        ?.deletePatient(p.id)
        .then(() =>
          toast.success("تم حذف المريض", {
            description: `${p.full_name} — ومعه كل مواعيده وسجلاته الطبية`,
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
          <h2 className="text-lg font-bold text-slate-900">إدارة المرضى</h2>
          <p className="text-sm text-muted-foreground">
            تغيير هوية أي مريض (الاسم/الهاتف) أو حذفه نهائيًا مع كل بياناته.
          </p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus /> إضافة مريض
        </Button>
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف…"
          className="ps-9"
        />
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد مرضى"
          description="أضف مريضًا جديدًا أو حمّل البيانات التجريبية."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="py-3 ps-4">المريض</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>آخر مواعيده</TableHead>
                <TableHead className="text-end pr-4">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const theirs = (appointments ?? [])
                  .filter((a) => a.patient_id === p.id)
                  .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
                  .slice(0, 2);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="ps-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: avatarHue(p.full_name) }}
                        >
                          {initials(p.full_name)}
                        </span>
                        <p className="font-semibold text-slate-800">{p.full_name}</p>
                      </div>
                    </TableCell>
                    <TableCell dir="ltr" className="text-slate-600">
                      {p.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      {theirs.length === 0 ? (
                        <span className="text-xs text-muted-foreground">لا يوجد</span>
                      ) : (
                        <div className="space-y-0.5 text-xs text-slate-600">
                          {theirs.map((a) => (
                            <p key={a.id}>
                              {formatDateShort(a.appointment_date)} ·{" "}
                              {formatTimeSlot(a.time_slot)} ·{" "}
                              {a.doctor?.profile?.full_name}
                            </p>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                          <Pencil /> تغيير الهوية
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            armedId === p.id
                              ? "bg-rose-600 text-white hover:bg-rose-600 hover:text-white"
                              : "text-slate-400 hover:text-destructive",
                          )}
                          onClick={() => remove(p)}
                        >
                          <Trash2 /> {armedId === p.id ? "تأكيد الحذف؟" : "حذف"}
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
              <Users className="h-5 w-5 text-teal-600" />
              {editing ? "تغيير هوية المريض" : "إضافة مريض جديد"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "الاسم والهاتف يتحدثان في كل المواعيد والسجلات المرتبطة فورًا."
                : "سيظهر المريض في قوائم الاستقبال ومتابعة المواعيد بالهاتف."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الاسم بالكامل *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: هدى إبراهيم"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {editing ? "حفظ الهوية الجديدة" : "إضافة المريض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
