import type { Metadata } from "next";
import { ReceptionDashboard } from "@/components/reception/reception-dashboard";

export const metadata: Metadata = {
  title: "Reception Console",
  description: "Live patient queue manager with realtime status tracking.",
};

export default function ReceptionPage() {
  return <ReceptionDashboard />;
}
