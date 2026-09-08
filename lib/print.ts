import { DEFAULT_BRANDING } from "@/lib/branding";
import type { Appointment, Branding, MedicalRecord, PaymentMethod } from "@/lib/types";
import { formatCurrency, formatDateLong, formatTimeSlot } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  نوافذ الطباعة — الوصفة الطبية (PDF عبر الطباعة) وإيصال الدفع.      */
/*  تقرأ هوية العيادة من الإعدادات (داشبورد الأدمن).                   */
/* ------------------------------------------------------------------ */

function baseDoc(title: string, body: string): string {
  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Cairo", "Segoe UI", Tahoma, system-ui, sans-serif;
    color: #0f172a; background: #f8fafc; padding: 32px;
  }
  .sheet {
    max-width: 780px; margin: 0 auto; background: #fff;
    border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
    box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
  }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { border: none; box-shadow: none; border-radius: 0; max-width: none; }
    .no-print { display: none !important; }
  }
  .toolbar {
    max-width: 780px; margin: 0 auto 16px; display: flex;
    justify-content: flex-start; gap: 8px;
  }
  .btn {
    font: inherit; font-weight: 700; font-size: 14px; cursor: pointer;
    padding: 9px 18px; border-radius: 8px; border: 1px solid #cbd5e1;
    background: #fff; color: #0f172a;
  }
  .btn.primary { background: #0d9488; border-color: #0d9488; color: #fff; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button class="btn primary" onclick="window.print()">طباعة / حفظ PDF</button>
    <button class="btn" onclick="window.close()">إغلاق</button>
  </div>
  <div class="sheet">${body}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`;
}

function header(b: Branding): string {
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; padding:28px 36px 20px; border-bottom:3px solid #0d9488; background:linear-gradient(135deg,#f0fdfa,#ffffff);">
    <div style="display:flex; gap:14px; align-items:center;">
      <div style="width:52px;height:52px;border-radius:14px;background:#0d9488;display:flex;align-items:center;justify-content:center;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
      </div>
      <div>
        <div style="font-size:20px;font-weight:800;color:#0f172a;">${b.fullName}</div>
        <div style="font-size:12px;color:#64748b;">${b.tagline}</div>
      </div>
    </div>
    <div style="text-align:left;font-size:11px;color:#64748b;line-height:1.8;">
      ${b.address}<br/>${b.phone} · ${b.email}
    </div>
  </div>`;
}

function labelValue(label: string, value: string): string {
  return `<div>
    <div style="font-size:10px;color:#94a3b8;font-weight:700;">${label}</div>
    <div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:2px;">${value}</div>
  </div>`;
}

