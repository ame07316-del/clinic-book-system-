import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "لوحة تحكم المطوّر",
  description: "صلاحيات كاملة: الأطباء، المرضى، المواعيد، السجلات، الحظر، وهوية العيادة.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
