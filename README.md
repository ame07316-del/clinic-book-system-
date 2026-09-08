# ميدي كور — نظام حجز العيادات وإدارة الطوابير (نسخة تجريبية)

نظام **تجريبي** متكامل لإدارة شؤون المركز الطبي:

- 🧾 **بوابة المريض / الحجز** — باحث تخصصات وأطباء، منتقي تاريخ ووقت تفاعلي (المعادات الممتلئة
  والمحجوبة تتشطب لحظيًا)، ومتابعة الموعد برقم الهاتف.
- 🗂️ **كونسول الاستقبال** — مدير طابور المرضى المباشر (`محجوز ← في الانتظار ← داخل الكشفية ←
  تم الكشف`)، منع المواعيد الديناميكي (استراحات / نوافذ طوارئ / تجاوز سعة مع إلغاء تلقائي)،
  تسجيل سريع للمرضى الفوريين، وتحصيل الدفع مع إيصالات قابلة للطباعة.
- 🩺 **غرفة الكشفية** — قائمة انتظار حية للطبيب، مساحة كشفية تفاعلية مع السجل الطبي للمريض،
  **باني وصفة إلكترونية (JSONB)**، تصدير الوصفة **طباعة/PDF** بضغطة، وزر **إنهاء الكشفية**
  الذي يحدّث شاشة الاستقبال لحظيًا.

> ⚠️ تطبيق تجريبي: المدفوعات والإيصالات محاكاة، وصلاحيات RLS مفتوحة عمدًا.
> الواجهة بالكامل بالعربية مع دعم RTL (خط Cairo)، والعملة بالجنيه المصري.

---

## التقنيات

| الطبقة      | الاختيار                                                        |
| ----------- | --------------------------------------------------------------- |
| الإطار      | Next.js (App Router) + React 19 + TypeScript                     |
| التنسيق     | Tailwind CSS v4 (ثيم طبي slate/teal/cyan بدعم RTL)               |
| الواجهة     | مكونات بأسلوب shadcn (Radix primitives) + أيقونات Lucide         |
| البيانات    | Supabase (`@supabase/supabase-js`) + Postgres Changes (Realtime) |
| الإشعارات   | sonner (بدعم RTL)                                                |

## التشغيل السريع

```bash
npm install
cp .env.example .env.local   # املأ رابط Supabase والمفتاح العام
npm run dev                  # http://localhost:3000
```

`.env.local` (موجود بالفعل بمساحة العمل):

```env
NEXT_PUBLIC_SUPABASE_URL=https://jpxyabjarezndnhrfhok.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## ربط مشروع Supabase

1. افتح **SQL Editor** في لوحة تحكم Supabase.
2. نفّذ **`supabase/schema.sql`** — ينشئ جداول `profiles` و`doctors` و`appointments`
   (بحالة الدفع وطرقه) و`medical_records` (وصفات JSONB) و`schedule_blocks`، ويضيف سياسات RLS
   التجريبية، ويضيف الجداول لنشر `supabase_realtime`.
3. ارجع للتطبيق: **⋮ ← الإعدادات والاتصال ← إعادة الاتصال**.
4. اضغط **⋮ ← تحميل بيانات تجريبية** لتعبئة 6 أطباء و16 مريضًا وطابور اليوم
   (تم الكشف / في الانتظار / داخل الكشفية / محجوز) وسجلات وحظر مواعيد.

### الوضع التجريبي الاحتياطي

عند التشغيل يجرّب التطبيق الاستعلام عن جدول `doctors`. لو Supabase غير متاح **أو السكيما
لم تُنشأ بعد**، يتحول شفافية إلى **قاعدة بيانات تجريبية محلية** (`localStorage`) مطابقة
للسكيما 1:1 مع محاكاة Realtime — بما فيها **المزامنة بين التابات**، ففتح الاستقبال في تاب
وغرفة الكشفية في تاب آخر يُظهر تحديثات الطابور الحية. شارة الهيدر تُظهر القاعدة النشطة
(`مباشر` = متصل)، وشاشة الإعدادات تشرح خطوات التشغيل على Supabase.

## الـ Realtime

`lib/data/supabase-adapter.ts` يشترك في Postgres Changes على جدول `appointments`
(كذلك `doctors` و`profiles` و`medical_records` و`schedule_blocks`) على قناة واحدة.
الأحداث تتدفق إلى ناقل داخلي صغير (`lib/data/bus.ts`)، وخطافات React
(`useAppointments` إلخ) تعيد الجلب تلقائيًا — من غير أي تحديث صفحات.

## سكيما قاعدة البيانات

مطابقة للسكيما المرجعية مع امتدادات لميزات العرض:

```
profiles        (id, full_name, role[doctor|receptionist|patient], phone, created_at)
doctors         (id, user_id ← profiles, specialty, consultation_fee, created_at)
appointments    (id, patient_id ← profiles, doctor_id ← doctors, appointment_date,
                 time_slot, status[scheduled|waiting|in_consultation|completed|cancelled],
                 reason, payment_status[pending|paid], payment_method, paid_at, created_at)
