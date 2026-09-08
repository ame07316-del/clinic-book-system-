import { timeToMinutes } from "@/lib/utils";
import type { Appointment, ScheduleBlock } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Slot engine — generates a doctor's day grid and computes           */
/*  availability from live appointments + dynamic schedule blocks.     */
/* ------------------------------------------------------------------ */

export const CLINIC_OPEN = "09:00";
export const CLINIC_CLOSE = "17:00";
export const SLOT_STEP_MIN = 30;
export const LUNCH_START = "13:00";
export const LUNCH_END = "14:00";

export function generateDaySlots(): string[] {
  const slots: string[] = [];
  const start = timeToMinutes(CLINIC_OPEN);
  const end = timeToMinutes(CLINIC_CLOSE);
  const lunchStart = timeToMinutes(LUNCH_START);
  const lunchEnd = timeToMinutes(LUNCH_END);
  for (let t = start; t < end; t += SLOT_STEP_MIN) {
    if (t >= lunchStart && t < lunchEnd) continue; // clinic lunch
    slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return slots;
}

export interface SlotState {
  slot: string;
  /** blocked by a schedule block (break / emergency / custom) or clinic lunch */
  blocked: boolean;
  blockReason?: string;
  blockType?: "break" | "emergency" | "custom";
  booked: number;
  capacity: number;
  past: boolean;
  available: boolean;
  appointmentIds: string[];
}

export function computeSlotStates(options: {
  slots?: string[];
  date: string;
  appointments: Appointment[];
  blocks: ScheduleBlock[];
  capacity?: number;
  /** ISO time representing "now" — defaults to Date.now() */
  now?: Date;
  /** minutes of lead time required before a slot can be booked */
  bufferMinutes?: number;
}): SlotState[] {
  const {
    slots = generateDaySlots(),
    date,
    appointments,
    blocks,
    capacity = 1,
    now = new Date(),
    bufferMinutes = 0,
  } = options;

  const [ny, nm, nd] = [now.getFullYear(), now.getMonth(), now.getDate()];
  const isToday =
    date === `${ny}-${String(nm + 1).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return slots.map((slot) => {
    const [h, m] = slot.split(":").map(Number);
    const slotMin = h * 60 + m;
    const past = isToday && slotMin <= nowMinutes + bufferMinutes;

    const block = blocks.find(
      (b) => slot >= b.start_time && slot < b.end_time,
    );

    const inSlot = appointments.filter(
      (a) => a.time_slot === slot && a.status !== "cancelled",
    );

    const lunch = slot >= LUNCH_START && slot < LUNCH_END;

    const blocked = Boolean(block) || lunch;
    const available = !blocked && !past && inSlot.length < capacity;

    return {
      slot,
      blocked,
      blockReason: block
        ? block.reason ?? (block.type === "break" ? "On break" : "Unavailable")
        : lunch
          ? "Clinic lunch break"
          : undefined,
      blockType: block?.type,
      booked: inSlot.length,
      capacity,
      past,
      available,
      appointmentIds: inSlot.map((a) => a.id),
    };
  });
}

export function summarizeSlotStates(states: SlotState[]) {
  const available = states.filter((s) => s.available).length;
  const blocked = states.filter((s) => s.blocked).length;
  const booked = states.filter((s) => !s.blocked && s.booked >= s.capacity).length;
  const past = states.filter((s) => s.past && !s.blocked).length;
  return { total: states.length, available, blocked, booked, past };
}
