import type { Appointment, MedicalRecord, PaymentMethod } from "@/lib/types";
import { formatCurrency, formatDateLong, formatTimeSlot } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Print window exporters — prescription (PDF via print) & receipt.   */
/*  Opens a standalone, print-styled document and calls window.print().*/
/* ------------------------------------------------------------------ */

const CLINIC = {
  name: "MediCore Medical Center",
  tagline: "Multi-specialty Clinic & Diagnostics",
  address: "124 Wellness Avenue, Suite 300, Springfield, IL 62701",
  phone: "+1 (555) 010-1000",
  email: "care@medicore.health",
};

function baseDoc(title: string, body: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif;
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
    justify-content: flex-end; gap: 8px;
  }
  .btn {
    font: inherit; font-weight: 600; font-size: 14px; cursor: pointer;
    padding: 9px 18px; border-radius: 8px; border: 1px solid #cbd5e1;
    background: #fff; color: #0f172a;
  }
  .btn.primary { background: #0d9488; border-color: #0d9488; color: #fff; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button class="btn primary" onclick="window.print()">Print / Save as PDF</button>
    <button class="btn" onclick="window.close()">Close</button>
  </div>
  <div class="sheet">${body}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`;
}

function header(): string {
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; padding:28px 36px 20px; border-bottom:3px solid #0d9488; background:linear-gradient(135deg,#f0fdfa,#ffffff);">
    <div style="display:flex; gap:14px; align-items:center;">
      <div style="width:52px;height:52px;border-radius:14px;background:#0d9488;display:flex;align-items:center;justify-content:center;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
      </div>
      <div>
        <div style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-.02em;">${CLINIC.name}</div>
        <div style="font-size:12px;color:#64748b;">${CLINIC.tagline}</div>
      </div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;line-height:1.6;">
      ${CLINIC.address}<br/>${CLINIC.phone} · ${CLINIC.email}
    </div>
  </div>`;
}

function labelValue(label: string, value: string): string {
  return `<div>
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;">${label}</div>
    <div style="font-size:14px;font-weight:600;color:#0f172a;margin-top:2px;">${value}</div>
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
): void {
  const doctor = appointment.doctor;
  const doctorName = doctor?.profile?.full_name ?? "Consulting Physician";
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
  ${header()}
  <div style="padding:28px 36px 8px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:22px;font-weight:800;color:#0d9488;letter-spacing:.01em;">℞ Prescription</div>
      <div style="font-size:12px;color:#64748b;">${formatDateLong(appointment.appointment_date)}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:22px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      ${labelValue("Patient", esc(patient?.full_name) || "—")}
      ${labelValue("Phone", esc(patient?.phone) || "—")}
      ${labelValue("Appointment", `${formatTimeSlot(appointment.time_slot)}`)}
      ${labelValue("Record ID", `#${appointment.id.slice(0, 8).toUpperCase()}`)}
    </div>
    <div style="margin-top:24px;">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;font-weight:700;">Diagnosis / Clinical Notes</div>
      <div style="margin-top:6px;font-size:14px;line-height:1.6;color:#0f172a;">${esc(record?.diagnosis) || "—"}</div>
    </div>
    <div style="margin-top:24px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#f0fdfa;border-bottom:1px solid #e2e8f0;">
            <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#0f766e;"></th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#0f766e;">Medicine</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#0f766e;">Frequency</th>
            <th style="padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#0f766e;">Duration</th>
          </tr>
        </thead>
        <tbody>${medRows || `<tr><td colspan="4" style="padding:16px;color:#94a3b8;font-size:13px;">No medications prescribed.</td></tr>`}</tbody>
      </table>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:56px;padding-bottom:36px;">
      <div style="font-size:11px;color:#94a3b8;">
        This prescription is generated electronically by ${CLINIC.name}.<br/>
        Please verify medicine names before dispensing.
      </div>
      <div style="text-align:center;">
        <div style="width:210px;border-top:1.5px solid #0f172a;padding-top:6px;font-size:13px;font-weight:700;">${esc(doctorName)}</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">${esc(doctor?.specialty) || ""} · License #${(appointment.doctor_id ?? "XX").slice(0, 8).toUpperCase()}</div>
      </div>
    </div>
  </div>`;

  openWindow("Prescription", baseDoc(`Prescription — ${patient?.full_name ?? "Patient"}`, body));
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  insurance: "Insurance",
  upi: "UPI / Digital",
};

export function printReceipt(appointment: Appointment): void {
  const doctor = appointment.doctor;
  const fee = doctor?.consultation_fee ?? 0;
  const body = `
  ${header()}
  <div style="padding:28px 36px 36px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:22px;font-weight:800;color:#0f172a;">Payment Receipt</div>
      <div style="font-size:12px;color:#64748b;">Receipt #RC-${appointment.id.slice(0, 8).toUpperCase()}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:22px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
      ${labelValue("Patient", esc(appointment.patient?.full_name) || "—")}
      ${labelValue("Doctor", esc(doctor?.profile?.full_name) || "—")}
      ${labelValue("Date", formatDateLong(appointment.appointment_date))}
      ${labelValue("Time", formatTimeSlot(appointment.time_slot))}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:26px;border-top:1px solid #e2e8f0;">
      <tr>
        <td style="padding:12px 4px;color:#334155;">Consultation — ${esc(doctor?.specialty) || "Specialist"}</td>
        <td style="padding:12px 4px;text-align:right;font-weight:600;">${formatCurrency(fee)}</td>
      </tr>
      <tr>
        <td style="padding:12px 4px;color:#64748b;">Payment method</td>
        <td style="padding:12px 4px;text-align:right;color:#334155;">${appointment.payment_method ? METHOD_LABEL[appointment.payment_method] : "—"}</td>
      </tr>
      <tr style="border-top:2px solid #0f172a;">
        <td style="padding:14px 4px;font-weight:800;font-size:15px;">Total Paid</td>
        <td style="padding:14px 4px;text-align:right;font-weight:800;font-size:18px;color:#0d9488;">${formatCurrency(fee)}</td>
      </tr>
    </table>
    <div style="margin-top:14px;display:inline-block;background:#f0fdfa;color:#0f766e;font-weight:700;font-size:12px;padding:6px 14px;border-radius:999px;border:1px solid #99f6e4;">
      ✓ PAID IN FULL — Thank you
    </div>
    <div style="margin-top:40px;font-size:11px;color:#94a3b8;">
      Simulated receipt generated by the MediCore demo. Not valid for tax purposes.
    </div>
  </div>`;

  openWindow("Receipt", baseDoc(`Receipt — ${appointment.patient?.full_name ?? "Patient"}`, body));
}

function openWindow(title: string, html: string): void {
  const win = window.open("", "_blank", "width=880,height=1000");
  if (!win) {
    alert("Please allow pop-ups to print documents.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = title;
}
