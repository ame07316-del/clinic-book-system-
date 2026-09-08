import type { Metadata } from "next";
import { DoctorWorkspace } from "@/components/doctor/doctor-workspace";

export const metadata: Metadata = {
  title: "غرفة الكشفية",
  description: "قائمة انتظار حية ووصفة إلكترونية متكاملة.",
};

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DoctorWorkspace doctorId={id} />;
}
