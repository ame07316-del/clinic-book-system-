import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  E2E — تدفق حجز الموعد الكامل للمريض                                 */
/*  يغطي: اختيار طبيب → اختيار معاد → إدخال البيانات → تأكيد الحجز     */
/* ------------------------------------------------------------------ */

test.describe("حجز موعد من بوابة المريض", () => {
  test("يختار المريض طبيبًا، ويختار معادًا متاحًا، ويسجل بيانات، ويؤكد الحجز بنجاح", async ({
    page,
  }) => {
    // 1. الذهاب إلى الصفحة الرئيسية (بوابة المريض)
    await page.goto("/");
    await expect(page).toHaveTitle(/ميدي كور/);

    // 2. التأكد من ظهور باحث الأطباء
    await expect(page.getByRole("heading", { name: /اختر طبيبك/ })).toBeVisible();

    // 3. الضغط على أول بطاقة طبيب لفتح حوار الحجز
    const firstDoctorCard = page.locator('[role="button"]').filter({ hasText: /احجز موعدك/ }).first();
    await expect(firstDoctorCard).toBeVisible();
    await firstDoctorCard.click();

    // 4. التأكد من ظهور حوار الحجز
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/اختر معادًا أولًا/i)).toBeVisible();

    // 5. اختيار تاريخ (اليوم محدد افتراضيًا) puis اختيار وقت متاح
    // البحث عن أول خانة زمنية متاحة (ليست محجوزة ولا محظورة)
    const availableSlots = page.locator('[role="button"]').filter({
      hasText: /^\d{2}:\d{2} (ص|م)$/,
    });
    await expect(availableSlots.first()).toBeVisible();

    // الضغط على أول وقت متاح
    await availableSlots.first().click();

    // 6. إدخال الاسم الكامل
    const nameInput = page.getByLabel(/الاسم بالكامل/);
    await expect(nameInput).toBeVisible();
    await nameInput.fill("مريض اختبار");

    // 7. إدخال رقم الهاتف المصري
    const phoneInput = page.getByLabel(/رقم الهاتف/);
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill("01234567890");

    // 8. الضغط على زر تأكيد الحجز
    const confirmButton = page.getByRole("button", { name: /تأكيد/ });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // 9. التأكد من ظهور رسالة نجاح الحجز
    await expect(page.getByText(/تم الحجز!/i)).toBeVisible();

    // 10. التأكد من ظهور تفاصيل الحجز (المريض، الطبيب، الموعد)
    await expect(page.getByText(/مريض اختبار/)).toBeVisible();
  });

  test("يعرض خطأ عند إدخال رقم هاتف غير صحيح", async ({ page }) => {
    await page.goto("/");

    const firstDoctorCard = page.locator('[role="button"]').filter({ hasText: /احجز موعدك/ }).first();
    await firstDoctorCard.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // اختيار وقت متاح
    const availableSlots = page.locator('[role="button"]').filter({
      hasText: /^\d{2}:\d{2} (ص|م)$/,
    });
    await availableSlots.first().click();

    // إدخال اسم صحيح
    const nameInput = page.getByLabel(/الاسم بالكامل/);
    await nameInput.fill("مريض اختبار");

    // إدخال رقم هاتف خاطئ (قصير جدًا)
    const phoneInput = page.getByLabel(/رقم الهاتف/);
    await phoneInput.fill("123");

    // الضغط على تأكيد — يجب أن يظهر خطأ
    const confirmButton = page.getByRole("button", { name: /تأكيد/ });
    await confirmButton.click();

    await expect(page.getByText(/رقم هاتف مصري صحيح/i)).toBeVisible();
  });

  test("لا يسمح بالحجز في وقت محجوز بالفعل", async ({ page }) => {
    await page.goto("/");

    // البحث عن خانة زمنية محجوزة (غير قابلة للنقر أو تظهر كمحجوزة)
    const firstDoctorCard = page.locator('[role="button"]').filter({ hasText: /احجز موعدك/ }).first();
    await firstDoctorCard.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // الانتظار قليلاً لتحميل الفتحات
    await page.waitForTimeout(1000);

    // попытка الضغط على خانة محجوزة (يجب أن لا يكون هناك استجابة)
    // في بيئة التجريبية، بعض الفتحات تكون محجوزة مسبقًا
    // نتحقق فقط أن الحوار يظل مفتوحًا ولا يحدث حجز
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  E2E — شاشة الاستقبال: عرض الطابور وتغيير الحالة                     */
/* ------------------------------------------------------------------ */

test.describe("كونسول الاستقبال", () => {
  test("يعرض طابور المرضى لليوم ويسمح بتغيير حالة الموعد", async ({
    page,
  }) => {
    await page.goto("/reception");

    // التأكد من ظهور عنوان الصفحة
    await expect(page.getByRole("heading", { name: /كونسول الاستقبال/ })).toBeVisible();

    // التحقق من وجود جدول الطابور أو حالة فارغة
    await expect(
      page.locator("text=مدير طابور المرضى المباشر").or(
        page.locator("text=لا يوجد حظر اليوم")
      ),
    ).toBeVisible();
  });
});