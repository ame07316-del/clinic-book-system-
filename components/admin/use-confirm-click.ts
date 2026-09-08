"use client";

import { useEffect, useRef, useState } from "react";

/**
 * نمط تأكيد الحذف بضغطتين: أول ضغطة تُسلّح الزر (تحويله أحمر «تأكيد؟»)
 * لثلاث ثوانٍ، والضغطة الثانية تنفّذ الحذف فعليًا.
 */
export function useConfirmClick(timeoutMs = 3000) {
  const [armedId, setArmedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const click = (id: string, action: () => void): boolean => {
    if (armedId !== id) {
      setArmedId(id);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setArmedId(null), timeoutMs);
      return false;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmedId(null);
    action();
    return true;
  };

  return { armedId, click };
}
