"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarPlus,
  LayoutDashboard,
  MoreVertical,
  Settings2,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { SettingsDialog, useDemoActions } from "@/components/shared/settings-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppData } from "@/lib/data";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "بوابة المريض", icon: CalendarPlus },
  { href: "/reception", label: "الاستقبال", icon: LayoutDashboard },
  { href: "/doctor", label: "الطبيب", icon: Stethoscope },
];

export function SiteHeader({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();
  const { mode } = useAppData();
  const { seed, seeding } = useDemoActions();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="الصفحة الرئيسية">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-teal-50 text-teal-700 ring-1 ring-teal-100"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <LiveIndicator mode={mode} className="hidden sm:inline-flex" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="قائمة العرض التجريبي">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-teal-500" /> أدوات العرض التجريبي
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void seed()} disabled={seeding}>
                <Sparkles className={seeding ? "animate-pulse" : ""} />
                {seeding ? "جارٍ تحميل البيانات…" : "تحميل بيانات تجريبية"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <Settings2 /> الإعدادات والاتصال
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* تنقل الموبايل */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                active ? "bg-teal-50 text-teal-700" : "text-slate-500",
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
