"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Key, ShieldAlert, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  verifyAdminPin,
  isAdminUnlocked,
  clearAdminPin,
  setAdminPin,
} from "@/lib/security";

/* ------------------------------------------------------------------ */
/*  AdminPinGate — بوابة رقم سري للإجراءات الحساسة ولوحة الأدمن        */
/*  تتطلب إدخال PIN افتراضي (1234) قبل السماح بالدخول — للتجربة فقط   */
/* ------------------------------------------------------------------ */

export function AdminPinGate({
  children,
  onUnlock,
}: {
  children: React.ReactNode;
  onUnlock?: () => void;
}) {
  const [unlocked, setUnlocked] = useState<boolean>(isAdminUnlocked());
  const [pin, setPin] = useState("");
  const [showDialog, setShowDialog] = useState(!isAdminUnlocked());

  const handleUnlock = () => {
    if (verifyAdminPin(pin)) {
      setAdminPin(pin);
      setUnlocked(true);
      setShowDialog(false);
      onUnlock?.();
      toast.success("تم فتح لوحة الأدمن");
    } else {
      toast.error("رقم سري غير صحيح");
    }
  };

  if (!unlocked) {
    return (
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm text-center sm:text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 sm:justify-start">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              دخول لوحة الأدمن
            </DialogTitle>
            <DialogDescription>
              هذا القسم يحتوي على إجراءات حساسة (تعديل وحذف الأطباء والمرضى
              والمواعيد). من فضلك أدخل رقم السري للمتابعة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-pin">رقم السري</Label>
              <Input
                id="admin-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={6}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              الرقم الافتراضي للتجربة: <code className="font-mono">1234</code>
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              إغلاق
            </Button>
            <Button onClick={handleUnlock} disabled={pin.length < 4}>
              <Unlock className="mr-2 h-4 w-4" />
              فتح
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50/70 rounded-full px-3 py-1 border border-emerald-200">
        <Unlock className="h-3.5 w-3.5" /> لوحة الأدمن مفتوحة
      </div>
      <Button variant="outline" size="sm" onClick={() => {
        clearAdminPin();
        setUnlocked(false);
        setShowDialog(true);
      }}>
        <Key className="mr-1.5 h-3.5 w-3.5" /> قفل اللوحة
      </Button>
      {children}
    </div>
  );
}