// app/(auth)/login/LoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register } from "@/lib/actions/auth";

type Tab = "login" | "register";

export default function LoginForm() {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "register") {
        const result = await register(username, password);
        if (result?.error) {
          setError(result.error);
          return;
        }
      }
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("用戶名或密碼錯誤");
      } else {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => { setTab("login"); setError(""); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            tab === "login"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          登入
        </button>
        <button
          type="button"
          onClick={() => { setTab("register"); setError(""); }}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            tab === "register"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          註冊
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="username" className="text-sm">用戶名</Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="輸入用戶名"
            required
            autoComplete="username"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="password" className="text-sm">密碼</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "register" ? "至少 6 個字元" : "輸入密碼"}
            required
            autoComplete={tab === "register" ? "new-password" : "current-password"}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "請稍候…" : tab === "login" ? "登入" : "註冊"}
        </Button>
      </form>
    </div>
  );
}
