"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranding } from "@/lib/branding";
import type { Branding } from "@/lib/types";

const FIELDS: Array<{ key: keyof Branding; label: string; hint?: string; ltr?: boolean }> = [
  { key: "shortName", label: "الاسم المختصر (اللوجو)", hint: "يظهر في هيدر الموقع" },
  { key: "fullName", label: "الاسم الكامل", hint: "يظهر في الوصفات والإيصالات المطبوعة" },
  { key: "tagline", label: "الوصف المختصر", hint: "تحت اللوجو وفي الترويسة" },
  { key: "address", label: "العنوان", hint: "ترويسة المستندات المطبوعة" },
  { key: "phone", label: "الهاتف", hint: "ترويسة المستندات المطبوعة", ltr: true },
  { key: "email", label: "البريد الإلكتروني", hint: "ترويسة المستندات المطبوعة", ltr: true },
];

export function BrandingAdmin() {
  const { branding, loading, save, reset } = useBranding();
  const [form, setForm] = useState<Branding>(branding);
  const [syncedWith, setSyncedWith] = useState<Branding>(branding);
  const [busy, setBusy] = useState(false);

  // مزامنة النموذج عند تغيّر الهوية المخزنة (نمط الضبط أثناء الرسم — بلا useEffect)
  if (branding !== syncedWith) {
    setSyncedWith(branding);
    setForm(branding);
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(branding);

  const submit = async () => {
    if (!form.shortName.trim() || !form.fullName.trim()) {
      toast.error("الاسم المختصر والكامل مطلوبان");
      return;
    }
    setBusy(true);
    try {
      await save(form);
      toast.success("تم تحديث هوية العيادة", {
        description: "اللوجو والمستندات المطبوعة تستخدم الهوية الجديدة فورًا.",
      });
    } catch (e) {
      toast.error("فشل الحفظ", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">هوية العيادة</h2>
        <p className="text-sm text-muted-foreground">
          غيّر اسم المركز وشعاره ومعلوماته — تتغير في كل الموقع وفي الوصفات والإيصالات المطبوعة.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3 rounded-xl border bg-card p-5 shadow-soft">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  value={form[f.key]}
                  dir={f.ltr ? "ltr" : undefined}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="max-w-md"
                />
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button onClick={() => void submit()} disabled={busy || !dirty}>
                {busy ? <Loader2 className="animate-spin" /> : <Save />}
                {busy ? "جارٍ الحفظ…" : "حفظ الهوية"}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !dirty}
                onClick={() => setForm(branding)}
              >
                استرجاع
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  void reset().then(() =>
                    toast.info("أُعيدت الهوية الافتراضية (ميديكور)"),
                  );
                }}
              >
                <RotateCcw /> الافتراضية
              </Button>
            </div>
          </div>

          {/* معاينة حية */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400">معاينة حية</p>
            <div className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lift">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <div className="text-[15px] font-bold text-slate-900">{form.shortName}</div>
                  <div className="text-[10px] text-slate-400">{form.tagline}</div>
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border shadow-soft">
              <div className="border-b-3 border-teal-600 bg-gradient-to-bl from-teal-50 to-white p-4">
                <div className="font-extrabold text-slate-900">{form.fullName}</div>
                <div className="text-[11px] text-slate-500">{form.tagline}</div>
                <div className="mt-2 text-[10px] leading-relaxed text-slate-400" dir="ltr">
                  {form.address}
                  <br />
                  {form.phone} · {form.email}
                </div>
              </div>
              <p className="p-3 text-center text-[11px] text-muted-foreground">
                هكذا تبدو ترويسة الوصفة الطبية وإيصال الدفع بعد الحفظ.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
