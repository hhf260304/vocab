# 修改密碼功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/settings` 頁面加入修改密碼功能，使用者須先輸入舊密碼驗證身份，才能設定新密碼。

**Architecture:** 設定頁 (`app/settings/page.tsx`) 為 server component，負責 auth 檢查；`ChangePasswordSection` 為獨立 client component 管理表單狀態；`changePassword` server action 在 `lib/actions/auth.ts` 處理驗證與 DB 更新。Navbar 加入設定連結。

**Tech Stack:** Next.js 16 App Router, NextAuth v5, Drizzle ORM (Neon PostgreSQL), bcryptjs, Tailwind CSS, shadcn/ui

---

## 檔案結構

| 動作 | 路徑 | 說明 |
|------|------|------|
| 新增 | `app/settings/page.tsx` | Server component，auth 檢查 + 頁面骨架 |
| 新增 | `app/settings/ChangePasswordSection.tsx` | Client component，修改密碼表單 |
| 修改 | `lib/actions/auth.ts` | 加入 `changePassword` server action |
| 修改 | `components/Navbar.tsx` | 加入「設定」導覽連結 |

---

## Task 1：加入 `changePassword` Server Action

**Files:**
- Modify: `lib/actions/auth.ts`

- [ ] **Step 1：閱讀目前的 `lib/actions/auth.ts`**

確認目前內容為：

```ts
// lib/actions/auth.ts
"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function register(username: string, password: string) { ... }
```

- [ ] **Step 2：更新 `lib/actions/auth.ts` 的 import 區塊，並在最末加入 `changePassword`**

將檔案頂部 import 改為：

```ts
// lib/actions/auth.ts
"use server";

import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
```

然後在 `register` 函式後加入：

```ts
export async function changePassword(oldPassword: string, newPassword: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "請先登入" };
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: "新密碼至少需要 6 個字元" };
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.passwordHash) {
    return { error: "找不到使用者" };
  }

  const valid = await compare(oldPassword, user.passwordHash);
  if (!valid) {
    return { error: "目前密碼錯誤" };
  }

  const passwordHash = await hash(newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, session.user.id));

  return { success: true };
}
```

- [ ] **Step 3：確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit
```

Expected: 無任何錯誤輸出

- [ ] **Step 4：Commit**

```bash
git add lib/actions/auth.ts
git commit -m "feat(auth): 加入 changePassword server action"
```

---

## Task 2：建立設定頁面 Server Component

**Files:**
- Create: `app/settings/page.tsx`

- [ ] **Step 1：建立 `app/settings/page.tsx`**

```tsx
// app/settings/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChangePasswordSection from "./ChangePasswordSection";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">設定</h1>
        <p className="text-muted-foreground text-sm mt-1">管理你的帳號</p>
      </div>

      <ChangePasswordSection />
    </div>
  );
}
```

- [ ] **Step 2：確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit
```

Expected: 無任何錯誤輸出

- [ ] **Step 3：Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat(settings): 加入設定頁面骨架"
```

---

## Task 3：建立 `ChangePasswordSection` Client Component

**Files:**
- Create: `app/settings/ChangePasswordSection.tsx`

- [ ] **Step 1：建立 `app/settings/ChangePasswordSection.tsx`**

```tsx
// app/settings/ChangePasswordSection.tsx
"use client";

import { useState } from "react";
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
        setTimeout(() => setSuccess(false), 3000);
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
          <p className="text-sm text-green-600">密碼已更新</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "請稍候…" : "儲存"}
        </Button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2：確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit
```

Expected: 無任何錯誤輸出

- [ ] **Step 3：Commit**

```bash
git add app/settings/ChangePasswordSection.tsx
git commit -m "feat(settings): 加入修改密碼表單元件"
```

---

## Task 4：更新 Navbar 加入設定連結

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1：閱讀 `components/Navbar.tsx`**

確認目前 `links` 陣列為：

```ts
const links = [
  { href: "/", label: "首頁" },
];
```

- [ ] **Step 2：加入設定連結**

將 `links` 陣列改為：

```ts
const links = [
  { href: "/", label: "首頁" },
  { href: "/settings", label: "設定" },
];
```

- [ ] **Step 3：確認 TypeScript 無錯誤**

```bash
npx tsc --noEmit
```

Expected: 無任何錯誤輸出

- [ ] **Step 4：Commit**

```bash
git add components/Navbar.tsx
git commit -m "feat(navbar): 加入設定頁面連結"
```

---

## Task 5：手動驗收測試

- [ ] **Step 1：啟動開發伺服器**

```bash
npm run dev
```

Expected: 伺服器在 `http://localhost:3000` 啟動，無編譯錯誤

- [ ] **Step 2：驗證 Navbar 出現「設定」連結**

瀏覽 `http://localhost:3000`，登入後確認 Navbar 顯示「首頁」和「設定」兩個連結。

- [ ] **Step 3：驗證未登入時 redirect**

登出後直接瀏覽 `http://localhost:3000/settings`，應被 redirect 到 `/login`。

- [ ] **Step 4：驗證舊密碼錯誤**

登入後進入 `/settings`，輸入錯誤的舊密碼，送出後應顯示「目前密碼錯誤」。

- [ ] **Step 5：驗證新密碼不一致**

輸入正確舊密碼，新密碼與確認新密碼不同，送出後應顯示「兩次輸入的密碼不一致」（不呼叫 server action）。

- [ ] **Step 6：驗證成功修改密碼**

輸入正確舊密碼與合法新密碼，送出後應顯示「密碼已更新」，表單欄位清空，3 秒後訊息消失。

- [ ] **Step 7：驗證新密碼可登入**

登出後用新密碼重新登入，應成功進入系統。

- [ ] **Step 8：驗證新密碼長度限制**

在密碼欄位輸入少於 6 字元，server action 應回傳「新密碼至少需要 6 個字元」。

- [ ] **Step 9：lint 檢查**

```bash
npm run lint
```

Expected: 無 lint 錯誤
