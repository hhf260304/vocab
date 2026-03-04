# Category Flow Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move category management from the add/edit word forms to the vocabulary library page, and let users add words directly within a category section.

**Architecture:** Three targeted file changes — strip the category UI from `VocabForm`, update the new-word page to read `categoryId` from the URL, and add category management + per-section add buttons to the vocabulary page. No new files, no data model changes.

**Tech Stack:** Next.js 16 (App Router), React 19, Zustand 5, TypeScript, Tailwind CSS 4. No test runner — verify with `npm run build` and `npm run lint`.

---

### Task 1: Strip category UI from VocabForm

**Files:**
- Modify: `components/VocabForm.tsx`

**Step 1: Remove category-related state and functions**

Replace lines 13–55 (imports through helpers) with the leaner version below. The key changes:
- Remove `addCategory` and `deleteCategory` from the store destructure (remove `useVocabStore` import entirely — it is no longer needed)
- Remove `newCatName` state
- Remove `addCategoryToWord`, `removeCategoryFromWord`, `handleAddCategory`
- Remove `selectedCategories` / `unselectedCategories` derived vars

The top of the file becomes:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { VocabFormData } from '@/lib/types'

interface Props {
  initialData?: VocabFormData & { id?: string }
  onSubmit: (data: VocabFormData) => void
  submitLabel: string
}

export default function VocabForm({ initialData, onSubmit, submitLabel }: Props) {
  const [form, setForm] = useState<VocabFormData>({
    japanese: '',
    chinese: '',
    exampleJp: '',
    categoryIds: [],
    ...initialData,
  })

  useEffect(() => {
    if (initialData) setForm((f) => ({ ...f, ...initialData }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id])

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    speechSynthesis.speak(utterance)
  }

  function setField(field: keyof VocabFormData, value: string | string[]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.japanese || !form.chinese) return
    onSubmit(form)
  }

  const inputClass = 'w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white'
```

**Step 2: Remove the category JSX section**

Delete the entire `<div>` block that has `<label>分類</label>` and everything inside it (currently around lines 112–185). The form's `return` should now only have: 日文, 中文意思, 例句, and the submit button.

Full JSX after the change:

```tsx
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">日文 *</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={form.japanese}
            onChange={(e) => setField('japanese', e.target.value)}
            placeholder="例：食べる"
            required
          />
          <button
            type="button"
            onClick={() => speak(form.japanese)}
            className="px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-lg"
            title="朗讀"
          >
            🔊
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">中文意思 *</label>
        <input
          className={inputClass}
          value={form.chinese}
          onChange={(e) => setField('chinese', e.target.value)}
          placeholder="例：吃"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">例句（日文）</label>
        <input
          className={inputClass}
          value={form.exampleJp}
          onChange={(e) => setField('exampleJp', e.target.value)}
          placeholder="例：ご飯を食べる。"
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-orange-700 text-white rounded-xl font-semibold hover:bg-orange-800 transition-colors mt-2"
      >
        {submitLabel}
      </button>
    </form>
  )
}
```

**Step 3: Verify**

```bash
cd /Users/user/Desktop/japanese-vocab-app
npm run build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing warnings).

**Step 4: Commit**

```bash
git add components/VocabForm.tsx
git commit -m "refactor: remove category UI from VocabForm"
```

---

### Task 2: New word page reads categoryId from URL

**Files:**
- Modify: `app/vocabulary/new/page.tsx`

**Step 1: Add useSearchParams and category lookup**

Replace the entire file with:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useVocabStore } from '@/lib/store'
import { VocabFormData } from '@/lib/types'
import VocabForm from '@/components/VocabForm'

