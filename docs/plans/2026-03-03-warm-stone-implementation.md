# 暖石板配色重設計 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將全站配色從 indigo 藍紫系改為 warm stone + orange-700 accent 的簡約暖系風格。

**Architecture:** 純 Tailwind class 替換，無邏輯改動。每個 Task 修改一個檔案，確保每次改動獨立可驗證。暗色模式支援移除。

**Tech Stack:** Next.js 14, Tailwind CSS v4, TypeScript

---

## 顏色替換對照（全域規則）

| 原始 | 替換後 |
|------|--------|
| `gray-*` 系列 | `stone-*` 同數字 |
| `indigo-600` | `orange-700` |
| `indigo-700` | `orange-800` |
| `indigo-400`（focus ring） | `orange-400` |
| `indigo-500`（進度條） | `stone-800` |
| `indigo-100` | `orange-100` |
| `indigo-200`（閃卡文字） | `stone-300` |
| `bg-indigo-600`（閃卡背面） | `bg-stone-800` |

---

### Task 1: globals.css — 移除 dark mode，更新基礎樣式

**Files:**
- Modify: `app/globals.css`

**Step 1: 修改檔案**

將 `globals.css` 改為：

```css
@import "tailwindcss";

:root {
  --background: #fafaf9;
  --foreground: #1c1917;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

.perspective { perspective: 1000px; }
.transform-style-3d { transform-style: preserve-3d; }
.backface-hidden { backface-visibility: hidden; }
.rotate-y-180 { transform: rotateY(180deg); }
```

（移除整個 `@media (prefers-color-scheme: dark)` 區塊，`--background` 改為 stone-50 值）

**Step 2: 視覺驗證**

啟動 `npm run dev`，確認頁面背景為淡暖米白，無深色模式切換。

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: remove dark mode, set warm stone base colors"
```

---

### Task 2: layout.tsx — 背景色更新

**Files:**
- Modify: `app/layout.tsx`

**Step 1: 修改**

將第 16 行：
```tsx
<body className={`${geist.className} bg-gray-50 min-h-screen`}>
```
改為：
```tsx
<body className={`${geist.className} bg-stone-50 min-h-screen`}>
```

**Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "style: layout background gray-50 -> stone-50"
```

---

### Task 3: Navbar.tsx — 導覽列配色

**Files:**
- Modify: `components/Navbar.tsx`

