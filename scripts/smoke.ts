/* Node smoke test for core engines (slots, seed, local store). */
import { LocalStore } from "../lib/data/local-store";
import { computeSlotStates, generateDaySlots } from "../lib/slots";
import { buildSeedBundle } from "../lib/data/seed";
import { formatTimeSlot, timeToMinutes, toDateStr, addDays } from "../lib/utils";
import type { Appointment } from "../lib/types";

// --- localStorage shim ---
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failures++;
}

// 1. utils
check("formatTimeSlot 14:30 -> 2:30 م", formatTimeSlot("14:30") === "2:30 م");
check("formatTimeSlot 00:15 -> 12:15 ص", formatTimeSlot("00:15") === "12:15 ص");
check("timeToMinutes", timeToMinutes("09:30") === 570);
const today = toDateStr(new Date());
check("addDays", addDays(today, 1) !== today);

// 2. slot engine
const slots = generateDaySlots();
check("day slots generated (16 h * 2 - 2 lunch) = 14", slots.length === 14);
check("no lunch slots", !slots.some((s) => s >= "13:00" && s < "14:00"));
check("starts 09:00 ends 16:30", slots[0] === "09:00" && slots[slots.length - 1] === "16:30");

const seed = buildSeedBundle(today, addDays(today, 1));
const doctor0 = seed.doctors[0]!;
const blocksD0 = seed.schedule_blocks.filter((b) => b.doctor_id === doctor0.id);
const states = computeSlotStates({
  date: today,
  appointments: seed.appointments.filter((a) => a.appointment_date === today) as unknown as Appointment[],
  blocks: blocksD0,
  now: new Date(2000, 0, 1, 10, 5), // fixed "now" so nothing is past
});
check("14 states", states.length === 14);
const s0900 = states.find((s) => s.slot === "09:00")!;
check("09:00 booked (Mitchell appt exists)", s0900.booked >= 1 && !s0900.available);
check("13:00 excluded from grid (lunch)", !states.some((s) => s.slot >= "13:00" && s.slot < "14:00"));
const peds = seed.doctors[1]!;
const pedsStates = computeSlotStates({
  date: today,
  appointments: seed.appointments.filter((a) => a.doctor_id === peds.id && a.appointment_date === today) as unknown as Appointment[],
  blocks: seed.schedule_blocks.filter((b) => b.doctor_id === peds.id),
  now: new Date(2000, 0, 1, 10, 5),
});
const s1500 = pedsStates.find((s) => s.slot === "15:00")!;
check("15:00 blocked (pediatric emergency window)", s1500.blocked && !s1500.available);
const s1400 = states.find((s) => s.slot === "14:00")!;
check("14:00 has booking", s1400.booked >= 1);

