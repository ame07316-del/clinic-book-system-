# MediCore — Medical Center Booking & Queue Management (Demo)

A production-grade **demo** of a full clinic operations platform:

- 🧾 **Patient / Booking Portal** — specialty & doctor finder, interactive date & time slot
  selector (fully booked / blocked slots grey out live), appointment tracking by phone.
- 🗂️ **Reception Console** — live patient queue manager (`Scheduled → Waiting → In
  Consultation → Completed`), dynamic slot creator (breaks / emergency windows / capacity
  override with auto-cancel), quick walk-in registration, payment collection toggle with
  printable receipts.
- 🩺 **Doctor Workspace** — realtime waiting-room feed, interactive consultation workspace
  with patient history, **e-prescription builder (JSONB)**, one-click **Print / PDF**
  prescription export, and a **Finish Consultation** button that updates the reception
  view in realtime.

> ⚠️ Demo application: payments/receipts are simulated and RLS is intentionally open.

---

## Tech stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Framework  | Next.js (App Router) + React 19 + TypeScript                  |
| Styling    | Tailwind CSS v4 (slate/teal/cyan healthcare SaaS theme)        |
| UI         | shadcn-style components (Radix primitives), Lucide icons       |
| Data       | Supabase (`@supabase/supabase-js`) + **Postgres Changes** realtime |
| Toasts     | sonner                                                         |

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm run dev                  # http://localhost:3000
```

`.env.local` (already included in this workspace):

```env
NEXT_PUBLIC_SUPABASE_URL=https://jpxyabjarezndnhrfhok.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## Connecting your Supabase project

1. Open the **SQL Editor** in the Supabase dashboard.
2. Run **`supabase/schema.sql`** — it creates `profiles`, `doctors`, `appointments`
   (with `payment_status`/`payment_method`), `medical_records` (JSONB prescriptions) and
   `schedule_blocks`, adds demo RLS policies, and adds the tables to the
   `supabase_realtime` publication.
3. Back in the app, open **⋮ → Settings & connection → Reconnect**.
4. Click **⋮ → Seed demo data** to populate 6 doctors, 16 patients, today's queue
   (completed / waiting / in-consultation / scheduled), records and blocks.

### Graceful demo fallback

On startup the app probes the `doctors` table. If Supabase is unreachable **or the schema
isn't provisioned yet**, it transparently switches to a **local demo backend**
(`localStorage`) that mirrors the schema 1:1 and simulates realtime — including
**cross-tab sync**, so opening Reception in one tab and the Doctor workspace in another
still demonstrates live queue updates. The header badge shows which backend is active
(`Live` = connected) and Settings explains how to go live.

## Realtime

`lib/data/supabase-adapter.ts` subscribes to Postgres Changes on `appointments`
(plus `doctors`, `profiles`, `medical_records`, `schedule_blocks`) on a single channel.
Events flow into a tiny internal bus (`lib/data/bus.ts`); React hooks
(`useAppointments`, etc.) refetch automatically — no page refreshes anywhere.

## Database schema

Matches the reference schema, extended for the demo features:

```
profiles        (id, full_name, role[doctor|receptionist|patient], phone, created_at)
doctors         (id, user_id → profiles, specialty, consultation_fee, created_at)
appointments    (id, patient_id → profiles, doctor_id → doctors, appointment_date,
                 time_slot, status[scheduled|waiting|in_consultation|completed|cancelled],
                 reason, payment_status[pending|paid], payment_method, paid_at, created_at)
medical_records (id, appointment_id ⚡unique, diagnosis, prescription jsonb,
                 created_at, updated_at)
schedule_blocks (id, doctor_id → doctors, block_date, start_time, end_time,
                 type[break|emergency|custom], reason, created_at)
```

`prescription` JSONB shape:

```json
[{ "id": "…", "medicine": "Amoxicillin", "dosage": "500 mg",
   "frequency": "Twice daily", "duration": "7 days",
   "instructions": "Take after food" }]
```

## Demo data & seeders

- **Seed Demo Data** lives in the header **⋮** menu and in **Settings**. It clears the
  demo tables and inserts a realistic dataset dated relative to *today* (so the queue is
  always "live"): completed morning visits with medical records, patients waiting right
  now, an in-consultation visit, upcoming scheduled slots, a lunch break block and an
  emergency window.
- **Clear All Data** wipes the same tables.

## Project layout

```
app/
  page.tsx              # patient portal (finder + booking + tracking)
  reception/page.tsx    # reception console
  doctor/page.tsx       # doctor picker
  doctor/[id]/page.tsx  # consultation workspace
components/
  ui/                   # shadcn-style primitives (button, dialog, select, …)
  shared/               # header, logo, badges, stat cards, settings dialog
  reception/            # queue table, quick register, slot blocker, payments
  doctor/               # waiting feed, consultation panel, prescription builder
  portal/               # hero, doctor explorer, booking dialog, my appointments
lib/
  data/                 # DataSource contract, Supabase adapter, local demo store, bus
  slots.ts              # slot engine (capacity, blocks, past-time rules)
  print.ts              # prescription / receipt print+PDF exporters
supabase/schema.sql     # full DB schema + RLS + realtime publication
```

## Production hardening checklist

- Replace the open demo RLS policies with role-scoped policies tied to `auth.uid()`.
- Add Supabase Auth (magic-link) and map `profiles.id = auth.id`.
- Move mutations behind Row Level Security-checked server actions / edge functions.
- Add uniqueness constraints to prevent double-booking races (e.g.
  `unique (doctor_id, appointment_date, time_slot) where status <> 'cancelled'`).
- Rate-limit the publishable key and enable leak protection in the dashboard.