export default function NewVocabPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('categoryId')
  const { addVocabulary, categories } = useVocabStore()
  const category = categories.find((c) => c.id === categoryId)

  function handleSubmit(data: VocabFormData) {
    addVocabulary({
      ...data,
      categoryIds: categoryId ? [categoryId] : [],
    })
    router.push('/vocabulary')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">新增單字</h1>
        <p className="text-stone-500 text-sm mt-1">
          {category ? `加入「${category.name}」分類` : '加入新的日文單字到你的單字庫'}
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <VocabForm onSubmit={handleSubmit} submitLabel="新增單字" />
      </div>
    </div>
  )
}
```

**Step 2: Verify**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

**Step 3: Commit**

```bash
git add app/vocabulary/new/page.tsx
git commit -m "feat: new word page reads categoryId from URL query param"
```

---

### Task 3: Vocabulary page — category management + per-section add button

**Files:**
- Modify: `app/vocabulary/page.tsx`

**Step 1: Rewrite the file**

Replace the entire file with the version below. Key additions:
- `addCategory` and `deleteCategory` pulled from the store
- `showCatInput` / `newCatName` state for the inline add-category form
- `CategorySection` gains `catId`, `onDeleteCategory` props; its header shows "+ 單字" link and a × delete button
- Header replaced: "+ 新增分類" button instead of the old "+ 新增單字"
- New empty state when there are no categories at all

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useVocabStore } from '@/lib/store'
import VocabCard from '@/components/VocabCard'
import { Vocabulary, Category } from '@/lib/types'

function CategorySection({
  cat,
  name,
  vocabs,
  categories,
  onDelete,
  onDeleteCategory,
}: {
  cat?: Category
  name: string
  vocabs: Vocabulary[]
  categories: Category[]
  onDelete: (id: string) => void
  onDeleteCategory?: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <span className="font-semibold text-stone-800">{name}</span>
          <span className="text-sm text-stone-400">{vocabs.length} 個單字</span>
          <span className="text-stone-400 text-xs ml-auto">{collapsed ? '▶' : '▼'}</span>
        </button>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          {cat && (
            <Link
              href={`/vocabulary/new?categoryId=${cat.id}`}
              className="px-3 py-1 text-xs font-medium bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition-colors"
            >
              + 單字
            </Link>
          )}
          {cat && onDeleteCategory && (
            <button
              onClick={() => onDeleteCategory(cat.id)}
              className="px-2 py-1 text-xs text-stone-400 hover:text-red-500 transition-colors"
              title={`刪除分類「${name}」`}
            >
              ×
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-px border-t border-stone-100">
          {vocabs.length === 0 ? (
            <p className="text-sm text-stone-400 px-5 py-4">還沒有單字，點「+ 單字」開始新增</p>
          ) : (
            vocabs.map((vocab) => (
              <div key={vocab.id} className="px-2 py-1">
                <VocabCard
                  vocab={vocab}
                  categories={categories}
                  onDelete={() => onDelete(vocab.id)}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function VocabularyPage() {
  const { vocabularies, categories, deleteVocabulary, addCategory, deleteCategory } = useVocabStore()
  const [search, setSearch] = useState('')
  const [showCatInput, setShowCatInput] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const filtered = vocabularies.filter((v) => {
    if (!search) return true
    return v.japanese.includes(search) || v.chinese.includes(search)
  })

  function handleDelete(id: string) {
    const vocab = vocabularies.find((v) => v.id === id)
    if (vocab && confirm(`確定刪除「${vocab.japanese}」？`)) {
      deleteVocabulary(id)
    }
  }

  function handleDeleteCategory(id: string) {
    const cat = categories.find((c) => c.id === id)
    if (cat && confirm(`確定刪除分類「${cat.name}」？分類內的單字將變為未分類。`)) {
      deleteCategory(id)
    }
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return
    addCategory(newCatName.trim())
    setNewCatName('')
    setShowCatInput(false)
  }

  const groups = categories.map((cat) => ({
    cat,
    vocabs: filtered.filter((v) => v.categoryIds.includes(cat.id)),
  }))

  const uncategorized = filtered.filter((v) => v.categoryIds.length === 0)
  const hasContent = filtered.length > 0 || categories.length > 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">單字庫</h1>
        <button
          onClick={() => setShowCatInput((s) => !s)}
          className="px-4 py-2 bg-orange-700 text-white rounded-xl text-sm font-semibold hover:bg-orange-800 transition-colors"
        >
          + 新增分類
        </button>
      </div>

      {showCatInput && (
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            autoFocus
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            placeholder="分類名稱..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setShowCatInput(false)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-orange-700 text-white rounded-xl text-sm font-semibold hover:bg-orange-800"
          >
            建立
          </button>
          <button
            type="button"
            onClick={() => setShowCatInput(false)}
            className="px-3 py-2 text-stone-400 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm"
          >
            取消
          </button>
        </form>
      )}

      {categories.length > 0 && (
        <input
          className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          placeholder="搜尋日文、中文..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {!hasContent ? (
        <div className="text-center py-12 text-stone-400">
          <p className="text-4xl mb-3">📂</p>
          <p className="font-medium">先新增分類，再加入單字</p>
          <p className="text-sm mt-1">點右上角「+ 新增分類」開始</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(({ cat, vocabs }) => (
            <CategorySection
              key={cat.id}
              cat={cat}
              name={cat.name}
              vocabs={vocabs}
              categories={categories}
              onDelete={handleDelete}
              onDeleteCategory={handleDeleteCategory}
            />
          ))}
          {uncategorized.length > 0 && (
            <CategorySection
              name="未分類"
              vocabs={uncategorized}
              categories={categories}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

**Step 3: Commit**

```bash
git add app/vocabulary/page.tsx
git commit -m "feat: category management and per-category add word button on vocabulary page"
```

---

## Manual Smoke Test Checklist

After all tasks are complete, open `npm run dev` and verify:

1. 單字庫頁面：
   - [ ] 顯示「先新增分類，再加入單字」引導訊息（無資料時）
   - [ ] 點「+ 新增分類」出現輸入框，輸入後建立分類
   - [ ] 按 Escape 關閉輸入框
   - [ ] 每個分類 header 有「+ 單字」按鈕
   - [ ] 點「+ 單字」進入新增頁，標題顯示正確分類名稱
   - [ ] 分類 header 有 × 按鈕，刪除後顯示確認提示
2. 新增單字頁：
   - [ ] 無分類欄位
   - [ ] 送出後單字出現在對應分類
3. 編輯單字頁：
   - [ ] 無分類欄位
   - [ ] 儲存後分類不變