// 3. local store end-to-end
async function storeTests() {
const ls = new LocalStore();
await ls.init();
const seedCounts = await ls.seedDemoData();
check("seed doctors=6", seedCounts.doctors === 6);
check("seed patients=16", seedCounts.patients === 16);
check("seed records match completed appts", seedCounts.medical_records >= 6);
const doctors = await ls.getDoctors();
check("getDoctors joins profiles", doctors.length === 6 && doctors.every((d) => d.profile));
const appts = await ls.getAppointments({ date: today });
check("today appointments exist", appts.length >= 15);
check("joined patient+doctor", appts.every((a) => a.patient && a.doctor?.profile));
const cardio = doctors.find((d) => d.specialty === "القلب والأوعية الدموية")!;
const doctors2 = doctors;
const cardioAppts = await ls.getAppointments({ date: today, doctorId: cardio.id });
check("filter by doctor", cardioAppts.length === 8);

// status transitions
const waiting = cardioAppts.find((a) => a.status === "waiting")!;
const updated = await ls.updateAppointment(waiting.id, { status: "in_consultation" });
check("transition waiting -> in_consultation", updated.status === "in_consultation");

// payment
const paid = await ls.updateAppointment(waiting.id, { payment_status: "paid", payment_method: "cash" });
check("payment toggles + paid_at set", paid.payment_status === "paid" && Boolean(paid.paid_at));

// walk-in registration
const p = await ls.createPatient({ full_name: "مريض تجربة", phone: "+20 199 999 0000" });
const dup = await ls.createPatient({ full_name: "مريض تجربة ثانية", phone: "+20 199 999 0000" });
check("createPatient dedupes by phone", p.id === dup.id);
const appt = await ls.createAppointment({
  patient_id: p.id,
  doctor_id: cardio.id,
  appointment_date: today,
  time_slot: "16:30",
  status: "waiting",
});
check("walk-in appointment created", appt.patient?.full_name === "مريض تجربة");

// schedule blocks with capacity override
const blk = await ls.createScheduleBlock({
  doctor_id: cardio.id,
  block_date: today,
  start_time: "11:00",
  end_time: "12:00",
  type: "emergency",
  reason: "test block",
  cancelAffected: true,
});
const afterBlock = await ls.getAppointments({ date: today, doctorId: cardio.id });
const cancelledInRange = afterBlock.filter(
  (a) => a.time_slot >= "11:00" && a.time_slot < "12:00" && a.status === "cancelled",
);
check("capacity override cancels affected", cancelledInRange.length >= 1);
await ls.deleteScheduleBlock(blk.id);
check("block deleted", (await ls.getScheduleBlocks({ date: today, doctorId: cardio.id })).every((b) => b.id !== blk.id));

// medical record upsert
const rec = await ls.upsertMedicalRecord({
  appointment_id: appt.id,
  diagnosis: "تشخيص تجربة",
  prescription: [{ id: "r1", medicine: "Test meds", dosage: "1 tab", frequency: "Once daily", duration: "5 days" }],
});
const rec2 = await ls.upsertMedicalRecord({
  appointment_id: appt.id,
  diagnosis: "تشخيص تجربة v2",
  prescription: [],
});
check("medical record upsert (not duplicate)", rec2.id === rec.id && rec2.diagnosis === "تشخيص تجربة v2");

// patient history source
const records = await ls.getMedicalRecords();
check("records present", records.length >= 7);

// — أدوات الأدمن (صلاحيات كاملة) —
const newDoc = await ls.createDoctorWithProfile({
  full_name: "د. أدمن جديد",
  phone: "+20 100 000 0001",
  specialty: "النساء والتوليد",
  consultation_fee: 450,
});
check("createDoctorWithProfile joins profile", Boolean(newDoc.profile?.full_name) && newDoc.specialty === "النساء والتوليد");
await ls.updateDoctor(newDoc.id, {
  full_name: "د. أدمن معدّل",
  phone: "+20 100 000 0002",
  specialty: "طب الأسنان",
  consultation_fee: 250,
});
const docsAfterUpdate = await ls.getDoctors();
const updatedDoc = docsAfterUpdate.find((d) => d.id === newDoc.id)!;
check("updateDoctor changes identity+specialty+fee", updatedDoc.profile?.full_name === "د. أدمن معدّل" && updatedDoc.specialty === "طب الأسنان" && updatedDoc.consultation_fee === 250);

const adminAppt = await ls.createAppointment({
  patient_id: p.id,
  doctor_id: newDoc.id,
  appointment_date: today,
  time_slot: "10:30",
  status: "scheduled",
});
const fullPatched = await ls.updateAppointment(adminAppt.id, {
  doctor_id: doctors2[0]!.id,
  appointment_date: addDays(today, 3),
  time_slot: "15:30",
  status: "completed",
  payment_status: "paid",
});
check("full appointment patch (doctor/date/slot/status/payment)", fullPatched.doctor_id === doctors2[0]!.id && fullPatched.appointment_date === addDays(today, 3) && fullPatched.time_slot === "15:30" && fullPatched.status === "completed" && fullPatched.payment_status === "paid");

await ls.upsertMedicalRecord({ appointment_id: adminAppt.id, diagnosis: "سجل للحذف", prescription: [] });
const recBefore = (await ls.getMedicalRecords()).filter((r) => r.appointment_id === adminAppt.id).length;
await ls.deleteAppointment(adminAppt.id);
const recAfter = (await ls.getMedicalRecords()).filter((r) => r.appointment_id === adminAppt.id).length;
check("deleteAppointment cascades records", recBefore === 1 && recAfter === 0);

// هوية مريض
await ls.updateProfile(p.id, { full_name: "مريض تجربة — هوية جديدة", phone: "+20 199 999 1111" });
const pts = await ls.getPatients();
check("updateProfile changes identity", pts.find((x) => x.id === p.id)?.full_name === "مريض تجربة — هوية جديدة");

// حذف طبيب بكل شيء متعلق به
await ls.deleteDoctor(newDoc.id);
const docsFinal = await ls.getDoctors();
const apptsFinal = await ls.getAppointments({ doctorId: newDoc.id });
check("deleteDoctor removes doctor", docsFinal.every((d) => d.id !== newDoc.id));
check("deleteDoctor cascades appointments", apptsFinal.length === 0);

// إعدادات / هوية العيادة
await ls.saveSetting("branding", { shortName: "عيادة تجريبية", fullName: "عيادة تجريبية — المركز الطبي" });
const settings = await ls.getSettings();
check("save/get settings roundtrip", (settings["branding"] as { shortName: string }).shortName === "عيادة تجريبية");

// حذف مريض بالكامل
const pAppts = await ls.getAppointments({ patientId: p.id });
await ls.deletePatient(p.id);
const pApptsAfter = await ls.getAppointments({ patientId: p.id });
const pGone = (await ls.getPatients()).every((x) => x.id !== p.id);
check("deletePatient cascades (" + pAppts.length + " appts)", pApptsAfter.length === 0 && pGone);

// reset
await ls.resetAll();
check("reset clears", (await ls.getDoctors()).length === 0);
}

async function main() {
  await storeTests();
  console.log(failures === 0 ? "\n🎉 All smoke tests passed" : `\n💥 ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
}
main();
