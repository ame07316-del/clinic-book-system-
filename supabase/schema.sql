-- ============================================================================
-- MediCore — Clinic Booking & Queue Management
-- Supabase schema. Run this whole file once in the Supabase SQL Editor.
-- It is idempotent: safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (auth users map 1:1 in production; the demo inserts rows directly)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  role       text not null default 'patient'
             check (role in ('doctor', 'receptionist', 'patient')),
  phone      text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- doctors
-- ---------------------------------------------------------------------------
create table if not exists public.doctors (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles (id) on delete set null,
  specialty        text not null,
  consultation_fee numeric(10, 2) not null default 0 check (consultation_fee >= 0),
  created_at       timestamptz not null default now()
);

create index if not exists doctors_specialty_idx on public.doctors (specialty);

-- ---------------------------------------------------------------------------
-- appointments — the realtime-hot table
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.profiles (id) on delete cascade,
  doctor_id        uuid not null references public.doctors (id) on delete cascade,
  appointment_date date not null,
  time_slot        text not null,           -- 'HH:MM' 24h
  status           text not null default 'scheduled'
                   check (status in ('scheduled', 'waiting', 'in_consultation', 'completed', 'cancelled')),
  reason           text,
  payment_status   text not null default 'pending' check (payment_status in ('pending', 'paid')),
  payment_method   text check (payment_method in ('cash', 'card', 'insurance', 'upi')),
  paid_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists appointments_doctor_date_idx
  on public.appointments (doctor_id, appointment_date);
create index if not exists appointments_patient_idx on public.appointments (patient_id);
create index if not exists appointments_date_idx on public.appointments (appointment_date);

-- ---------------------------------------------------------------------------
-- medical_records — one per appointment; prescription stored as JSONB array
-- ---------------------------------------------------------------------------
create table if not exists public.medical_records (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  diagnosis      text,
  prescription   jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists medical_records_appointment_idx
  on public.medical_records (appointment_id);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists medical_records_touch on public.medical_records;
create trigger medical_records_touch
  before update on public.medical_records
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- schedule_blocks — Dynamic Slot Creator (breaks / emergencies / overrides)
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_blocks (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references public.doctors (id) on delete cascade,
  block_date date not null,
  start_time text not null,                 -- 'HH:MM'
  end_time   text not null,                 -- 'HH:MM'
  type       text not null default 'break' check (type in ('break', 'emergency', 'custom')),
  reason     text,
  created_at timestamptz not null default now()
);

create index if not exists schedule_blocks_doctor_date_idx
  on public.schedule_blocks (doctor_id, block_date);

-- ---------------------------------------------------------------------------
-- Row Level Security.
-- DEMO DEFAULT: full anonymous access so the publishable key can drive the
-- app without auth. For production, replace these with policies scoped to
-- authenticated roles (e.g. `auth.jwt() ->> 'role'`).
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.doctors         enable row level security;
alter table public.appointments    enable row level security;
alter table public.medical_records enable row level security;
alter table public.schedule_blocks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','doctors','appointments','medical_records','schedule_blocks']
  loop
    execute format('drop policy if exists "demo_full_access" on public.%I', t);
    execute format(
      'create policy "demo_full_access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime — broadcast every change on the hot tables.
-- ---------------------------------------------------------------------------
alter table public.appointments    replica identity full;
alter table public.schedule_blocks replica identity full;
alter table public.medical_records replica identity full;

do $$
declare t text;
begin
  foreach t in array array['appointments','doctors','profiles','medical_records','schedule_blocks']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- already in the publication
    when undefined_object then
      raise warning 'Publication supabase_realtime not found — enable Realtime from the dashboard Replication page';
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- OPTIONAL: static seed (the app's "Seed Demo Data" button is preferred —
-- it generates dates relative to *today*). Uncomment to bootstrap anyway.
-- ---------------------------------------------------------------------------
-- insert into public.profiles (id, full_name, role, phone) values
--   ('00000000-0000-4000-8000-000000000001','Dr. Sarah Mitchell','doctor','+1 (555) 010-1101'),
--   ('00000000-0000-4000-8000-000000000002','Dr. James Okafor','doctor','+1 (555) 010-1102'),
--   ('00000000-0000-4000-8000-000000000101','Ava Thompson','patient','+1 (555) 231-4401');
--
-- insert into public.doctors (id, user_id, specialty, consultation_fee) values
--   ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','Cardiology',180),
--   ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','Pediatrics',120);
--
-- insert into public.appointments (patient_id, doctor_id, appointment_date, time_slot, status, reason) values
--   ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000011', current_date, '09:00', 'waiting', 'Cardiac screening');
