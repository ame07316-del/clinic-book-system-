"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarOff, Clock, ShieldAlert } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useAppData, useDoctors } from "@/lib/data";
import type { BlockType } from "@/lib/types";
import { generateDaySlots } from "@/lib/slots";
import { addDays, formatTimeSlot, todayStr } from "@/lib/utils";

const BLOCK_TYPES: Array<{ value: BlockType; label: string; hint: string }> = [
  { value: "break", label: "Doctor break", hint: "Lunch, rounds, admin time" },
  { value: "emergency", label: "Emergency window", hint: "Reserve capacity for urgent cases" },
  { value: "custom", label: "Custom block", hint: "Any other unavailability" },
];

export function SlotBlockerDialog({
  open,
  onOpenChange,
  defaultDoctorId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDoctorId?: string | null;
}) {
  const { ds } = useAppData();
  const { data: doctors } = useDoctors();

  const [doctorId, setDoctorId] = useState<string>(defaultDoctorId ?? "");
  const [date, setDate] = useState(todayStr());
  const [type, setType] = useState<BlockType>("break");
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("14:00");
  const [reason, setReason] = useState("");
  const [cancelAffected, setCancelAffected] = useState(false);
  const [busy, setBusy] = useState(false);

  const slots = generateDaySlots();

  const submit = async () => {
    if (!ds || !doctorId) {
      toast.error("Select a doctor to block time for");
      return;
    }
    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }
    setBusy(true);
    try {
      const block = await ds.createScheduleBlock({
        doctor_id: doctorId,
        block_date: date,
        start_time: startTime,
        end_time: endTime,
        type,
        reason: reason || null,
        cancelAffected,
      });
      toast.success("Slots blocked", {
        description: `${formatTimeSlot(block.start_time)}–${formatTimeSlot(block.end_time)} on ${block.block_date}${cancelAffected ? " — overlapping appointments were cancelled" : ""}.`,
      });
      setReason("");
      setCancelAffected(false);
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not block slots", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-teal-600" /> Dynamic slot creator
          </DialogTitle>
          <DialogDescription>
            Block out break times, emergency windows or override capacity. Blocked slots grey out
            everywhere instantly — including the patient portal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Doctor *</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
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
            <Label htmlFor="blk-date">Date</Label>
            <Input
              id="blk-date"
              type="date"
              value={date}
              min={todayStr()}
              max={addDays(todayStr(), 60)}
              onChange={(e) => setDate(e.target.value || todayStr())}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Block type</Label>
            <Select value={type} onValueChange={(v) => setType(v as BlockType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="blk-start">From</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger id="blk-start">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {slots.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatTimeSlot(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blk-end">To</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger id="blk-end">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {slots.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatTimeSlot(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="blk-reason">Reason / note</Label>
            <Input
              id="blk-reason"
              placeholder={
                type === "break"
                  ? "e.g. Lunch break"
                  : type === "emergency"
                    ? "e.g. Reserved for ER overflow"
                    : "e.g. Conference at City Hospital"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/60 p-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-500" />
            <div>
              <p className="text-sm font-medium text-rose-800">Override capacity</p>
              <p className="text-xs text-rose-600">
                Cancel appointments that overlap this window.
              </p>
            </div>
          </div>
          <Switch checked={cancelAffected} onCheckedChange={setCancelAffected} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || !doctorId}>
            {busy ? "Blocking…" : "Block slots"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
