import { cn } from "@/lib/utils";

export function LiveIndicator({
  mode,
  className,
  showLabel = true,
}: {
  mode: "supabase" | "demo" | "connecting";
  className?: string;
  showLabel?: boolean;
}) {
  const live = mode !== "connecting";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        live
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500",
        className,
      )}
      title={
        mode === "supabase"
          ? "Connected to Supabase — realtime stream active"
          : mode === "demo"
            ? "Local demo backend — realtime simulated across tabs"
            : "Connecting…"
      }
    >
      <span className="relative flex h-2 w-2">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            live ? "bg-emerald-500" : "bg-slate-400",
          )}
        />
      </span>
      {showLabel && (mode === "connecting" ? "Connecting…" : "Live")}
    </span>
  );
}
