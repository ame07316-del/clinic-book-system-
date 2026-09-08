import type { Metadata } from "next";
import "./globals.css";
import { AppDataProvider } from "@/lib/data";
import { BrandingProvider } from "@/lib/branding";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "ميدي كور — حجز العيادات وإدارة الطوابير",
    template: "%s · ميدي كور",
  },
  description:
    "نظام تجريبي متكامل لإدارة المركز الطبي: طابور استقبال مباشر، غرفة كشفية للطبيب مع وصفات إلكترونية، وبوابة حجز للمريض — كل شيء بالتزامن الفوري.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#f6f8fa] font-sans text-slate-900">
        {/* خط القاهرة — يُحمَّل من المتصفح مع بدائل نظام آمنة لو تعذّر الوصول */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <AppDataProvider>
          <BrandingProvider>{children}</BrandingProvider>
        </AppDataProvider>
        <Toaster />
      </body>
    </html>
  );
}
