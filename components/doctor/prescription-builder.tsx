"use client";

import { Plus, Pill, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PrescriptionItem } from "@/lib/types";

const DOSAGE_HINTS = ["قرص واحد", "قرصان", "كبسولة واحدة", "5 مل", "10 مجم", "بخة واحدة", "طبقة رقيقة موضعية"];
const FREQUENCY_HINTS = [
  "مرة واحدة يوميًا",
  "مرتين يوميًا",
  "3 مرات يوميًا",
  "كل 8 ساعات",
  "كل 12 ساعة",
  "قبل الأكل",
  "بعد الأكل",
  "عند اللزوم",
  "قبل النوم",
];
const DURATION_HINTS = ["3 أيام", "5 أيام", "7 أيام", "10 أيام", "أسبوعين", "4 أسابيع", "8 أسابيع", "3 شهور", "مستمر"];

/* ------------------------------------------------------------------ */
/*  PrescriptionBuilder — صفوف الوصفة الديناميكية المخزنة JSONB        */
/* ------------------------------------------------------------------ */

export function PrescriptionBuilder({
  items,
  onChange,
}: {
  items: PrescriptionItem[];
  onChange: (items: PrescriptionItem[]) => void;
}) {
  const addItem = () => {
    onChange([
      ...items,
      { id: crypto.randomUUID(), medicine: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const update = (id: string, patch: Partial<PrescriptionItem>) => {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed bg-teal-50/40 px-4 py-5 text-sm text-teal-800">
          <Pill className="h-5 w-5 shrink-0 text-teal-500" />
          <p>
            لا توجد أدوية بعد. أضف أول صنف — يُخزَّن كـ JSONB في السجل الطبي.
          </p>
        </div>
      )}

      {items.map((item, idx) => (
        <div
          key={item.id}
          className="relative animate-rise rounded-xl border bg-slate-50/60 p-3.5 ring-1 ring-transparent transition-shadow focus-within:shadow-soft focus-within:ring-teal-200"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
              <Pill className="h-3.5 w-3.5" /> الدواء {idx + 1}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="حذف الدواء"
              onClick={() => remove(item.id)}
              className="text-slate-400 hover:bg-rose-50 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">اسم الدواء *</Label>
              <Input
                value={item.medicine}
                onChange={(e) => update(item.id, { medicine: e.target.value })}
                placeholder="مثال: أوجمنتين"
                list="medicines"
                className="h-8 bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">الجرعة</Label>
              <Input
                value={item.dosage}
                onChange={(e) => update(item.id, { dosage: e.target.value })}
                placeholder="مثال: 500 مجم"
                list="dosages"
                className="h-8 bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">التكرار</Label>
              <Input
                value={item.frequency}
                onChange={(e) => update(item.id, { frequency: e.target.value })}
                placeholder="مثال: مرتين يوميًا"
                list="frequencies"
                className="h-8 bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">المدة</Label>
              <Input
                value={item.duration}
                onChange={(e) => update(item.id, { duration: e.target.value })}
                placeholder="مثال: 7 أيام"
                list="durations"
                className="h-8 bg-card"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-slate-500">تعليمات (اختياري)</Label>
              <Input
                value={item.instructions ?? ""}
                onChange={(e) => update(item.id, { instructions: e.target.value })}
                placeholder="مثال: بعد الأكل بماء كثير"
                className="h-8 bg-card"
              />
            </div>
          </div>
        </div>
      ))}

      {/* قوائم اقتراحات للإدخال السريع */}
      <datalist id="medicines">
        {["أوجمنتين", "بانادول إكسترا", "زيرتك", "كونكور", "جلوكوفاج", "ليبيتور", "نيكسيوم", "فولتارين", "فيتامين د", "فوليك أسيد"].map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id="dosages">
        {DOSAGE_HINTS.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="frequencies">
        {FREQUENCY_HINTS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <datalist id="durations">
        {DURATION_HINTS.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <Button type="button" variant="outline" onClick={addItem} className="w-full border-dashed">
        <Plus /> إضافة دواء
      </Button>
    </div>
  );
}
