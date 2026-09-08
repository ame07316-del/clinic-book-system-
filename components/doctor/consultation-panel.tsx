"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  FileDown,
  HeartPulse,
  Loader2,
  Play,
  Printer,
  Save,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PatientHistory } from "@/components/doctor/patient-history";
import { PrescriptionBuilder } from "@/components/doctor/prescription-builder";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppData, useMedicalRecords, useAppointments } from "@/lib/data";
import { useBranding } from "@/lib/branding";
import { printPrescription } from "@/lib/print";
import type { Appointment, MedicalRecord, PrescriptionItem } from "@/lib/types";
import { avatarHue, formatCurrency, formatDateLong, formatTimeSlot, initials } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  ConsultationPanel — مساحة الكشفية التفاعلية للطبيب:                */
/*  ملاحظات وتاريخ، وصفة إلكترونية (JSONB)، تصدير طباعة/PDF،           */
/*  وزر إنهاء الكشفية بضغطة واحدة (تحديث الاستقبال لحظيًا).            */
/* ------------------------------------------------------------------ */

export function ConsultationPanel({
  selected,
  onFinished,
}: {
  selected: Appointment | null;
  onFinished?: () => void;
}) {
  const { ds } = useAppData();
  const { branding } = useBranding();
  const { data: allRecords, loading: recordsLoading } = useMedicalRecords();
  const { data: patientAppointments } = useAppointments(
    selected?.patient_id ? { patientId: selected.patient_id } : undefined,
  );

  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [editorKey, setEditorKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const currentRecord = useMemo<MedicalRecord | null>(
    () => allRecords?.find((r) => r.appointment_id === selected?.id) ?? null,
    [allRecords, selected?.id],
  );

  // مزامنة المحرر عند تغيّر الموعد أو سجله المحفوظ
  // (نمط "اضبط الحالة أثناء الرسم" الموثق في React — من غير useEffect).
  const recordKey = selected ? `${selected.id}:${currentRecord?.updated_at ?? "none"}` : null;
  if (recordKey && editorKey !== recordKey) {
    setEditorKey(recordKey);
    setDiagnosis(currentRecord?.diagnosis ?? "");
    setItems(currentRecord?.prescription ?? []);
  }

  if (!selected) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border bg-card p-8 shadow-soft">
        <EmptyState
          icon={Stethoscope}
          title="مساحة الكشفية"
          description="اختر مريضًا من قائمة الانتظار لفتح ملفه وكتابة الوصفة الإلكترونية وإنهاء الزيارة."
          className="border-0 bg-transparent"
        />
      </div>
    );
  }

  const patient = selected.patient;
  const dirty =
    diagnosis !== (currentRecord?.diagnosis ?? "") ||
    JSON.stringify(items) !== JSON.stringify(currentRecord?.prescription ?? []);

  const validate = (): boolean => {
    if (items.some((i) => !i.medicine.trim())) {
      toast.error("كل دواء لازم يكون له اسم", {
        description: "اكتب اسم الدواء أو احذف الصف الفاضي.",
      });
      return false;
    }
    return true;
  };

  const saveRecord = async (): Promise<MedicalRecord | null> => {
    if (!ds || !validate()) return null;
    setSaving(true);
    try {
      const record = await ds.upsertMedicalRecord({
        appointment_id: selected.id,
        diagnosis: diagnosis.trim(),
        prescription: items.filter((i) => i.medicine.trim()),
      });
      toast.success("تم حفظ الوصفة", {
        description: `${items.filter((i) => i.medicine.trim()).length} دواء — مخزنة JSONB في السجل الطبي.`,
      });
      return record;
    } catch (e) {
      toast.error("فشل الحفظ", { description: e instanceof Error ? e.message : "خطأ غير معروف" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const startConsultation = async () => {
    if (!ds) return;
    try {
      await ds.updateAppointment(selected.id, { status: "in_consultation" });
      toast.success("المريض دخل الكشفية", {
        description: "تم تحديث شاشة الاستقبال لحظيًا.",
      });
    } catch (e) {
      toast.error("تعذّر بدء الكشفية", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    }
  };

  const finishConsultation = async () => {
    if (!ds) return;
    setFinishing(true);
    try {
      const hasContent = diagnosis.trim() || items.some((i) => i.medicine.trim());
      if (hasContent && (!currentRecord || dirty)) {
        const saved = await saveRecord();
        if (!saved) return; // saveRecord أظهر بالفعل رسالة الخطأ
      }
      await ds.updateAppointment(selected.id, { status: "completed" });
      toast.success("تم إنهاء الكشفية", {
        description: `${patient?.full_name} — الحالة «تم الكشف» وشاشة الاستقبال تحدثت لحظيًا.`,
      });
      onFinished?.();
    } catch (e) {
      toast.error("تعذّر إنهاء الكشفية", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    } finally {
      setFinishing(false);
    }
  };

  const print = () => {
    const record: MedicalRecord = currentRecord ?? {
      id: "preview",
      appointment_id: selected.id,
      diagnosis: diagnosis.trim(),
      prescription: items.filter((i) => i.medicine.trim()),
    };
    printPrescription(selected, record, branding);
  };

  return (
    <div className="flex h-full flex-col animate-rise rounded-xl border bg-card shadow-soft">
      {/* ترويسة المريض */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lift"
            style={{ background: avatarHue(patient?.full_name ?? "؟") }}
          >
            {initials(patient?.full_name ?? "؟")}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                {patient?.full_name}
              </h2>
              <StatusBadge status={selected.status} animated />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateLong(selected.appointment_date)} · {formatTimeSlot(selected.time_slot)}
              {patient?.phone ? ` · ${patient.phone}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.status === "waiting" && (
            <Button onClick={() => void startConsultation()}>
              <Play /> بدء الكشفية
            </Button>
          )}
          {selected.status === "in_consultation" && (
            <Button variant="success" onClick={() => void finishConsultation()} disabled={finishing}>
              {finishing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              {finishing ? "جارٍ الإنهاء…" : "إنهاء الكشفية"}
            </Button>
          )}
          {(selected.status === "completed" || selected.status === "in_consultation") && (
            <Button variant="outline" onClick={print}>
              <FileDown /> طباعة / PDF
            </Button>
          )}
        </div>
      </div>

      {selected.reason && (
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-sm text-slate-600">
          <span className="font-semibold text-slate-500">الشكوى الأساسية: </span>
          {selected.reason}
        </div>
      )}

      <Tabs defaultValue="consult" className="flex flex-1 flex-col p-5">
        <TabsList className="self-start">
          <TabsTrigger value="consult">
            <ClipboardList /> الكشفية
          </TabsTrigger>
          <TabsTrigger value="history">
            <HeartPulse /> السجل والملاحظات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consult" className="flex-1 space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="diagnosis">التشخيص والملاحظات الإكلينيكية</Label>
              {currentRecord && !dirty && (
                <Badge variant="teal" className="text-[10px]">
                  محفوظ {currentRecord.updated_at ? new Date(currentRecord.updated_at).toLocaleTimeString("ar-EG-u-nu-latn") : ""}
                </Badge>
              )}
              {dirty && (
                <Badge variant="warning" className="text-[10px]">
                  تغييرات غير محفوظة
                </Badge>
              )}
            </div>
            <Textarea
              id="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="مثال: التهاب جيوب أنفية بكتيري حاد — أُعطيت دورة مضاد حيوي وإعادة بعد 7 أيام…"
              className="min-h-[90px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">الوصفة الإلكترونية</Label>
            <PrescriptionBuilder items={items} onChange={setItems} />
          </div>

          <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center justify-between gap-2 border-t bg-card/95 px-5 py-3 backdrop-blur">
            <p className="text-xs text-muted-foreground">
              تُحفظ في{" "}
              <code className="rounded bg-slate-100 px-1 font-mono" dir="ltr">
                medical_records.prescription
              </code>{" "}
              (JSONB) — قابلة للتصدير PDF.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={print} disabled={!diagnosis.trim() && items.every((i) => !i.medicine.trim())}>
                <Printer /> طباعة / تصدير PDF
              </Button>
              <Button onClick={() => void saveRecord()} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {saving ? "جارٍ الحفظ…" : "حفظ الوصفة"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="flex-1">
          <PatientHistory
            records={allRecords ?? []}
            appointments={patientAppointments ?? []}
            loading={recordsLoading}
            excludeAppointmentId={selected.id}
          />
        </TabsContent>
      </Tabs>

      {/* رسوم الكشف */}
      <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-muted-foreground">
        رسوم الكشف:{" "}
        <span className="font-semibold text-slate-700">
          {formatCurrency(selected.doctor?.consultation_fee ?? 0)}
        </span>{" "}
        · الدفع عند الاستقبال.
        {recordsLoading && <Skeleton className="ms-2 inline-block h-3 w-16 align-middle" />}
      </div>
    </div>
  );
}
