import type { Metadata } from "next";
import { DoctorPicker } from "@/components/doctor/doctor-picker";

export const metadata: Metadata = {
  title: "لوحة الطبيب",
  description: "اختر ملف طبيب لفتح مساحة الكشفية.",
};

export default function DoctorIndexPage() {
  return <DoctorPicker />;
}
