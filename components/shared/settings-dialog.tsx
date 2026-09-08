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
      toast.success("Demo data seeded", {
        description: `${counts.doctors} doctors · ${counts.patients} patients · ${counts.appointments} appointments · ${counts.medical_records} records · ${counts.schedule_blocks} blocks`,
      });
      return counts;
    } catch (e) {
      toast.error("Seeding failed", {
        description: e instanceof Error ? e.message : "Unknown error",
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
      toast.success("All demo data cleared");
    } catch (e) {
      toast.error("Reset failed", {
        description: e instanceof Error ? e.message : "Unknown error",
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "— not set —";
  const keyPreview = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 14)}••••••••`
    : "— not set —";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-600" /> System Settings
          </DialogTitle>
          <DialogDescription>
            Backend connection, demo data and environment diagnostics.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {mode === "supabase" ? (
                <>
                  <Server className="h-4 w-4 text-emerald-600" /> Connected to Supabase
                </>
              ) : mode === "demo" ? (
                <>
                  <TriangleAlert className="h-4 w-4 text-amber-600" /> Local demo backend
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-400" /> Connecting…
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={reconnect}>
              <RefreshCw /> Reconnect
            </Button>
          </div>
          {message && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{message}</p>}
          {mode === "demo" && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-100">
              To connect your Supabase project: open the{" "}
              <span className="font-semibold">SQL Editor</span> in the Supabase dashboard and run{" "}
              <code className="rounded bg-amber-100/70 px-1 font-mono">supabase/schema.sql</code>{" "}
              from this repo, enable Realtime for <code className="font-mono">appointments</code>,
              then hit <span className="font-semibold">Reconnect</span>.
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Environment
          </p>
          <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL</span>
            <code className="max-w-[55%] truncate rounded bg-slate-100 px-2 py-0.5 text-xs">
              {supabaseUrl}
            </code>
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{keyPreview}</code>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Demo data
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void seed()} disabled={seeding || mode === "connecting"}>
              <Sparkles className={seeding ? "animate-pulse" : ""} />
              {seeding ? "Seeding…" : "Seed Demo Data"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void reset()}
              disabled={resetting || mode === "connecting"}
              className="text-destructive hover:bg-rose-50 hover:text-destructive"
            >
              <Trash2 /> {resetting ? "Clearing…" : "Clear All Data"}
            </Button>
            <Button variant="ghost" asChild>
              <a href="/supabase/schema.sql" download>
                <Download /> Download schema.sql
              </a>
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Seeding replaces <span className="font-medium">all</span> doctors, patients,
            appointments and records with a fresh realistic dataset for today&apos;s queue
            (completed, waiting, in-consultation and scheduled patients included).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
