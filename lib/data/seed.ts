import type {
  AppointmentRow,
  BlockType,
  MedicalRecord,
  PaymentStatus,
  PrescriptionItem,
  Profile,
  ScheduleBlock,
  DoctorRow,
  AppointmentStatus,
} from "@/lib/types";
import { uid } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  البيانات التجريبية — أطباء ومرضى وطابور اليوم بمزيج واقعي          */
/*  من الحالات وسجلات طبية وحظر مواعيد.                                */
/* ------------------------------------------------------------------ */

interface DoctorSeed {
  name: string;
  specialty: string;
  fee: number;
  phone: string;
}

const DOCTORS: DoctorSeed[] = [
  { name: "د. سارة عبد الرحمن", specialty: "القلب والأوعية الدموية", fee: 700, phone: "+20 100 111 2201" },
  { name: "د. أحمد الشريف", specialty: "طب الأطفال", fee: 400, phone: "+20 100 111 2202" },
  { name: "د. مريم عادل", specialty: "الأمراض الجلدية", fee: 500, phone: "+20 100 111 2203" },
  { name: "د. محمود خليل", specialty: "جراحة العظام", fee: 550, phone: "+20 100 111 2204" },
  { name: "د. هبة مصطفى", specialty: "المخ والأعصاب", fee: 800, phone: "+20 100 111 2205" },
  { name: "د. كريم فؤاد", specialty: "الباطنة العامة", fee: 300, phone: "+20 100 111 2206" },
];

const PATIENT_NAMES: Array<[string, string]> = [
  ["أمنية جمال", "+20 101 234 4401"],
  ["محمود السيد", "+20 101 234 4402"],
  ["سلمى فارس", "+20 101 234 4403"],
  ["يوسف عادل", "+20 101 234 4404"],
  ["نور الهدى", "+20 101 234 4405"],
  ["عمر خالد", "+20 101 234 4406"],
  ["ملك أشرف", "+20 101 234 4407"],
  ["زياد طارق", "+20 101 234 4408"],
  ["حبيبة سمير", "+20 101 234 4409"],
  ["كريم مراد", "+20 101 234 4410"],
  ["جنى محمود", "+20 101 234 4411"],
  ["آسر حازم", "+20 101 234 4412"],
  ["رينيم صلاح", "+20 101 234 4413"],
  ["مصطفى وجيه", "+20 101 234 4414"],
  ["سلمى عصام", "+20 101 234 4415"],
  ["عبد الرحمن شريف", "+20 101 234 4416"],
];

function rx(
  medicine: string,
  dosage: string,
  frequency: string,
  duration: string,
  instructions?: string,
): PrescriptionItem {
  return { id: uid(), medicine, dosage, frequency, duration, instructions };
}

export interface SeedBundle {
  profiles: Profile[];
  doctors: DoctorRow[];
  appointments: AppointmentRow[];
  medical_records: MedicalRecord[];
  schedule_blocks: ScheduleBlock[];
}

