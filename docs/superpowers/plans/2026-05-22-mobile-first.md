# Mobile-First 改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將現有桌面優先版型改為 Mobile-First，加入手機底部導覽列，並優化 FlashCard 觸控體驗。

**Architecture:** 新增 `BottomTabBar` client component，在 `app/layout.tsx` 掛載；以 Tailwind responsive prefix（`sm:`）區分手機與桌面樣式，桌面行為完全不變。

**Tech Stack:** Next.js App Router, Tailwind CSS v4, shadcn/ui, NextAuth v5, lucide-react

---

## File Map

| 動作 | 檔案 |
|------|------|
| 新增 | `components/BottomTabBar.tsx` |
| 新增 | `app/settings/LogoutSection.tsx` |
| 修改 | `app/layout.tsx` |
| 修改 | `components/Navbar.tsx` |
| 修改 | `components/FlashCard.tsx` |
| 修改 | `app/languages/[id]/vocabulary/VocabularyClient.tsx` |
| 修改 | `app/languages/[id]/sentences/SentencesClient.tsx` |
| 修改 | `app/settings/page.tsx` |

---

## Task 1: 新增 BottomTabBar component

**Files:**
- Create: `components/BottomTabBar.tsx`

- [ ] **Step 1: 建立元件檔案**

```tsx
// components/BottomTabBar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";

export default function BottomTabBar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;
  if (
    pathname.startsWith("/review/") ||
    /^\/sentences\/[^/]+\/review/.test(pathname)
  ) return null;

  const isSettings = pathname.startsWith("/settings");

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-card/90 backdrop-blur-sm border-t border-border z-10">
      <div className="flex h-14">
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
            !isSettings ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Home className="w-5 h-5" />
          語言
        </Link>
        <Link
          href="/settings"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
            isSettings ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Settings className="w-5 h-5" />
          設定
        </Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 確認 lint 通過**

```bash
npm run lint
```

預期：no errors

- [ ] **Step 3: Commit**

```bash
git add components/BottomTabBar.tsx
git commit -m "feat(mobile): 新增手機底部導覽列 BottomTabBar"
```

---

## Task 2: 修改 Navbar + Layout 掛載 BottomTabBar

**Files:**
- Modify: `components/Navbar.tsx`（Avatar 區塊加 `hidden sm:block`）
- Modify: `app/layout.tsx`（調整 main padding、掛載 BottomTabBar）

- [ ] **Step 1: 修改 Navbar — Avatar 區塊改為桌面才顯示**

在 `components/Navbar.tsx` 找到以下程式碼（第 33 行起）：

```tsx
{user && (
  <DropdownMenu>
```

改為：

```tsx
{user && (
  <div className="hidden sm:block">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="w-8 h-8 cursor-pointer">
          <AvatarImage src={user.image ?? undefined} alt={user.name ?? "用戶"} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="w-4 h-4" />
            設定
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut({ redirectTo: "/login" })}>
          <LogOut className="w-4 h-4" />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
)}
```

- [ ] **Step 2: 修改 app/layout.tsx — 調整 main padding 並加入 BottomTabBar**

修改前的 `app/layout.tsx`：

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import "./globals.css";
```

改為（加入 BottomTabBar import）：

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import "./globals.css";
```

修改前的 `<main>` 標籤：

```tsx
<main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full flex flex-col">{children}</main>
```

改為（調整 padding，並在 `</main>` 下方加入 BottomTabBar）：

```tsx
<main className="max-w-3xl mx-auto px-4 py-4 sm:py-8 pb-20 sm:pb-8 flex-1 w-full flex flex-col">{children}</main>
<BottomTabBar />
```

- [ ] **Step 3: 確認 lint 通過**

```bash
npm run lint
```

預期：no errors

- [ ] **Step 4: Commit**

```bash
git add components/Navbar.tsx app/layout.tsx
git commit -m "feat(mobile): Navbar 手機隱藏 Avatar，Layout 加入 BottomTabBar"
```

---

## Task 3: 修改 FlashCard — 觸控優化

**Files:**
- Modify: `components/FlashCard.tsx`

- [ ] **Step 1: 加大卡片最小高度**

找到正面卡片 div（第 147 行），原始：

```tsx
className="[grid-area:1/1] backface-hidden bg-white rounded-3xl border-2 border-indigo-100 flex flex-col items-center justify-center p-6 min-h-[180px] shadow-[0_2px_0_0_rgba(79,70,229,0.12),0_8px_24px_-4px_rgba(79,70,229,0.10)]"
```

改為（`min-h-[180px]` → `min-h-[200px] sm:min-h-[180px]`）：

```tsx
className="[grid-area:1/1] backface-hidden bg-white rounded-3xl border-2 border-indigo-100 flex flex-col items-center justify-center p-6 min-h-[200px] sm:min-h-[180px] shadow-[0_2px_0_0_rgba(79,70,229,0.12),0_8px_24px_-4px_rgba(79,70,229,0.10)]"
```

同樣找到反面卡片 div（第 161 行），原始：

```tsx
className="[grid-area:1/1] backface-hidden rotate-y-180 rounded-3xl flex flex-col items-center justify-center p-6 min-h-[180px] shadow-[0_2px_0_0_rgba(79,70,229,0.2),0_8px_24px_-4px_rgba(79,70,229,0.15)]"
```

改為：

```tsx
className="[grid-area:1/1] backface-hidden rotate-y-180 rounded-3xl flex flex-col items-center justify-center p-6 min-h-[200px] sm:min-h-[180px] shadow-[0_2px_0_0_rgba(79,70,229,0.2),0_8px_24px_-4px_rgba(79,70,229,0.15)]"
```

- [ ] **Step 2: 加大判斷按鈕的觸控高度**

找到「忘記」按鈕（第 282 行），`py-3.5` 改為 `py-4 sm:py-3.5`：

```tsx
className="flex-1 h-auto py-4 sm:py-3.5 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-600 rounded-2xl font-semibold gap-2 active:scale-[0.97] transition-transform"
```

找到「記得」按鈕（第 289 行），同樣修改：

```tsx
className="flex-1 h-auto py-4 sm:py-3.5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-600 rounded-2xl font-semibold gap-2 active:scale-[0.97] transition-transform"
```

- [ ] **Step 3: 鍵盤提示在手機上隱藏**

找到翻面後的鍵盤提示 `<p>`（第 297 行）：

```tsx
<p className="text-xs text-muted-foreground/60 select-none">
  <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">←</kbd>
  {" 忘記 · 記得 "}
  <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">→</kbd>
</p>
```

改為（加 `hidden sm:block`）：

```tsx
<p className="hidden sm:block text-xs text-muted-foreground/60 select-none">
  <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">←</kbd>
  {" 忘記 · 記得 "}
  <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">→</kbd>
</p>
```

找到翻牌前的鍵盤提示 `<p>`（第 303 行）：

```tsx
<p className="text-xs text-muted-foreground/60 select-none">
  <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">Space</kbd>
  {" 翻轉"}
</p>
```

改為：

```tsx
<p className="hidden sm:block text-xs text-muted-foreground/60 select-none">
  <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[11px]">Space</kbd>
  {" 翻轉"}
</p>
```

- [ ] **Step 4: 確認 lint 通過**

```bash
npm run lint
```

預期：no errors

- [ ] **Step 5: Commit**

```bash
git add components/FlashCard.tsx
git commit -m "feat(mobile): FlashCard 加大觸控區域，手機隱藏鍵盤提示"
```

---

## Task 4: 單字 & 句子管理頁按鈕 — 手機 icon-only

**Files:**
- Modify: `app/languages/[id]/vocabulary/VocabularyClient.tsx`
- Modify: `app/languages/[id]/sentences/SentencesClient.tsx`

- [ ] **Step 1: 修改 VocabularyClient 的「新增分類」按鈕**

找到第 183 行的按鈕內容（`FolderPlus` + 文字）：

```tsx
<Button onClick={() => setShowCatInput((s) => !s)}>
  <FolderPlus className="w-4 h-4 mr-1" />新增分類
</Button>
```

改為：

```tsx
<Button onClick={() => setShowCatInput((s) => !s)}>
  <FolderPlus className="w-4 h-4" />
  <span className="hidden sm:inline ml-1">新增分類</span>
</Button>
```

- [ ] **Step 2: 修改 VocabularyClient 的「新增單字」按鈕**

找到第 185 行的按鈕（`Plus` + 文字）：

```tsx
<Button asChild>
  <Link
    href={
      realUncategorized
        ? `/vocabulary/new?languageId=${language.id}&categoryId=${realUncategorized.id}`
        : `/vocabulary/new?languageId=${language.id}`
    }
  >
    <Plus className="w-4 h-4 mr-1" />新增單字
  </Link>
</Button>
```

改為：

```tsx
<Button asChild>
  <Link
    href={
      realUncategorized
        ? `/vocabulary/new?languageId=${language.id}&categoryId=${realUncategorized.id}`
        : `/vocabulary/new?languageId=${language.id}`
    }
  >
    <Plus className="w-4 h-4" />
    <span className="hidden sm:inline ml-1">新增單字</span>
  </Link>
</Button>
```

- [ ] **Step 3: 修改 SentencesClient 的「新增分類」按鈕**

在 `app/languages/[id]/sentences/SentencesClient.tsx` 找到第 164 行：

```tsx
<Button onClick={() => setShowCatInput((s) => !s)}>
  <FolderPlus className="w-4 h-4 mr-1" />新增分類
</Button>
```

改為：

```tsx
<Button onClick={() => setShowCatInput((s) => !s)}>
  <FolderPlus className="w-4 h-4" />
  <span className="hidden sm:inline ml-1">新增分類</span>
</Button>
```

- [ ] **Step 4: 確認 lint 通過**

```bash
npm run lint
```

預期：no errors

- [ ] **Step 5: Commit**

```bash
git add "app/languages/[id]/vocabulary/VocabularyClient.tsx" "app/languages/[id]/sentences/SentencesClient.tsx"
git commit -m "feat(mobile): 管理頁按鈕手機版改為 icon-only"
```

---

## Task 5: 設定頁加入登出按鈕

**Files:**
- Create: `app/settings/LogoutSection.tsx`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: 建立 LogoutSection client component**

```tsx
// app/settings/LogoutSection.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutSection() {
  return (
    <div className="pt-4 border-t border-border">
      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => signOut({ redirectTo: "/login" })}
      >
        <LogOut className="w-4 h-4 mr-2" />
        登出
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 在設定頁加入 LogoutSection**

修改 `app/settings/page.tsx`，加入 import 與元件：

```tsx
// app/settings/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ChangePasswordSection from "./ChangePasswordSection";
import LogoutSection from "./LogoutSection";

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
      <LogoutSection />
    </div>
  );
}
```

- [ ] **Step 3: 確認 build 通過（最終驗證）**

```bash
npm run build
```

預期：編譯成功，無 TypeScript 錯誤

- [ ] **Step 4: Commit**

```bash
git add app/settings/LogoutSection.tsx app/settings/page.tsx
git commit -m "feat(mobile): 設定頁加入登出按鈕，補全手機版登出路徑"
```

---

## 完成驗收清單

在手機尺寸（375px 寬）下確認：

- [ ] 首頁底部顯示「語言 / 設定」Tab Bar
- [ ] 複習頁（`/review/*`）Tab Bar 消失
- [ ] 句子複習頁（`/sentences/*/review`）Tab Bar 消失
- [ ] 登入頁 Tab Bar 不顯示
- [ ] FlashCard 卡片比之前高，按鈕更容易點擊
- [ ] 鍵盤提示（← → Space）不顯示
- [ ] 單字/句子管理頁按鈕只顯示圖示
- [ ] 設定頁底部有登出按鈕

在桌面（> 640px）下確認：

- [ ] Tab Bar 不顯示
- [ ] Navbar 的 Avatar 下拉選單正常顯示
- [ ] 所有按鈕文字完整顯示
- [ ] 鍵盤快捷鍵提示正常顯示