function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function printPrescription(
  appointment: Appointment,
  record: MedicalRecord | null,
  branding: Branding = DEFAULT_BRANDING,
): void {
  const CLINIC = branding;
  const doctor = appointment.doctor;
  const doctorName = doctor?.profile?.full_name ?? "الطبيب المعالج";
  const patient = appointment.patient;

  const medRows = (record?.prescription ?? [])
    .map(
      (m, i) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 12px;color:#0d9488;font-weight:800;width:34px;vertical-align:top;">${i + 1}.</td>
        <td style="padding:10px 12px;">
          <div style="font-weight:700;">${esc(m.medicine)} <span style="font-weight:500;color:#64748b;">· ${esc(m.dosage)}</span></div>
          ${m.instructions ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${esc(m.instructions)}</div>` : ""}
        </td>
        <td style="padding:10px 12px;white-space:nowrap;color:#334155;">${esc(m.frequency)}</td>
        <td style="padding:10px 12px;white-space:nowrap;color:#334155;">${esc(m.duration)}</td>
      </tr>`,
    )
    .join("");

  const body = `
  ${header(branding)}
  <div style="padding:28px 36px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:22px;font-weight:800;color:#0d9488;">وصفة طبية</div>
      <div style="font-size:12px;color:#64748b;">${formatDateLong(appointment.appointment_date)}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:22px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      ${labelValue("المريض", esc(patient?.full_name) || "—")}
      ${labelValue("الهاتف", esc(patient?.phone) || "—")}
      ${labelValue("الموعد", formatTimeSlot(appointment.time_slot))}
      ${labelValue("رقم السجل", `#${appointment.id.slice(0, 8).toUpperCase()}`)}
    </div>
    <div style="margin-top:24px;">
      <div style="font-size:10px;color:#94a3b8;font-weight:700;">التشخيص والملاحظات الإكلينيكية</div>
      <div style="margin-top:6px;font-size:14px;line-height:1.9;color:#0f172a;">${esc(record?.diagnosis) || "—"}</div>
    </div>
    <div style="margin-top:24px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#f0fdfa;border-bottom:1px solid #e2e8f0;">
            <th style="padding:10px 12px;text-align:right;font-size:10px;color:#0f766e;"></th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;color:#0f766e;">الدواء</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;color:#0f766e;">الجرعة</th>
            <th style="padding:10px 12px;text-align:right;font-size:10px;color:#0f766e;">المدة</th>
          </tr>
        </thead>
        <tbody>${medRows || `<tr><td colspan="4" style="padding:16px;color:#94a3b8;font-size:13px;">لا توجد أدوية بهذه الوصفة.</td></tr>`}</tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:56px;padding-bottom:36px;">
      <div style="font-size:11px;color:#94a3b8;line-height:1.8;">
        هذه الوصفة مُنشأة إلكترونيًا من ${CLINIC.fullName}.<br/>
        يُرجى التحقق من أسماء الأدوية قبل الصرف.
      </div>
      <div style="text-align:center;">
        <div style="width:210px;border-top:1.5px solid #0f172a;padding-top:6px;font-size:13px;font-weight:700;">${esc(doctorName)}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">${esc(doctor?.specialty) || ""} · ترخيص #${(appointment.doctor_id ?? "XX").slice(0, 8).toUpperCase()}</div>
      </div>
    </div>
  </div>`;

  openWindow("الوصفة الطبية", baseDoc(`وصفة طبية — ${patient?.full_name ?? "مريض"}`, body));
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "نقدي",
  card: "بطاقة",
  insurance: "تأمين",
  upi: "محفظة إلكترونية",
};

export function printReceipt(appointment: Appointment, branding: Branding = DEFAULT_BRANDING): void {
  const doctor = appointment.doctor;
  const fee = doctor?.consultation_fee ?? 0;
  const body = `
  ${header(branding)}
  <div style="padding:28px 36px 36px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:22px;font-weight:800;color:#0f172a;">إيصال دفع</div>
      <div style="font-size:12px;color:#64748b;">إيصال #RC-${appointment.id.slice(0, 8).toUpperCase()}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:22px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      ${labelValue("المريض", esc(appointment.patient?.full_name) || "—")}
      ${labelValue("الطبيب", esc(doctor?.profile?.full_name) || "—")}
      ${labelValue("التاريخ", formatDateLong(appointment.appointment_date))}
      ${labelValue("الوقت", formatTimeSlot(appointment.time_slot))}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:26px;border-top:1px solid #e2e8f0;">
      <tr>
        <td style="padding:12px 4px;color:#334155;">كشف — ${esc(doctor?.specialty) || "تخصص"}</td>
        <td style="padding:12px 4px;text-align:left;font-weight:600;">${formatCurrency(fee)}</td>
      </tr>
      <tr>
        <td style="padding:12px 4px;color:#64748b;">طريقة الدفع</td>
        <td style="padding:12px 4px;text-align:left;color:#334155;">${appointment.payment_method ? METHOD_LABEL[appointment.payment_method] : "—"}</td>
      </tr>
      <tr style="border-top:2px solid #0f172a;">
        <td style="padding:14px 4px;font-weight:800;font-size:15px;">إجمالي المدفوع</td>
        <td style="padding:14px 4px;text-align:left;font-weight:800;font-size:18px;color:#0d9488;">${formatCurrency(fee)}</td>
      </tr>
    </table>
    <div style="margin-top:14px;display:inline-block;background:#f0fdfa;color:#0f766e;font-weight:700;font-size:12px;padding:6px 14px;border-radius:999px;border:1px solid #99f6e4;">
      ✓ مدفوع بالكامل — شكرًا لكم
    </div>
    <div style="margin-top:40px;font-size:11px;color:#94a3b8;">
      إيصال تجريبي من نظام ميدي كور — غير صالح للأغراض الضريبية.
    </div>
  </div>`;

  openWindow("إيصال الدفع", baseDoc(`إيصال — ${appointment.patient?.full_name ?? "مريض"}`, body));
}

function openWindow(title: string, html: string): void {
  const win = window.open("", "_blank", "width=880,height=1000");
  if (!win) {
    alert("من فضلك اسمح بالنوافذ المنبثقة لطباعة المستندات.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = title;
}