**Step 1: 修改整個檔案**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '首頁' },
  { href: '/vocabulary', label: '單字庫' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-stone-900 text-lg tracking-wide">
          🎌 日語單字
        </Link>
        <div className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
```

**Step 2: 視覺驗證**

確認 active pill 為深暖褐底白字，logo 不再是靛藍色。

**Step 3: Commit**

```bash
git add components/Navbar.tsx
git commit -m "style: navbar indigo -> stone, warm brown active pill"
```

---

### Task 4: StatsCard.tsx — 統計卡配色

**Files:**
- Modify: `components/StatsCard.tsx`

**Step 1: 修改**

```tsx
interface Props {
  label: string
  value: number
  highlight?: boolean
}

export default function StatsCard({ label, value, highlight }: Props) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col items-center gap-1 ${
      highlight ? 'bg-orange-700 text-white' : 'bg-white border border-stone-200'
    }`}>
      <span className={`text-3xl font-bold ${highlight ? 'text-white' : 'text-stone-900'}`}>
        {value}
      </span>
      <span className={`text-sm ${highlight ? 'text-orange-100' : 'text-stone-500'}`}>
        {label}
      </span>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/StatsCard.tsx
git commit -m "style: StatsCard highlight indigo -> orange-700"
```

---

### Task 5: VocabCard.tsx — 單字卡配色

**Files:**
- Modify: `components/VocabCard.tsx`

**Step 1: 修改**

```tsx
'use client'

import Link from 'next/link'
import { Vocabulary, Category } from '@/lib/types'
import CategoryTag from './CategoryTag'

interface Props {
  vocab: Vocabulary
  categories: Category[]
  onDelete: () => void
}

const STAGE_LABELS = ['新', '第1次', '第2次', '第3次', '第4次', '畢業']

export default function VocabCard({ vocab, categories, onDelete }: Props) {
  const vocabCategories = categories.filter((c) => vocab.categoryIds.includes(c.id))

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-stone-900">{vocab.japanese}</span>
          <span className="text-sm text-stone-400">{vocab.kana}</span>
          <span className="text-sm font-medium text-orange-700">{vocab.chinese}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
            {STAGE_LABELS[vocab.reviewStage]}
          </span>
          {vocabCategories.map((cat) => (
            <CategoryTag key={cat.id} category={cat} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href={`/vocabulary/${vocab.id}`}
          className="px-3 py-1.5 text-sm text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
        >
          編輯
        </Link>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
        >
          刪除
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/VocabCard.tsx
git commit -m "style: VocabCard gray -> stone, chinese text indigo -> orange-700"
```

---

### Task 6: FlashCard.tsx — 閃卡配色

**Files:**
- Modify: `components/FlashCard.tsx`

**Step 1: 修改**

```tsx
'use client'

import { useState } from 'react'
import { Vocabulary } from '@/lib/types'

interface Props {
  vocab: Vocabulary
  onRemembered: () => void
  onForgot: () => void
}

export default function FlashCard({ vocab, onRemembered, onForgot }: Props) {
  const [flipped, setFlipped] = useState(false)

  function speak() {
    const utterance = new SpeechSynthesisUtterance(vocab.kana)
    utterance.lang = 'ja-JP'
    speechSynthesis.speak(utterance)
  }

  function handleAnswer(remembered: boolean) {
    setFlipped(false)
    setTimeout(() => {
      if (remembered) { onRemembered() } else { onForgot() }
    }, 150)
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="perspective w-full max-w-sm">
        <div
          className={`relative w-full h-56 cursor-pointer transform-style-3d transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}
          onClick={() => !flipped && setFlipped(true)}
        >
          <div className="backface-hidden absolute inset-0 bg-white rounded-3xl border-2 border-stone-200 flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-stone-900 text-center">{vocab.chinese}</p>
            <p className="text-stone-400 text-sm mt-4">點擊翻轉</p>
          </div>

          <div className="backface-hidden rotate-y-180 absolute inset-0 bg-stone-800 rounded-3xl flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-white text-center">{vocab.japanese}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-stone-300 text-lg">{vocab.kana}</p>
              <button
                onClick={(e) => { e.stopPropagation(); speak() }}
                className="text-stone-300 hover:text-white transition-colors text-xl"
              >
                🔊
              </button>
            </div>
            {vocab.exampleJp && (
              <div className="mt-4 text-center">
                <p className="text-stone-200 text-sm">{vocab.exampleJp}</p>
                <p className="text-stone-300 text-xs mt-1">{vocab.exampleZh}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex gap-4 w-full max-w-sm">
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 py-3.5 bg-red-50 text-red-600 border border-red-200 rounded-2xl font-semibold hover:bg-red-100 transition-colors"
          >
            😞 忘記
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 py-3.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl font-semibold hover:bg-emerald-100 transition-colors"
          >
            😊 記得
          </button>
        </div>
      )}
    </div>
  )
}
```

**Step 2: 視覺驗證**

翻轉閃卡，確認背面為深暖褐色（stone-800），不再是靛藍色。

**Step 3: Commit**

```bash
git add components/FlashCard.tsx
git commit -m "style: FlashCard back indigo-600 -> stone-800, text stone"
```

---

### Task 7: CategoryBar.tsx — 分類進度條配色

**Files:**
- Modify: `components/CategoryBar.tsx`

**Step 1: 修改（只有文字顏色需改）**

第 12 行：
```tsx
// 原本
<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">分類進度</h2>
// 改為
<h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-4">分類進度</h2>
```

第 22-24 行：
```tsx
// 原本
<span className="font-medium text-gray-700">{cat.name}</span>
<span className="text-gray-400">{graduated}/{total}</span>
// 改為
<span className="font-medium text-stone-700">{cat.name}</span>
<span className="text-stone-400">{graduated}/{total}</span>
```

第 26 行：
```tsx
// 原本
<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
// 改為
<div className="h-2 bg-stone-100 rounded-full overflow-hidden">
```

（進度條填充色保持 `cat.color` 不變，這是使用者自訂的分類色）

**Step 2: Commit**

```bash
git add components/CategoryBar.tsx
git commit -m "style: CategoryBar gray -> stone"
```

---

### Task 8: VocabForm.tsx — 表單配色

**Files:**
- Modify: `components/VocabForm.tsx`

**Step 1: 修改 inputClass 變數（第71行）**

```tsx
// 原本
const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white'
// 改為
const inputClass = 'w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white'
```

**Step 2: 修改 label 文字顏色（所有 `text-gray-700` → `text-stone-700`）**

所有 `<label>` 的 className 中 `text-gray-700` 改為 `text-stone-700`（共 6 處）。

**Step 3: 修改「新增分類」輸入框 focus ring（第160行）**

```tsx
// 原本
className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
// 改為
className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
```

**Step 4: 修改「新增（分類）」按鈕（第180行）**

```tsx
// 原本
className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
// 改為
className="px-3 py-2 bg-orange-700 text-white rounded-xl text-sm font-medium hover:bg-orange-800"
```

**Step 5: 修改提交按鈕（第200行）**

```tsx
// 原本
className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors mt-2"
// 改為
className="w-full py-3 bg-orange-700 text-white rounded-xl font-semibold hover:bg-orange-800 transition-colors mt-2"
```

**Step 6: 修改分類選擇按鈕（第147-149行，未選中態）**

```tsx
// 原本
: 'border-gray-200 bg-white text-gray-600'
// 改為
: 'border-stone-200 bg-white text-stone-600'
```

**Step 7: Commit**

```bash
git add components/VocabForm.tsx
git commit -m "style: VocabForm indigo -> orange-700, gray -> stone"
```

---

### Task 9: app/page.tsx — 首頁配色

**Files:**
- Modify: `app/page.tsx`

**Step 1: 修改**

```tsx
// 第16-17行，標題/說明文字
<h1 className="text-2xl font-bold text-stone-900">今日複習</h1>
<p className="text-stone-500 text-sm mt-1">保持每日練習，記憶更牢固</p>