medical_records (id, appointment_id ⚡unique, diagnosis, prescription jsonb,
                 created_at, updated_at)
schedule_blocks (id, doctor_id ← doctors, block_date, start_time, end_time,
                 type[break|emergency|custom], reason, created_at)
```

شكل الـ `prescription` (JSONB):

```json
[{ "id": "…", "medicine": "أوجمنتين", "dosage": "1 جم",
   "frequency": "مرتين يوميًا", "duration": "7 أيام",
   "instructions": "بعد الأكل" }]
```

## البيانات التجريبية والـ Seeders

- زر **تحميل البيانات التجريبية** في قائمة الهيدر **⋮** وفي **الإعدادات**. يمسح الجداول
  التجريبية ويُدخل مجموعة واقعية بتواريخ نسبية لـ *اليوم* (فالطابور دايمًا «حي»): كشوفيات
  صباحية منتهية بسجلاتها، مرضى في الانتظار الآن، كشفية جارية، معادات قادمة، استراحة غداء
  ونافذة طوارئ.
- **مسح كل البيانات** يمسح نفس الجداول.

## هيكل المشروع

```
app/
  page.tsx              # بوابة المريض (الباحث + الحجز + المتابعة)
  reception/page.tsx    # كونسول الاستقبال
  doctor/page.tsx       # قائمة الأطباء
  doctor/[id]/page.tsx  # غرفة الكشفية
components/
  ui/                   # مكونات أساسية بأسلوب shadcn (button, dialog, select, …)
  shared/               # الهيدر، اللوجو، الشارات، كروت الإحصائيات، الإعدادات
  reception/            # جدول الطابور، التسجيل السريع، حظر المواعيد، الدفع
  doctor/               # قائمة الانتظار، مساحة الكشفية، باني الوصفة
  portal/               # الهيرو، باحث الأطباء، حوار الحجز، مواعيدي
lib/
  data/                 # عقد DataSource، محول Supabase، المخزن التجريبي، الناقل
  slots.ts              # محرك المعادات (السعة، الحظر، قواعد الوقت الفائت)
  print.ts              # مصدّرات طباعة/PDF للوصفة والإيصال
supabase/schema.sql     # السكيما الكاملة + RLS + نشر Realtime
```

## الاختبارات

```bash
npm run test:smoke   # 28 اختبار دخان على محرك المعادات والسيد والمخزن المحلي
```

## قائمة تحصين الإنتاج

- استبدل سياسات RLS المفتوحة بسياسات مربوطة بالأدوار عبر `auth.uid()`.
- أضف Supabase Auth (رابط سحري) واربط `profiles.id = auth.id`.
- انقل عمليات الكتابة إلى Server Actions / Edge Functions مع فحوص RLS.
- أضف قيود تفراد لمنع الحجز المزدوج مثل
  `unique (doctor_id, appointment_date, time_slot) where status <> 'cancelled'`.
- فعّل حماية تسريب المفاتيح وحد المعدل للمفتاح العام من لوحة التحكم.
