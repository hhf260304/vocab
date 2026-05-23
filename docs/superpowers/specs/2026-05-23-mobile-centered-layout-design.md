# Mobile-Centered Layout Design

**Date:** 2026-05-23  
**Status:** Approved

## Goal

讓整個 app 在所有螢幕尺寸下，以手機寬度（≤430px）的容器置中顯示，左右兩側顯示灰色背景，視覺上像是把手機 app 呈現在桌面畫面中央。

## Reference

用戶提供的參考截圖：健身 app 以白色手機內容區塊置中，左右灰色背景。

## Design

### 視覺結構

```
┌───────────────────────────────────────────────┐
│  [灰色背景 body]                               │
│        ┌─────────────────────┐                │
│        │  Navbar             │                │
│        │─────────────────────│                │
│        │                     │                │
│        │  主要內容 (scroll)   │                │
│        │                     │                │
│        │─────────────────────│                │
│        │  BottomTabBar       │                │
│        └─────────────────────┘                │
│                                               │
└───────────────────────────────────────────────┘
```

- Body 背景：灰色（`#e5e7eb` / `gray-200`）
- 手機容器：`max-w-[430px]`，`mx-auto`，**`h-screen`**，`flex flex-col`，保持原本的 `bg-background`（indigo-50）
- 容器加上 `shadow-xl` 讓邊緣有立體感

### 元件變更

#### `app/layout.tsx`
- `body` 背景色改為灰色（`bg-gray-200`）
- `body` 新增 `flex justify-center`（或直接用容器的 `mx-auto`）
- 在 `<SessionProvider>` 外層加一個 `div.phone-shell`：
  - `max-w-[430px] w-full mx-auto min-h-screen flex flex-col bg-background shadow-xl relative overflow-hidden`
- `<main>` 改為 `flex-1 overflow-y-auto`，移除 `max-w-3xl mx-auto`（已由外層容器控制寬度）
- `<main>` 改為 `flex-1 overflow-y-auto`，padding 調整為 `px-4 py-4`（不需要 `pb-20`，BottomTabBar 已在 flex 欄佔位）

#### `components/Navbar.tsx`
- 移除內層 `max-w-3xl mx-auto`（寬度已由外層容器控制）
- 移除 `hidden sm:block` 限制 avatar dropdown（在手機寬度容器內一律顯示）
- `nav` 本身保持 `sticky top-0 z-10`

#### `components/BottomTabBar.tsx`
- 移除 `fixed bottom-0 inset-x-0`，改為 `sticky bottom-0`（或直接在 flex 欄最底部）
- 移除 `sm:hidden`（永遠顯示）

### 注意事項

- `(auth)/layout.tsx` 登入頁面是否也套用手機框？需確認（目前 Navbar/BottomTabBar 在 `/login` 已 return null，登入頁面本身需另外確認）
- `overflow-hidden` 加在 phone-shell 可防止內容橫向溢出
- `h-screen` 使容器鎖定視口高度，BottomTabBar 永遠可見，`<main>` 內部滾動

## Files to Change

| 檔案 | 變更類型 |
|------|---------|
| `app/layout.tsx` | 加 phone-shell wrapper，body 改背景色 |
| `components/Navbar.tsx` | 移除 max-w 內層容器、移除 sm:hidden |
| `components/BottomTabBar.tsx` | fixed → sticky，移除 sm:hidden |

## Out of Scope

- 不加實體手機邊框（無 notch、home indicator 等裝飾）
- 不修改任何頁面內部元件的樣式
- 不更動 dark mode 相關設定
