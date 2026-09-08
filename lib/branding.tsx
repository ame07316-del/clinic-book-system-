"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onChange } from "@/lib/data/bus";
import { useAppData } from "@/lib/data";
import type { Branding } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  هوية العيادة — تُحمَّل من app_settings عبر طبقة البيانات، وتُعدَّل  */
/*  من داشبورد الأدمن. كل الواجهة ومستندات الطباعة تقرأ من هنا.        */
/* ------------------------------------------------------------------ */

export const DEFAULT_BRANDING: Branding = {
  shortName: "ميديكور",
  fullName: "ميدي كور — المركز الطبي",
  tagline: "عيادات متعددة التخصصات وتحاليل",
  address: "124 شارع الصحة، المهندسين، القاهرة",
  phone: "+20 2 3300 1000",
  email: "care@medicore.health",
};

interface BrandingValue {
  branding: Branding;
  loading: boolean;
  save: (next: Branding) => Promise<void>;
  reset: () => Promise<void>;
}

const BrandingContext = createContext<BrandingValue>({
  branding: DEFAULT_BRANDING,
  loading: true,
  save: async () => {},
  reset: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { ds, mode } = useAppData();
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ds) return;
    let live = true;
    void ds
      .getSettings()
      .then((settings) => {
        if (!live) return;
        const saved = settings["branding"] as Partial<Branding> | undefined;
        if (saved) setBranding({ ...DEFAULT_BRANDING, ...saved });
      })
      .catch((e) => console.error("getSettings failed", e))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [ds, mode]);

  useEffect(() => {
    return onChange((table) => {
      if (table !== "settings" || !ds) return;
      void ds
        .getSettings()
        .then((settings) => {
          const saved = settings["branding"] as Partial<Branding> | undefined;
          setBranding(saved ? { ...DEFAULT_BRANDING, ...saved } : DEFAULT_BRANDING);
        })
        .catch(() => {});
    });
  }, [ds]);

  const save = useCallback(
    async (next: Branding) => {
      if (!ds) return;
      await ds.saveSetting("branding", next);
      setBranding(next);
    },
    [ds],
  );

  const reset = useCallback(async () => {
    if (!ds) return;
    await ds.saveSetting("branding", DEFAULT_BRANDING);
    setBranding(DEFAULT_BRANDING);
  }, [ds]);

  const value = useMemo(() => ({ branding, loading, save, reset }), [branding, loading, save, reset]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): BrandingValue {
  return useContext(BrandingContext);
}
