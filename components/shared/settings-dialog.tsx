"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Database,
  Download,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/lib/data";
import type { SeedCounts } from "@/lib/types";

export function useDemoActions() {
  const { ds, reconnect } = useAppData();
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);

  const seed = async (): Promise<SeedCounts | null> => {
    if (!ds) return null;
    setSeeding(true);
    try {
      const counts = await ds.seedDemoData();
      toast.success("تم تحميل البيانات التجريبية", {
        description: `${counts.doctors} أطباء · ${counts.patients} مرضى · ${counts.appointments} مواعيد · ${counts.medical_records} سجلات · ${counts.schedule_blocks} حظر`,
      });
      return counts;
    } catch (e) {
      toast.error("فشل تحميل البيانات", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
      return null;
    } finally {
      setSeeding(false);
    }
  };

  const reset = async (): Promise<void> => {
    if (!ds) return;
    setResetting(true);
    try {
      await ds.resetAll();
      toast.success("تم مسح كل البيانات");
    } catch (e) {
      toast.error("فشل المسح", {
        description: e instanceof Error ? e.message : "خطأ غير معروف",
      });
    } finally {
      setResetting(false);
    }
  };

  return { seed, reset, seeding, resetting, reconnect, ds };
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { mode, message, reconnect } = useAppData();
  const { seed, reset, seeding, resetting } = useDemoActions();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "— غير محدد —";
  const keyPreview = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 14)}••••••••`
    : "— غير محدد —";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-600" /> إعدادات النظام
          </DialogTitle>
          <DialogDescription>
            الاتصال بقاعدة البيانات، البيانات التجريبية، وتشخيص بيئة التشغيل.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {mode === "supabase" ? (
                <>
                  <Server className="h-4 w-4 text-emerald-600" /> متصل بـ Supabase
                </>
              ) : mode === "demo" ? (
                <>
                  <TriangleAlert className="h-4 w-4 text-amber-600" /> قاعدة بيانات تجريبية محلية
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-400" /> جارٍ الاتصال…
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={reconnect}>
              <RefreshCw /> إعادة الاتصال
            </Button>
          </div>
          {message && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{message}</p>}
          {mode === "demo" && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-100">
              لتشغيل مشروعك على Supabase: افتح{" "}
              <span className="font-semibold">SQL Editor</span> في لوحة تحكم Supabase ونفّذ ملف{" "}
              <code className="rounded bg-amber-100/70 px-1 font-mono" dir="ltr">supabase/schema.sql</code>{" "}
              الموجود بالمستودع، وفعّل Realtime لجدول{" "}
              <code className="font-mono" dir="ltr">appointments</code>، ثم اضغط{" "}
              <span className="font-semibold">إعادة الاتصال</span>.
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold text-slate-400">بيئة التشغيل</p>
          <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground" dir="ltr">
              NEXT_PUBLIC_SUPABASE_URL
            </span>
            <code className="max-w-[55%] truncate rounded bg-slate-100 px-2 py-0.5 text-xs" dir="ltr">
              {supabaseUrl}
            </code>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground" dir="ltr">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </span>
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs" dir="ltr">
              {keyPreview}
            </code>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400">البيانات التجريبية</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void seed()} disabled={seeding || mode === "connecting"}>
              <Sparkles className={seeding ? "animate-pulse" : ""} />
              {seeding ? "جارٍ التحميل…" : "تحميل البيانات التجريبية"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void reset()}
              disabled={resetting || mode === "connecting"}
              className="text-destructive hover:bg-rose-50 hover:text-destructive"
            >
              <Trash2 /> {resetting ? "جارٍ المسح…" : "مسح كل البيانات"}
            </Button>
            <Button variant="ghost" asChild>
              <a href="/supabase/schema.sql" download>
                <Download /> تنزيل schema.sql
              </a>
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            التحميل يستبدل <span className="font-medium">كل</span> الأطباء والمرضى والمواعيد
            والسجلات بمجموعة واقعية لطابور اليوم (مرضى تم الكشف عنهم، وفي الانتظار، وداخل
            الكشفية، ومحجوزين).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
