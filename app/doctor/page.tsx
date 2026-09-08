import type { Metadata } from "next";
import { DoctorPicker } from "@/components/doctor/doctor-picker";

export const metadata: Metadata = {
  title: "Doctor Dashboard",
  description: "Pick a doctor profile to open the consultation workspace.",
};

export default function DoctorIndexPage() {
  return <DoctorPicker />;
}