// 第28-31行，複習按鈕
className={`w-full py-4 rounded-2xl text-center font-semibold text-lg transition-colors ${
  todayReviews.length > 0
    ? 'bg-orange-700 text-white hover:bg-orange-800'
    : 'bg-stone-200 text-stone-400 pointer-events-none'
}`}

// 第40行，空狀態
<div className="text-center py-12 text-stone-400">

// 第43行，連結
<Link href="/vocabulary/new" className="text-orange-700 text-sm mt-1 inline-block hover:underline">
```

**Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "style: homepage gray/indigo -> stone/orange-700"
```

---

### Task 10: app/vocabulary/page.tsx — 單字庫頁面

**Files:**
- Modify: `app/vocabulary/page.tsx`

**Step 1: 修改**

```tsx
// 第26行，標題
<h1 className="text-2xl font-bold text-stone-900">單字庫</h1>

// 第29行，新增按鈕
className="px-4 py-2 bg-orange-700 text-white rounded-xl text-sm font-semibold hover:bg-orange-800 transition-colors"

// 第36行，搜尋框
className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"

// 第46-47行，全部 pill（選中/未選中）
className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
  !selectedCat ? 'bg-orange-700 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
}`}

// 第56-57行，分類 pill（未選中態）
className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border-2 ${
  selectedCat === cat.id ? 'text-white border-transparent' : 'border-stone-200 bg-white text-stone-600'
}`}

// 第69行，空狀態文字
<div className="text-center py-12 text-stone-400">
```

**Step 2: Commit**

