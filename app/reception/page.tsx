import type { Metadata } from "next";
import { ReceptionDashboard } from "@/components/reception/reception-dashboard";

export const metadata: Metadata = {
  title: "كونسول الاستقبال",
  description: "مدير طابور المرضى المباشر مع تتبع الحالات لحظيًا.",
};

export default function ReceptionPage() {
  return <ReceptionDashboard />;
}
