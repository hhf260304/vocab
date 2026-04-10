// app/settings/ChangePasswordSection.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/actions/auth";

export default function ChangePasswordSection() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword(oldPassword, newPassword);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">修改密碼</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
        <div className="flex flex-col gap-1">
          <Label htmlFor="old-password" className="text-sm">目前密碼</Label>
          <Input
            id="old-password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="輸入目前密碼"
            required
            autoComplete="current-password"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="new-password" className="text-sm">新密碼</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="至少 6 個字元"
            required
            autoComplete="new-password"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="confirm-password" className="text-sm">確認新密碼</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次輸入新密碼"
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">密碼已更新</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "請稍候…" : "儲存"}
        </Button>
      </form>
    </section>
  );
}