```bash
git add app/vocabulary/page.tsx
git commit -m "style: vocabulary page gray/indigo -> stone/orange-700"
```

---

### Task 11: app/review/page.tsx — 複習頁面

**Files:**
- Modify: `app/review/page.tsx`

**Step 1: 修改**

```tsx
// 第39行，空狀態標題
<h2 className="text-xl font-bold text-stone-900">今日沒有待複習單字</h2>

// 第41行，連結
<button onClick={() => router.push('/')} className="text-orange-700 hover:underline text-sm">

// 第51行，完成標題
<h2 className="text-2xl font-bold text-stone-900">複習完成！</h2>

// 第55行，記得數字
<span className="text-3xl font-bold text-emerald-600">{results.remembered}</span>

// 第58行，忘記數字（保持 red，無需改）

// 第59行，記得/忘記 label
<span className="text-sm text-stone-500">記得</span>
<span className="text-sm text-stone-500">忘記</span>

// 第63行，回首頁按鈕
className="px-6 py-3 bg-orange-700 text-white rounded-2xl font-semibold hover:bg-orange-800 transition-colors"

// 第76-77行，進度顯示
<span className="text-sm text-stone-400">進度</span>
<span className="font-bold text-stone-700">{index + 1} / {total}</span>

// 第80行，離開按鈕
className="text-sm text-stone-400 hover:text-stone-600 transition-colors"

// 第87行，進度條軌道
<div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">

// 第89行，進度條填充
className="h-full bg-stone-800 rounded-full transition-all duration-300"
```

**Step 2: Commit**

```bash
git add app/review/page.tsx
git commit -m "style: review page gray/indigo -> stone/orange-700"
```

---

### Task 12: app/vocabulary/new/page.tsx + [id]/page.tsx — 新增/編輯頁面

**Files:**
- Modify: `app/vocabulary/new/page.tsx`
- Modify: `app/vocabulary/[id]/page.tsx`

**Step 1: new/page.tsx 修改**

```tsx
// 第20行
<h1 className="text-2xl font-bold text-stone-900">新增單字</h1>
// 第21行
<p className="text-stone-500 text-sm mt-1">加入新的日文單字到你的單字庫</p>
// 第23行
<div className="bg-white rounded-2xl border border-stone-200 p-6">
```

**Step 2: [id]/page.tsx 修改**

```tsx
// 第15行
return <p className="text-stone-500">找不到單字</p>
// 第24行
<h1 className="text-2xl font-bold text-stone-900">編輯單字</h1>
// 第25行
<p className="text-stone-500 text-sm mt-1">修改 {vocab.japanese} 的資料</p>
// 第28行
<div className="bg-white rounded-2xl border border-stone-200 p-6">
```

**Step 3: Commit**

```bash
git add app/vocabulary/new/page.tsx app/vocabulary/[id]/page.tsx
git commit -m "style: new/edit vocab pages gray -> stone"
```

---

### Task 13: 最終視覺驗證

**Step 1: 啟動開發伺服器**

```bash
npm run dev
```

**Step 2: 逐頁檢查**

- [ ] 首頁：背景米白、待複習按鈕橘褐色、StatsCard highlight 橘色
- [ ] 單字庫：搜尋框 orange focus ring、新增按鈕橘褐色
- [ ] 閃卡：正面白底、背面深暖褐色（stone-800）
- [ ] 複習完成畫面：回首頁按鈕橘褐色
- [ ] 導覽列：active pill 深褐色底白字
- [ ] 新增/編輯表單：提交按鈕橘褐色、focus ring 橘色
- [ ] 確認無任何殘留 `indigo` 或 `gray-*` class（CategoryTag 的分類色除外）

**Step 3: 搜尋確認無遺漏**

```bash
grep -r "indigo" app/ components/ --include="*.tsx" --include="*.css"
grep -r "gray-" app/ components/ --include="*.tsx" --include="*.css"
```

以上搜尋結果應為空（VocabForm 的 `PRESET_COLORS` 中的 hex 色碼除外，那是分類顏色預設值，不需改）。
