import { generateDaySlots } from "@/lib/slots";

/* إعادة تصدير أدوات مساعدة تستخدمها شاشات الأدمن مع توليد المعادات بأمان */
export {
  addDays,
  avatarHue,
  cn,
  formatCurrency,
  formatDateShort,
  formatDateLong,
  formatTimeSlot,
  initials,
  todayStr,
} from "@/lib/utils";

export function generateSlotsSafe(): string[] {
  try {
    return generateDaySlots();
  } catch {
    return [];
  }
}