export function buildSeedBundle(today: string, tomorrow: string): SeedBundle {
  const now = new Date().toISOString();

  const doctorProfiles: Profile[] = DOCTORS.map((d) => ({
    id: uid(),
    full_name: d.name,
    role: "doctor" as const,
    phone: d.phone,
    created_at: now,
  }));

  const patientProfiles: Profile[] = PATIENT_NAMES.map(([name, phone]) => ({
    id: uid(),
    full_name: name,
    role: "patient" as const,
    phone,
    created_at: now,
  }));

  const receptionist: Profile = {
    id: uid(),
    full_name: "ريهام سامي (الاستقبال)",
    role: "receptionist",
    phone: "+20 100 111 2000",
    created_at: now,
  };

  const doctors: DoctorRow[] = DOCTORS.map((d, i) => ({
    id: uid(),
    user_id: doctorProfiles[i]!.id,
    specialty: d.specialty,
    consultation_fee: d.fee,
  }));

  const profiles = [...doctorProfiles, ...patientProfiles, receptionist];

  const p = (name: string) => patientProfiles.find((x) => x.full_name === name)!.id;
  const d = (i: number) => doctors[i]!.id;

  interface RowSeed {
    doctor: number;
    patient: string;
    date: string;
    slot: string;
    status: AppointmentStatus;
    reason: string;
    payment: PaymentStatus;
    method?: "cash" | "card" | "insurance" | "upi";
    diagnosis?: string;
    prescription?: PrescriptionItem[];
  }

  const rows: RowSeed[] = [
    // — القلب والأوعية الدموية (د. سارة) —
    { doctor: 0, patient: "أمنية جمال", date: today, slot: "09:00", status: "completed", reason: "متابعة ضغط الدم", payment: "paid", method: "card", diagnosis: "ارتفاع ضغط الدم — المرحلة الأولى، تحت السيطرة. القراءة 128/82 والنبض 72.", prescription: [rx("أملوديبين", "5 مجم", "قرص واحد يوميًا (صباحًا)", "30 يوم", "يُشرب بكوب ماء كامل."), rx("أتورواستاتين", "20 مجم", "قرص قبل النوم", "30 يوم", "يُمنع عصير الجريب فروت مع الدواء.")] },
    { doctor: 0, patient: "محمود السيد", date: today, slot: "09:30", status: "completed", reason: "ألم بالصدر عند المجهود", payment: "paid", method: "insurance", diagnosis: "ألم صدر غير قلبي — سبب عضلي. رسم القلب سليم والإنزيمات سالبة.", prescription: [rx("إيبوبروفين", "400 مجم", "مرتين يوميًا", "5 أيام", "بعد الأكل مباشرة.")] },
    { doctor: 0, patient: "سلمى فارس", date: today, slot: "10:00", status: "completed", reason: "خفقان بالقلب", payment: "paid", method: "upi", diagnosis: "تسارع جيبي بسبب التوتر — لا حاجة لجهاز هولتر حاليًا.", prescription: [rx("مغنيسيوم", "200 مجم", "مرة واحدة يوميًا", "60 يوم")] },
    { doctor: 0, patient: "يوسف عادل", date: today, slot: "10:30", status: "waiting", reason: "فحص قلب دوري", payment: "pending" },
    { doctor: 0, patient: "نور الهدى", date: today, slot: "11:00", status: "waiting", reason: "قراءة ضغط مرتفعة بالصيدلية", payment: "pending" },
    { doctor: 0, patient: "عمر خالد", date: today, slot: "11:30", status: "scheduled", reason: "متابعة الكوليسترول", payment: "pending" },
    { doctor: 0, patient: "ملك أشرف", date: today, slot: "14:00", status: "scheduled", reason: "إرهاق بعد التعافي من فيروس كورونا", payment: "pending" },
    { doctor: 0, patient: "زياد طارق", date: today, slot: "14:30", status: "scheduled", reason: "تاريخ عائلي لأمراض القلب", payment: "pending" },

    // — طب الأطفال (د. أحمد) —
    { doctor: 1, patient: "حبيبة سمير", date: today, slot: "09:00", status: "completed", reason: "زيارة نماء دورية", payment: "paid", method: "cash", diagnosis: "طفلة سليمة — النمو عند المنحنى 60%. التطعيمات مكتملة.", prescription: [rx("فيتامين د3", "600 وحدة", "مرة واحدة يوميًا", "90 يوم", "مضغ مع الوجبات.")] },
    { doctor: 1, patient: "كريم مراد", date: today, slot: "09:30", status: "in_consultation", reason: "حرارة من يومين", payment: "pending" },
    { doctor: 1, patient: "جنى محمود", date: today, slot: "10:00", status: "waiting", reason: "كحة مستمرة", payment: "pending" },
    { doctor: 1, patient: "آسر حازم", date: today, slot: "10:30", status: "waiting", reason: "إفادة كشف طبي للمدرسة", payment: "paid", method: "card" },
    { doctor: 1, patient: "رينيم صلاح", date: today, slot: "14:00", status: "scheduled", reason: "ألم بالأذن", payment: "pending" },
    { doctor: 1, patient: "مصطفى وجيه", date: today, slot: "15:00", status: "scheduled", reason: "طفح بالذراعين", payment: "pending" },

    // — الأمراض الجلدية (د. مريم) —
    { doctor: 2, patient: "سلمى عصام", date: today, slot: "10:00", status: "completed", reason: "استشارة حبوب الوجه", payment: "paid", method: "card", diagnosis: "حبوب الوجه الالتهابية المتوسطة — الدرجة الثانية.", prescription: [rx("ترتينوين 0.1% كريم", "حجم حبة عدس", "مرة واحدة قبل النوم", "8 أسابيع", "على بشرة جافة وتجنب محيط العين."), rx("دوكسيسايكلين", "100 مجم", "مرة واحدة يوميًا", "6 أسابيع", "بماء كثير والجلوس 30 دقيقة بعده.")] },
    { doctor: 2, patient: "عبد الرحمن شريف", date: today, slot: "10:30", status: "waiting", reason: "تهيج جلدي (إكزيما)", payment: "pending" },
    { doctor: 2, patient: "أمنية جمال", date: today, slot: "11:30", status: "scheduled", reason: "فحص شامة", payment: "pending" },
    { doctor: 2, patient: "عمر خالد", date: today, slot: "15:30", status: "cancelled", reason: "استشارة ليزر", payment: "pending" },

    // — جراحة العظام (د. محمود) —
    { doctor: 3, patient: "زياد طارق", date: today, slot: "09:30", status: "completed", reason: "التواء الكاحل", payment: "paid", method: "insurance", diagnosis: "التواء كاحل خارجي — الدرجة الثانية، لا كسر بالأشعة. برتكول الراحة والتبريد.", prescription: [rx("نابروكسين", "250 مجم", "مرتين يوميًا", "7 أيام", "بعد الأكل."), rx("علاج طبيعي", "جلسة 45 دقيقة", "3 مرات أسبوعيًا", "4 أسابيع", "الحجز من الاستقبال.")] },
    { doctor: 3, patient: "رينيم صلاح", date: today, slot: "10:30", status: "waiting", reason: "ألم أسفل الظهر", payment: "pending" },
    { doctor: 3, patient: "مصطفى وجيه", date: today, slot: "11:00", status: "scheduled", reason: "ألم بالركبة أثناء الجري", payment: "pending" },

    // — المخ والأعصاب (د. هبة) —
    { doctor: 4, patient: "نور الهدى", date: today, slot: "13:00", status: "scheduled", reason: "شقيقة متكررة", payment: "pending" },
    { doctor: 4, patient: "آسر حازم", date: today, slot: "14:30", status: "scheduled", reason: "تنميل باليد اليسرى", payment: "pending" },

    // — الباطنة العامة (د. كريم) —
    { doctor: 5, patient: "يوسف عادل", date: today, slot: "13:30", status: "scheduled", reason: "تحري سبب الإرهاق", payment: "pending" },
    { doctor: 5, patient: "جنى محمود", date: tomorrow, slot: "09:00", status: "scheduled", reason: "إعادة قياس ضغط", payment: "pending" },
    { doctor: 5, patient: "كريم مراد", date: tomorrow, slot: "09:30", status: "scheduled", reason: "مراجعة تحاليل الغدة", payment: "pending" },
    { doctor: 0, patient: "سلمى فارس", date: tomorrow, slot: "10:00", status: "scheduled", reason: "إعادة فحص قلب", payment: "pending" },
  ];

  const appointments: AppointmentRow[] = rows.map((r) => ({
    id: uid(),
    patient_id: p(r.patient),
    doctor_id: d(r.doctor),
    appointment_date: r.date,
    time_slot: r.slot,
    status: r.status,
    reason: r.reason,
    payment_status: r.payment,
    payment_method: r.method ?? null,
    paid_at: r.payment === "paid" ? new Date(Date.now() - Math.random() * 5 * 3600_000).toISOString() : null,
    created_at: now,
  }));

  const medical_records: MedicalRecord[] = rows
    .filter((r) => r.diagnosis)
    .map((r) => {
      const appt = appointments.find(
        (a) => a.patient_id === p(r.patient) && a.time_slot === r.slot && a.appointment_date === r.date,
      )!;
      return {
        id: uid(),
        appointment_id: appt.id,
        diagnosis: r.diagnosis ?? null,
        prescription: r.prescription ?? [],
        created_at: now,
        updated_at: now,
      };
    });

  const schedule_blocks: ScheduleBlock[] = [
    {
      id: uid(),
      doctor_id: d(0),
      block_date: today,
      start_time: "13:00",
      end_time: "14:00",
      type: "break" as BlockType,
      reason: "استراحة غداء",
      created_at: now,
    },
    {
      id: uid(),
      doctor_id: d(1),
      block_date: today,
      start_time: "15:00",
      end_time: "16:00",
      type: "emergency" as BlockType,
      reason: "احتياطي طوارئ الأطفال",
      created_at: now,
    },
    {
      id: uid(),
      doctor_id: d(3),
      block_date: today,
      start_time: "11:30",
      end_time: "12:30",
      type: "custom" as BlockType,
      reason: "جولة مستشفى المدينة",
      created_at: now,
    },
  ];

  return {
    profiles,
    doctors,
    appointments,
    medical_records,
    schedule_blocks,
  };
}
