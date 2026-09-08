import type { Metadata } from "next";
import { DoctorWorkspace } from "@/components/doctor/doctor-workspace";

export const metadata: Metadata = {
  title: "Consultation Workspace",
  description: "Realtime waiting room feed and e-prescription builder.",
};

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DoctorWorkspace doctorId={id} />;
}
