# Mobile-Centered Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓整個 app 在任何螢幕尺寸下以手機寬度（430px）的容器置中顯示，左右兩側為灰色背景。

**Architecture:** 在 `app/layout.tsx` 加入一個 `h-screen max-w-[430px]` 的 phone-shell wrapper，將 Navbar、頁面內容、BottomTabBar 全部包在其中。`body` 背景改為灰色，`<main>` 改為 `flex-1 overflow-y-auto` 以在容器內部捲動。BottomTabBar 從 `fixed` 改為 flex 欄底部，永遠可見。

**Tech Stack:** Next.js App Router, Tailwind CSS v4

---

## File Map

| 動作 | 檔案 | 說明 |
|------|------|------|
| Modify | `app/layout.tsx` | 加 phone-shell wrapper，body 改灰色背景 |
| Modify | `components/Navbar.tsx` | 移除內層 `max-w-3xl mx-auto`，移除 `hidden sm:block` |
| Modify | `components/BottomTabBar.tsx` | 移除 `fixed bottom-0 inset-x-0` 及 `sm:hidden` |

---

## Task 1: 更新 `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

### 目前內容（`app/layout.tsx` 第 22–33 行）

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${geist.className} bg-background min-h-screen flex flex-col`}>
        <SessionProvider>
          <Navbar />
          <main className="max-w-3xl mx-auto px-4 py-4 sm:py-8 pb-20 sm:pb-8 flex-1 w-full flex flex-col">{children}</main>
          <BottomTabBar />
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 1: 修改 `app/layout.tsx`**

  將 `body` 改為灰色背景，加入 phone-shell wrapper div，`<main>` 改為 `flex-1 overflow-y-auto`：

  ```tsx
  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="zh-TW">
        <body className={`${geist.className} bg-gray-200`}>
          <SessionProvider>
            <div className="max-w-[430px] w-full mx-auto h-screen flex flex-col bg-background shadow-xl overflow-hidden">
              <Navbar />
              <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">{children}</main>
              <BottomTabBar />
            </div>
          </SessionProvider>
        </body>
      </html>
    );
  }
  ```

  > 重點說明：
  > - `body` 移除 `min-h-screen flex flex-col`，改為純 `bg-gray-200`
  > - phone-shell div 用 `h-screen`（鎖定視口高度）使 BottomTabBar 永遠在底部
  > - `overflow-hidden` 防止手機殼橫向溢出
  > - `<main>` 用 `overflow-y-auto` 讓頁面內容在容器內捲動
  > - 移除 `max-w-3xl mx-auto`（寬度已由外層 phone-shell 控制）
  > - 移除 `pb-20 sm:pb-8`（BottomTabBar 已在 flex 欄佔位，不需要 padding）

---

## Task 2: 更新 `components/Navbar.tsx`

**Files:**
- Modify: `components/Navbar.tsx`

### 目前相關內容（第 26–57 行）

```tsx
return (
  <nav className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-10">
    <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
      <Link href="/" ...>快快樂樂背單字</Link>
      {user && (
        <div className="hidden sm:block">   {/* ← 桌面才顯示 */}
          <DropdownMenu>...</DropdownMenu>
        </div>
      )}
    </div>
  </nav>
);
```

- [ ] **Step 1: 修改 `components/Navbar.tsx`**

  移除內層 div 的 `max-w-3xl mx-auto`（寬度由 phone-shell 控制），並移除 `hidden sm:block`（手機模式下永遠顯示 avatar）：

  ```tsx
  return (
    <nav className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-foreground text-lg tracking-wide min-w-0 truncate flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary shrink-0" />
          快快樂樂背單字
        </Link>
        {user && (
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
        )}
      </div>
    </nav>
  );
  ```

---

## Task 3: 更新 `components/BottomTabBar.tsx`

**Files:**
- Modify: `components/BottomTabBar.tsx`

### 目前相關內容（第 18–19 行）

```tsx
<nav className="sm:hidden fixed bottom-0 inset-x-0 bg-card/90 backdrop-blur-sm border-t border-border z-10">
  <div className="flex h-14">
```

- [ ] **Step 1: 修改 `components/BottomTabBar.tsx`**

  移除 `sm:hidden`（永遠顯示）和 `fixed bottom-0 inset-x-0`（改為 flex 欄底部佔位）：

  ```tsx
  <nav className="bg-card/90 backdrop-blur-sm border-t border-border z-10">
    <div className="flex h-14">
  ```

  > BottomTabBar 現在是 phone-shell flex 欄的最後一個子元素，自然停在底部。不需要 `fixed` 定位。

---

## Task 4: 啟動 dev server 驗證

- [ ] **Step 1: 啟動開發伺服器**

  ```bash
  npm run dev
  ```

  在瀏覽器開啟 `http://localhost:3000`

- [ ] **Step 2: 驗證以下項目**

  | 項目 | 預期結果 |
  |------|---------|
  | 寬螢幕（桌面）| 左右灰色背景，中央白色手機殼，有陰影 |
  | 容器寬度 | ≤ 430px，置中 |
  | Navbar | 在容器頂部，有 avatar dropdown |
  | BottomTabBar | 永遠可見在容器底部，不橫跨全螢幕 |
  | 頁面捲動 | 內容在手機殼內捲動，底部 bar 不移動 |
  | 登入頁面 | 容器內顯示，Navbar/BottomTabBar 隱藏 |
  | 實際手機瀏覽 | 容器填滿視口，陰影不明顯，正常使用 |

- [ ] **Step 3: 確認無問題後 commit**

  ```bash
  git add app/layout.tsx components/Navbar.tsx components/BottomTabBar.tsx
  git commit -m "feat(layout): 改為手機寬度容器置中顯示"
  ```
