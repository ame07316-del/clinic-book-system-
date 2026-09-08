import type { Metadata } from "next";
import "./globals.css";
import { AppDataProvider } from "@/lib/data";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "MediCore — Clinic Booking & Queue Management",
    template: "%s · MediCore",
  },
  description:
    "Production-grade demo of a medical center booking & queue management system: realtime reception queue, doctor consultation workspace with e-prescriptions, and a patient booking portal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#f6f8fa] font-sans text-slate-900">
        <AppDataProvider>{children}</AppDataProvider>
        <Toaster />
      </body>
    </html>
  );
}
