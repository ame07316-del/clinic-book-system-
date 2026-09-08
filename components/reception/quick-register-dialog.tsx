"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, UserPlus, Zap } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateStrip, SlotGrid } from "@/components/shared/slot-grid";
import { useAppData, useDoctors } from "@/lib/data";
import type { Appointment } from "@/lib/types";
import { cn, todayStr, addDays, minutesToTime } from "@/lib/utils";

/** Nearest 15-min slot from now, clamped to clinic hours (walk-in queue time). */
function walkInSlotNow(): string {
  const now = new Date();
  const mins = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
  return minutesToTime(Math.min(mins, 16 * 60 + 45));
}

export function QuickRegisterDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRegistered?: (appt: Appointment) => void;
}) {
  const { ds } = useAppData();
  const { data: doctors } = useDoctors();

  const [mode, setMode] = useState<"walkin" | "book">("walkin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dateOptions = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(todayStr(), i)), []);

  const walkInSlot = walkInSlotNow();

  const reset = () => {
    setFullName("");
    setPhone("");
    setReason("");
    setDoctorId(null);
    setSlot(null);
    setDate(todayStr());
    setMode("walkin");
  };

  const submit = async () => {
    if (!ds || !doctorId) {
      toast.error("Please select a doctor");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Patient name is required");
      return;
    }
    setBusy(true);
    try {
      const patient = await ds.createPatient({
        full_name: fullName,
        phone: phone || null,
      });
      const isWalkIn = mode === "walkin";
      const appt = await ds.createAppointment({
        patient_id: patient.id,
        doctor_id: doctorId,
        appointment_date: isWalkIn ? todayStr() : date,
        time_slot: isWalkIn ? walkInSlot : (slot ?? ""),
        status: isWalkIn ? "waiting" : "scheduled",
        reason: reason || null,
      });
      toast.success(isWalkIn ? "Walk-in registered" : "Appointment booked", {
        description: `${patient.full_name} · ${isWalkIn ? "added to the waiting room" : `scheduled at ${slot}`}`,
      });
      onRegistered?.(appt);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("Registration failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-teal-600" /> Quick registration & booking
          </DialogTitle>
          <DialogDescription>
            Register a walk-in patient and drop them straight into the waiting room, or book a
            slot on the spot.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "walkin" | "book")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="walkin">
              <Zap /> Walk-in (queue now)
            </TabsTrigger>
            <TabsTrigger value="book">
              <CalendarPlus /> Book a slot
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="qr-name">Patient full name *</Label>
            <Input
              id="qr-name"
              placeholder="e.g. Olivia Bennett"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-phone">Phone</Label>
            <Input
              id="qr-phone"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-doctor">Assign doctor *</Label>
            <Select value={doctorId ?? ""} onValueChange={(v) => setDoctorId(v)}>
              <SelectTrigger id="qr-doctor">
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {(doctors ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.profile?.full_name} — {d.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-reason">Reason for visit</Label>
            <Input
              id="qr-reason"
              placeholder="e.g. Sore throat, follow-up…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        {mode === "walkin" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <span className="font-semibold">Walk-in mode:</span> the patient will be created and
            immediately placed in the <span className="font-semibold">Waiting</span> queue at{" "}
            {walkInSlot} (today). The doctor&apos;s live feed updates instantly.
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border p-3">
            <DateStrip dates={dateOptions} selected={date} onSelect={(d) => { setDate(d); setSlot(null); }} />
            {doctorId ? (
              <SlotGrid
                doctorId={doctorId}
                date={date}
                selected={slot}
                onSelect={setSlot}
                includePast={date === todayStr()}
              />
            ) : (
              <p className={cn("text-sm text-muted-foreground")}>Select a doctor to see live slot availability.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || (mode === "book" && (!slot || !doctorId)) || (mode === "walkin" && !doctorId)}
          >
            {busy ? "Registering…" : mode === "walkin" ? "Register walk-in" : "Book appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
