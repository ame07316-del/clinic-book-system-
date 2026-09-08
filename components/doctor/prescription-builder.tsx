"use client";

import { Plus, Pill, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PrescriptionItem } from "@/lib/types";

const DOSAGE_HINTS = ["1 tablet", "2 tablets", "1 capsule", "5 ml", "10 mg", "1 spray", "Apply thin layer"];
const FREQUENCY_HINTS = [
  "Once daily",
  "Twice daily",
  "3× daily",
  "Every 8 hours",
  "Every 12 hours",
  "Before meals",
  "After meals",
  "As needed (PRN)",
  "At bedtime",
];
const DURATION_HINTS = ["3 days", "5 days", "7 days", "10 days", "2 weeks", "4 weeks", "8 weeks", "3 months", "Ongoing"];

/* ------------------------------------------------------------------ */
/*  PrescriptionBuilder — dynamic e-prescription rows stored as JSONB  */
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
            No medications yet. Add the first prescription line — entries are stored as JSONB on
            the medical record.
          </p>
        </div>
      )}

      {items.map((item, idx) => (
        <div
          key={item.id}
          className="relative animate-rise rounded-xl border bg-slate-50/60 p-3.5 ring-1 ring-transparent transition-shadow focus-within:shadow-soft focus-within:ring-teal-200"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700">
              <Pill className="h-3.5 w-3.5" /> Medication {idx + 1}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Remove medication"
              onClick={() => remove(item.id)}
              className="text-slate-400 hover:bg-rose-50 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Medicine name *</Label>
              <Input
                value={item.medicine}
                onChange={(e) => update(item.id, { medicine: e.target.value })}
                placeholder="e.g. Amoxicillin"
                list="medicines"
                className="h-8 bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Dosage</Label>
              <Input
                value={item.dosage}
                onChange={(e) => update(item.id, { dosage: e.target.value })}
                placeholder="e.g. 500 mg"
                list="dosages"
                className="h-8 bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Frequency</Label>
              <Input
                value={item.frequency}
                onChange={(e) => update(item.id, { frequency: e.target.value })}
                placeholder="e.g. Twice daily"
                list="frequencies"
                className="h-8 bg-card"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Duration</Label>
              <Input
                value={item.duration}
                onChange={(e) => update(item.id, { duration: e.target.value })}
                placeholder="e.g. 7 days"
                list="durations"
                className="h-8 bg-card"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-slate-500">Instructions (optional)</Label>
              <Input
                value={item.instructions ?? ""}
                onChange={(e) => update(item.id, { instructions: e.target.value })}
                placeholder="e.g. Take after food with plenty of water"
                className="h-8 bg-card"
              />
            </div>
          </div>
        </div>
      ))}

      {/* datalists for quick entry */}
      <datalist id="medicines">
        {["Amoxicillin", "Ibuprofen", "Paracetamol", "Lisinopril", "Metformin", "Atorvastatin", "Omeprazole", "Cetirizine", "Salbutamol"].map((m) => (
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
        <Plus /> Add medication
      </Button>
    </div>
  );
}
