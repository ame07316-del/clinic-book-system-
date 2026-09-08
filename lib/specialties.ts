import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Bone,
  Brain,
  HeartPulse,
  Sparkles,
  Stethoscope,
  Syringe,
  Activity,
  Eye,
  Pill,
} from "lucide-react";
import { initials as toInitials } from "@/lib/utils";
import { avatarHue } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  بيانات التخصصات — أيقونات وألوان مستخدمة في البوابة                */
/* ------------------------------------------------------------------ */

export interface SpecialtyMeta {
  icon: LucideIcon;
  tint: string; // tailwind classes for the icon chip
}

const SPECIALTIES: Record<string, SpecialtyMeta> = {
  "القلب والأوعية الدموية": { icon: HeartPulse, tint: "bg-rose-50 text-rose-600 ring-rose-100" },
  "طب الأطفال": { icon: Baby, tint: "bg-amber-50 text-amber-600 ring-amber-100" },
  "الأمراض الجلدية": { icon: Sparkles, tint: "bg-violet-50 text-violet-600 ring-violet-100" },
  "جراحة العظام": { icon: Bone, tint: "bg-orange-50 text-orange-600 ring-orange-100" },
  "المخ والأعصاب": { icon: Brain, tint: "bg-indigo-50 text-indigo-600 ring-indigo-100" },
  "الباطنة العامة": { icon: Stethoscope, tint: "bg-teal-50 text-teal-600 ring-teal-100" },
};

const FALLBACKS = [Activity, Eye, Pill, Syringe, Stethoscope];
const FALLBACK_TINTS = [
  "bg-teal-50 text-teal-600 ring-teal-100",
  "bg-cyan-50 text-cyan-600 ring-cyan-100",
  "bg-slate-100 text-slate-600 ring-slate-200",
  "bg-emerald-50 text-emerald-600 ring-emerald-100",
  "bg-sky-50 text-sky-600 ring-sky-100",
];

export function specialtyMeta(specialty: string): SpecialtyMeta {
  const key = specialty.trim();
  if (SPECIALTIES[key]) return SPECIALTIES[key]!;
  let hash = 0;
  for (let i = 0; i < specialty.length; i++) hash = (hash * 31 + specialty.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % FALLBACKS.length;
  return { icon: FALLBACKS[idx]!, tint: FALLBACK_TINTS[idx]! };
}

export function doctorInitials(name: string): string {
  return toInitials(name);
}

export function doctorHue(name: string): string {
  return avatarHue(name);
}
