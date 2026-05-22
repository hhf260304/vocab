# Mobile-First 改版設計

**日期：** 2026-05-22  
**範圍：** 方案 B — 標準改動，桌面體驗不受影響

---

## 目標

將現有「桌面優先」的 Tailwind 排版改為 Mobile-First，主要針對手機（< 640px）優化操作體驗，同時保持桌面版完整功能不變。

---

## 1. 導覽結構

### 新增：`components/BottomTabBar.tsx`

- 只在手機顯示（`sm:hidden`）
- 固定在畫面底部（`fixed bottom-0`）
- 兩個 Tab：
  - 🏠 **語言**（連結到 `/`）
  - ⚙️ **設定**（連結到 `/settings`）
- Active 狀態：以 `usePathname()` 判斷，符合的 Tab 顯示 primary 色
- **隱藏條件**：pathname 符合 `/review/` 或 `/sentences/*/review` 時不渲染（`return null`）

### 修改：`components/Navbar.tsx`

- Avatar 下拉選單改為 `hidden sm:flex`，手機上不顯示
- Logo 在所有螢幕尺寸下維持可見

### 修改：`app/layout.tsx`

- `<main>` 的 `py-8` → `py-4 sm:py-8`
- `<main>` 加入 `pb-20 sm:pb-0`，避免底部 Tab Bar 遮住頁面最後的內容
- 在 `<main>` 下方加入 `<BottomTabBar />`

---

## 2. FlashCard（`components/FlashCard.tsx`）

| 項目 | 現在 | 改後 |
|------|------|------|
| 卡片最小高度 | `min-h-[180px]` | `min-h-[200px] sm:min-h-[180px]` |
| 判斷按鈕高度 | `py-3.5` | `py-4 sm:py-3.5` |
| 鍵盤提示（`← → Space`）| 永遠顯示 | `hidden sm:block` |

---

## 3. 單字管理頁（`app/languages/[id]/vocabulary/VocabularyClient.tsx`）

「新增分類」與「新增單字」兩個按鈕的文字標籤改為：

```tsx
<FolderPlus className="w-4 h-4" />
<span className="hidden sm:inline ml-1">新增分類</span>
```

手機上只顯示圖示，桌面上顯示完整文字。`Plus` icon 同理。

---

## 4. 句子管理頁（`app/languages/[id]/sentences/SentencesClient.tsx`）

「新增分類」按鈕套用與單字管理頁相同的 icon-only 處理：

```tsx
<FolderPlus className="w-4 h-4" />
<span className="hidden sm:inline ml-1">新增分類</span>
```

---

## 5. 設定頁（`app/settings/page.tsx`）

手機上 Navbar 不再顯示 Avatar 與登出選項，因此設定頁底部需加入**登出按鈕**：

- 使用 NextAuth 的 `signOut({ redirectTo: "/login" })`
- 樣式：`variant="outline"` + destructive 文字色，與頁面其他元素區隔

---

## 影響範圍

| 檔案 | 類型 |
|------|------|
| `components/BottomTabBar.tsx` | 新增 |
| `components/Navbar.tsx` | 修改 |
| `app/layout.tsx` | 修改 |
| `components/FlashCard.tsx` | 修改 |
| `app/languages/[id]/vocabulary/VocabularyClient.tsx` | 修改 |
| `app/languages/[id]/sentences/SentencesClient.tsx` | 修改 |
| `app/settings/page.tsx` | 修改 |

---

## 不在範圍內

- Swipe 手勢（屬方案 C）
- 語言卡片全寬排版重設計（屬方案 C）
- Dark mode 調整
- 效能優化
