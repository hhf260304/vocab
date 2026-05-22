# 語言頁單字/句子管理分拆 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將語言頁拆成「語言入口（兩張卡片）」、「單字管理子頁」、「句子管理子頁（含句子分類）」三層結構，並在 `categories` 表加 `type` 欄位區分單字分類與句子分類。

**Architecture:** 改寫 `/languages/[id]` 為輕量入口頁（兩張卡片）；新增 `/languages/[id]/vocabulary` 承接現有單字管理功能；重構 `/languages/[id]/sentences` 為句子分類管理頁；新增 `/languages/[id]/sentences/[categoryId]` 顯示分類內句子 CRUD。`categories` 表新增 `type TEXT NOT NULL DEFAULT 'vocab'` 欄位。

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Neon PostgreSQL, Tailwind CSS v4, shadcn/ui, TypeScript

---

## 檔案清單

| 路徑 | 動作 | 說明 |
|------|------|------|
| `lib/db/schema.ts` | 修改 | 加 `type` 欄位到 `categories` |
| `drizzle/0006_*.sql` | 新增（自動產生） | Migration SQL |
| `drizzle/meta/0006_snapshot.json` | 新增（自動產生） | Drizzle snapshot |
| `lib/actions/categories.ts` | 修改 | `getCategories`/`createCategory` 加 `type` 參數；revalidatePath 加子路由 |
| `lib/actions/sentences.ts` | 修改 | 新增 `getCategorySentenceCounts` |
| `app/languages/[id]/page.tsx` | 改寫 | 載入 vocab + sentence 摘要資料 |
| `app/languages/[id]/LanguageClient.tsx` | 改寫 | 改為兩張入口卡片 |
| `app/languages/[id]/vocabulary/page.tsx` | 新增 | 單字管理 server component |
| `app/languages/[id]/vocabulary/VocabularyClient.tsx` | 新增 | 從舊 LanguageClient 提取單字管理邏輯 |
| `app/languages/[id]/sentences/page.tsx` | 改寫 | 載入句子分類資料 |
| `app/languages/[id]/sentences/SentencesClient.tsx` | 改寫 | 句子分類管理 hub |
| `app/languages/[id]/sentences/[categoryId]/page.tsx` | 新增 | 分類內句子 server component |
| `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx` | 新增 | 分類內句子 CRUD |

---

## Task 1: Schema — 在 categories 加 `type` 欄位

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: 更新 schema**

在 `lib/db/schema.ts` 的 `categories` 表加入 `type` 欄位（第 38 行之後，`createdAt` 之前）：

```ts
// lib/db/schema.ts
export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  languageId: text("language_id").references(() => languages.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  type: text("type").notNull().default("vocab"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});
```

- [ ] **Step 2: 產生 migration**

```bash
npx drizzle-kit generate
```

預期輸出：在 `drizzle/` 目錄下產生 `0006_*.sql` 和 `drizzle/meta/0006_snapshot.json`。

- [ ] **Step 3: 套用 migration**

```bash
npx drizzle-kit push
```

預期輸出：`All migrations are up to date` 或類似成功訊息。

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat(schema): 在 categories 表新增 type 欄位"
```

---

## Task 2: Actions — 更新 categories，新增 getCategorySentenceCounts

**Files:**
- Modify: `lib/actions/categories.ts`
- Modify: `lib/actions/sentences.ts`

- [ ] **Step 1: 更新 `lib/actions/categories.ts`**

完整取代整個檔案：

```ts
// lib/actions/categories.ts
"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  return session.user.id;
}

export async function getCategories(
  languageId: string,
  type?: "vocab" | "sentence"
) {
  const userId = await getUserId();
  const conditions = [
    eq(categories.userId, userId),
    eq(categories.languageId, languageId),
  ];
  if (type) conditions.push(eq(categories.type, type));
  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(categories.createdAt);
}

export async function createCategory(
  name: string,
  languageId: string,
  type: "vocab" | "sentence" = "vocab"
) {
  const userId = await getUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分類名稱不能為空");

  const [created] = await db
    .insert(categories)
    .values({ userId, name: trimmed, languageId, type })
    .returning();

  revalidatePath(`/languages/${languageId}`, "layout");
  return created;
}

export async function deleteCategory(id: string, languageId: string) {
  const userId = await getUserId();
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  revalidatePath(`/languages/${languageId}`, "layout");
}

export async function updateCategory(id: string, name: string, languageId: string) {
  const userId = await getUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("分類名稱不能為空");

  await db
    .update(categories)
    .set({ name: trimmed })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  revalidatePath(`/languages/${languageId}`, "layout");
}
```

- [ ] **Step 2: 在 `lib/actions/sentences.ts` 新增 `getCategorySentenceCounts`**

在檔案最後（`markSentenceReview` 之後）加入：

```ts
export async function getCategorySentenceCounts(
  languageId: string
): Promise<Record<string, number>> {
  const userId = await getUserId();
  const rows = await db
    .select({
      categoryId: sentences.categoryId,
      total: count(),
    })
    .from(sentences)
    .where(and(eq(sentences.userId, userId), eq(sentences.languageId, languageId)))
    .groupBy(sentences.categoryId);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.categoryId ?? "uncategorized"] = row.total;
  }
  return result;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/categories.ts lib/actions/sentences.ts
git commit -m "feat(actions): getCategories/createCategory 加 type 參數；新增 getCategorySentenceCounts"
```

---

## Task 3: 語言入口頁改寫（/languages/[id]）

**Files:**
- Modify: `app/languages/[id]/page.tsx`
- Modify: `app/languages/[id]/LanguageClient.tsx`

- [ ] **Step 1: 改寫 `app/languages/[id]/page.tsx`**

```tsx
// app/languages/[id]/page.tsx
import { notFound } from "next/navigation";
import LanguageClient from "./LanguageClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getVocabularyCounts, getTodayReviews } from "@/lib/actions/vocabulary";
import { getSentenceCounts, getTodaySentenceReviews } from "@/lib/actions/sentences";

export default async function LanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, vocabReviews, vocabCounts, sentenceCounts, sentenceReviews] =
    await Promise.all([
      getLanguageById(id),
      getTodayReviews(id),
      getVocabularyCounts(id),
      getSentenceCounts(id),
      getTodaySentenceReviews(id),
    ]);

  if (!language) notFound();

  return (
    <LanguageClient
      language={language}
      vocabReviewCount={vocabReviews.length}
      vocabTotal={vocabCounts.total}
      sentenceReviewCount={sentenceReviews.length}
      sentenceTotal={sentenceCounts.total}
    />
  );
}
```

- [ ] **Step 2: 改寫 `app/languages/[id]/LanguageClient.tsx`**

```tsx
// app/languages/[id]/LanguageClient.tsx
"use client";

import { BarChart2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/db/schema";

interface Props {
  language: Language;
  vocabReviewCount: number;
  vocabTotal: number;
  sentenceReviewCount: number;
  sentenceTotal: number;
}

export default function LanguageClient({
  language,
  vocabReviewCount,
  vocabTotal,
  sentenceReviewCount,
  sentenceTotal,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{language.name}</h1>
        <Button variant="outline" asChild>
          <Link href={`/languages/${language.id}/stats`}>
            <BarChart2 className="w-4 h-4 mr-1" />統計
          </Link>
        </Button>
      </div>

      <Link
        href={`/languages/${language.id}/vocabulary`}
        className="block bg-primary/10 border border-primary/20 rounded-2xl p-5 hover:bg-primary/15 hover:border-primary/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground text-lg">📚 單字管理</p>
            <p className="text-sm text-muted-foreground mt-0.5">分類 · 新增 · 複習</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{vocabTotal}</p>
            <p className="text-xs text-muted-foreground">個單字</p>
          </div>
        </div>
        {vocabReviewCount > 0 && (
          <div className="mt-3 bg-primary/20 rounded-lg px-3 py-1.5 text-sm text-primary font-medium text-center">
            待複習 {vocabReviewCount} 個 →
          </div>
        )}
      </Link>

      <Link
        href={`/languages/${language.id}/sentences`}
        className="block bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-foreground text-lg">💬 句子管理</p>
            <p className="text-sm text-muted-foreground mt-0.5">分類 · 新增 · 複習</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-500">{sentenceTotal}</p>
            <p className="text-xs text-muted-foreground">個句子</p>
          </div>
        </div>
        {sentenceReviewCount > 0 && (
          <div className="mt-3 bg-emerald-500/20 rounded-lg px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium text-center">
            待複習 {sentenceReviewCount} 個 →
          </div>
        )}
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: 手動驗證**

執行 `npm run dev`，前往任一語言頁（`/languages/[id]`），確認：
- 顯示語言名稱 + 統計按鈕
- 兩張入口卡片正確顯示單字數、句子數
- 有待複習資料時出現「待複習 N 個 →」橫條
- 點擊兩張卡片分別前往（目前 404 是正常的，下一步實作）

- [ ] **Step 4: Commit**

```bash
git add app/languages/\[id\]/page.tsx app/languages/\[id\]/LanguageClient.tsx
git commit -m "feat(language): 改寫語言頁為單字/句子入口卡片"
```

---

## Task 4: 新增單字管理頁（/languages/[id]/vocabulary）

**Files:**
- Create: `app/languages/[id]/vocabulary/page.tsx`
- Create: `app/languages/[id]/vocabulary/VocabularyClient.tsx`

- [ ] **Step 1: 建立 `app/languages/[id]/vocabulary/page.tsx`**

```tsx
// app/languages/[id]/vocabulary/page.tsx
import { notFound } from "next/navigation";
import VocabularyClient from "./VocabularyClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import {
  getVocabularyCounts,
  getCategoryVocabCounts,
  getTodayReviews,
} from "@/lib/actions/vocabulary";

export default async function VocabularyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, reviews, counts, vocabCounts, initialCategories] =
    await Promise.all([
      getLanguageById(id),
      getTodayReviews(id),
      getVocabularyCounts(id),
      getCategoryVocabCounts(id),
      getCategories(id, "vocab"),
    ]);

  if (!language) notFound();

  return (
    <VocabularyClient
      language={language}
      reviewCount={reviews.length}
      totalCount={counts.total}
      graduatedCount={counts.graduated}
      initialCategories={initialCategories}
      vocabCounts={vocabCounts}
    />
  );
}
```

- [ ] **Step 2: 建立 `app/languages/[id]/vocabulary/VocabularyClient.tsx`**

```tsx
// app/languages/[id]/vocabulary/VocabularyClient.tsx
"use client";

import { ArrowLeft, FolderPlus, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduatedSheet } from "@/components/GraduatedSheet";
import { createCategory } from "@/lib/actions/categories";
import type { Category, Language } from "@/lib/db/schema";

const UNCATEGORIZED_ID = "uncategorized";

function CategorySection({
  cat,
  languageId,
  vocabCount,
  isVirtual = false,
}: {
  cat: Category;
  languageId: string;
  vocabCount: number;
  isVirtual?: boolean;
}) {
  const href = isVirtual
    ? `/languages/${languageId}/categories/uncategorized`
    : `/languages/${languageId}/categories/${cat.id}`;

  return (
    <Link
      href={href}
      className="bg-card rounded-2xl border border-border overflow-hidden flex items-center gap-2 px-5 py-3.5 hover:bg-muted/60 hover:border-primary/30 transition-all active:scale-[0.99] cursor-pointer"
    >
      <span className="font-semibold text-foreground truncate min-w-0">
        {cat.name}
      </span>
      <span className="text-sm text-muted-foreground shrink-0 ml-auto">
        {vocabCount} 個單字
      </span>
    </Link>
  );
}

interface Props {
  language: Language;
  reviewCount: number;
  totalCount: number;
  graduatedCount: number;
  initialCategories: Category[];
  vocabCounts: Record<string, number>;
}

export default function VocabularyClient({
  language,
  reviewCount,
  totalCount,
  graduatedCount,
  initialCategories,
  vocabCounts,
}: Props) {
  const [, startTransition] = useTransition();
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const isDuplicate = initialCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCatError(`「${trimmed}」分類已存在`);
      return;
    }
    startTransition(async () => {
      await createCategory(trimmed, language.id, "vocab");
    });
    setNewCatName("");
    setCatError("");
    setShowCatInput(false);
  }

  const realUncategorized = initialCategories.find((c) => c.name === "未分類");
  const otherCategories = initialCategories.filter((c) => c.name !== "未分類");

  const virtualCategory: Category = {
    id: UNCATEGORIZED_ID,
    name: "未分類",
    userId: language.userId,
    languageId: language.id,
    type: "vocab",
    createdAt: language.createdAt,
  };

  const groups = realUncategorized
    ? [
        {
          cat: realUncategorized,
          vocabCount: vocabCounts[realUncategorized.id] ?? 0,
          isVirtual: false,
        },
        ...otherCategories.map((cat) => ({
          cat,
          vocabCount: vocabCounts[cat.id] ?? 0,
          isVirtual: false,
        })),
      ]
    : [
        {
          cat: virtualCategory,
          vocabCount: vocabCounts["uncategorized"] ?? 0,
          isVirtual: true,
        },
        ...initialCategories.map((cat) => ({
          cat,
          vocabCount: vocabCounts[cat.id] ?? 0,
          isVirtual: false,
        })),
      ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          asChild
        >
          <Link href={`/languages/${language.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {language.name}
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-foreground">單字管理</h1>

      {/* 統計格 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{reviewCount}</p>
          <p className="text-xs text-muted-foreground mt-1">待複習</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">總單字</p>
        </div>
        <GraduatedSheet languageId={language.id} totalCount={graduatedCount}>
          <div className="bg-card border border-border rounded-2xl p-4 text-center cursor-pointer hover:bg-accent transition-colors">
            <p className="text-2xl font-bold text-foreground">{graduatedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">已畢業</p>
          </div>
        </GraduatedSheet>
      </div>

      {/* 複習按鈕 */}
      {reviewCount > 0 ? (
        <Button
          size="lg"
          className="w-full text-lg py-7 active:scale-[0.98] transition-transform"
          asChild
        >
          <Link href={`/review/${language.id}`}>
            開始複習（{reviewCount} 個）
          </Link>
        </Button>
      ) : (
        <Button size="lg" className="w-full text-lg py-7" disabled>
          今日無待複習單字
        </Button>
      )}

      {/* 單字庫 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">單字庫</h2>
          <div className="flex gap-2">
            <Button onClick={() => setShowCatInput((s) => !s)}>
              <FolderPlus className="w-4 h-4 mr-1" />新增分類
            </Button>
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
          </div>
        </div>

        {showCatInput && (
          <div className="flex flex-col gap-1.5">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <Input
                autoFocus
                className="flex-1"
                placeholder="分類名稱..."
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (catError) setCatError("");
                }}
                onKeyDown={(e) => e.key === "Escape" && setShowCatInput(false)}
              />
              <Button type="submit" className="shrink-0">
                <Plus className="w-4 h-4 mr-1" />建立
              </Button>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  setShowCatInput(false);
                  setNewCatName("");
                  setCatError("");
                }}
              >
                取消
              </Button>
            </form>
            {catError && <p className="text-destructive text-sm">{catError}</p>}
          </div>
        )}

        {groups.map(({ cat, vocabCount, isVirtual }) => (
          <CategorySection
            key={cat.id}
            cat={cat}
            languageId={language.id}
            vocabCount={vocabCount}
            isVirtual={isVirtual}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 手動驗證**

前往 `/languages/[id]/vocabulary`，確認：
- 返回按鈕顯示語言名稱，點擊回到語言入口頁
- 統計格顯示待複習、總單字、已畢業
- 複習按鈕運作（有待複習資料時可點擊、無時 disabled）
- 新增分類表單開關正常
- 分類卡片列表顯示，點擊進入分類頁

- [ ] **Step 4: Commit**

```bash
git add "app/languages/[id]/vocabulary/"
git commit -m "feat(vocabulary): 新增單字管理子頁"
```

---

## Task 5: 改寫句子管理頁為分類 hub（/languages/[id]/sentences）

**Files:**
- Modify: `app/languages/[id]/sentences/page.tsx`
- Modify: `app/languages/[id]/sentences/SentencesClient.tsx`

- [ ] **Step 1: 改寫 `app/languages/[id]/sentences/page.tsx`**

```tsx
// app/languages/[id]/sentences/page.tsx
import { notFound } from "next/navigation";
import SentencesClient from "./SentencesClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import {
  getSentenceCounts,
  getTodaySentenceReviews,
  getCategorySentenceCounts,
} from "@/lib/actions/sentences";

export default async function SentencesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, sentenceCounts, sentenceReviews, initialCategories, categoryCounts] =
    await Promise.all([
      getLanguageById(id),
      getSentenceCounts(id),
      getTodaySentenceReviews(id),
      getCategories(id, "sentence"),
      getCategorySentenceCounts(id),
    ]);

  if (!language) notFound();

  return (
    <SentencesClient
      language={language}
      totalCount={sentenceCounts.total}
      reviewCount={sentenceReviews.length}
      initialCategories={initialCategories}
      categoryCounts={categoryCounts}
    />
  );
}
```

- [ ] **Step 2: 改寫 `app/languages/[id]/sentences/SentencesClient.tsx`**

```tsx
// app/languages/[id]/sentences/SentencesClient.tsx
"use client";

import { ArrowLeft, BookOpen, FolderPlus, Plus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategory } from "@/lib/actions/categories";
import type { Category, Language } from "@/lib/db/schema";

const UNCATEGORIZED_ID = "uncategorized";

function SentenceCategoryCard({
  cat,
  languageId,
  sentenceCount,
  isVirtual = false,
}: {
  cat: Category;
  languageId: string;
  sentenceCount: number;
  isVirtual?: boolean;
}) {
  const href = isVirtual
    ? `/languages/${languageId}/sentences/uncategorized`
    : `/languages/${languageId}/sentences/${cat.id}`;

  return (
    <Link
      href={href}
      className="bg-card rounded-2xl border border-border overflow-hidden flex items-center gap-2 px-5 py-3.5 hover:bg-muted/60 hover:border-emerald-500/30 transition-all active:scale-[0.99] cursor-pointer"
    >
      <span className="font-semibold text-foreground truncate min-w-0">
        {cat.name}
      </span>
      <span className="text-sm text-muted-foreground shrink-0 ml-auto">
        {sentenceCount} 個句子
      </span>
    </Link>
  );
}

interface Props {
  language: Language;
  totalCount: number;
  reviewCount: number;
  initialCategories: Category[];
  categoryCounts: Record<string, number>;
}

export default function SentencesClient({
  language,
  totalCount,
  reviewCount,
  initialCategories,
  categoryCounts,
}: Props) {
  const [, startTransition] = useTransition();
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const isDuplicate = initialCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setCatError(`「${trimmed}」分類已存在`);
      return;
    }
    startTransition(async () => {
      await createCategory(trimmed, language.id, "sentence");
    });
    setNewCatName("");
    setCatError("");
    setShowCatInput(false);
  }

  const virtualCategory: Category = {
    id: UNCATEGORIZED_ID,
    name: "未分類",
    userId: language.userId,
    languageId: language.id,
    type: "sentence",
    createdAt: language.createdAt,
  };

  const groups = [
    {
      cat: virtualCategory,
      sentenceCount: categoryCounts["uncategorized"] ?? 0,
      isVirtual: true,
    },
    ...initialCategories.map((cat) => ({
      cat,
      sentenceCount: categoryCounts[cat.id] ?? 0,
      isVirtual: false,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          asChild
        >
          <Link href={`/languages/${language.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {language.name}
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-foreground">句子管理</h1>

      {/* 統計格 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{reviewCount}</p>
          <p className="text-xs text-muted-foreground mt-1">待複習</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">總句子</p>
        </div>
      </div>

      {/* 複習按鈕 */}
      {reviewCount > 0 ? (
        <Button
          size="lg"
          variant="outline"
          className="w-full text-base py-6 active:scale-[0.98] transition-transform border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
          asChild
        >
          <Link href={`/sentences/${language.id}/review`}>
            <BookOpen className="w-5 h-5 mr-2" />
            複習句子（{reviewCount} 個）
          </Link>
        </Button>
      ) : (
        <Button
          size="lg"
          variant="outline"
          className="w-full text-base py-6"
          disabled
        >
          <BookOpen className="w-5 h-5 mr-2" />
          今日無待複習句子
        </Button>
      )}

      {/* 句子庫 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">句子庫</h2>
          <Button onClick={() => setShowCatInput((s) => !s)}>
            <FolderPlus className="w-4 h-4 mr-1" />新增分類
          </Button>
        </div>

        {showCatInput && (
          <div className="flex flex-col gap-1.5">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <Input
                autoFocus
                className="flex-1"
                placeholder="分類名稱..."
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  if (catError) setCatError("");
                }}
                onKeyDown={(e) => e.key === "Escape" && setShowCatInput(false)}
              />
              <Button type="submit" className="shrink-0">
                <Plus className="w-4 h-4 mr-1" />建立
              </Button>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  setShowCatInput(false);
                  setNewCatName("");
                  setCatError("");
                }}
              >
                取消
              </Button>
            </form>
            {catError && <p className="text-destructive text-sm">{catError}</p>}
          </div>
        )}

        {groups.map(({ cat, sentenceCount, isVirtual }) => (
          <SentenceCategoryCard
            key={cat.id}
            cat={cat}
            languageId={language.id}
            sentenceCount={sentenceCount}
            isVirtual={isVirtual}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 手動驗證**

前往 `/languages/[id]/sentences`，確認：
- 返回按鈕顯示語言名稱
- 統計格（待複習 / 總句子）正確
- 複習按鈕狀態正確
- 顯示「未分類」虛擬卡片 + 已建立的句子分類卡片
- 點擊「新增分類」可輸入並建立句子分類

- [ ] **Step 4: Commit**

```bash
git add "app/languages/[id]/sentences/page.tsx" "app/languages/[id]/sentences/SentencesClient.tsx"
git commit -m "feat(sentences): 改寫句子管理頁為分類 hub"
```

---

## Task 6: 新增句子分類頁（/languages/[id]/sentences/[categoryId]）

**Files:**
- Create: `app/languages/[id]/sentences/[categoryId]/page.tsx`
- Create: `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx`

- [ ] **Step 1: 建立 `app/languages/[id]/sentences/[categoryId]/page.tsx`**

```tsx
// app/languages/[id]/sentences/[categoryId]/page.tsx
import { notFound } from "next/navigation";
import SentenceCategoryClient from "./SentenceCategoryClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import { getSentences } from "@/lib/actions/sentences";

export default async function SentenceCategoryPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = await params;
  const [language, categories, sentenceList] = await Promise.all([
    getLanguageById(id),
    getCategories(id, "sentence"),
    getSentences(id, categoryId),
  ]);

  if (!language) notFound();

  const categoryName =
    categoryId === "uncategorized"
      ? "未分類"
      : categories.find((c) => c.id === categoryId)?.name;

  if (!categoryName) notFound();

  return (
    <SentenceCategoryClient
      language={language}
      categoryId={categoryId}
      categoryName={categoryName}
      categories={categories}
      initialSentences={sentenceList}
    />
  );
}
```

- [ ] **Step 2: 建立 `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx`**

```tsx
// app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx
"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSentence, updateSentence, deleteSentence } from "@/lib/actions/sentences";
import type { Category, Language, Sentence } from "@/lib/db/schema";

interface Props {
  language: Language;
  categoryId: string;
  categoryName: string;
  categories: Category[];
  initialSentences: Sentence[];
}

interface EditState {
  front: string;
  back: string;
  categoryId: string;
}

export default function SentenceCategoryClient({
  language,
  categoryId,
  categoryName,
  categories,
  initialSentences,
}: Props) {
  const [, startTransition] = useTransition();

  const [sentences, setSentences] = useState(initialSentences);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    front: "",
    back: "",
    categoryId: "none",
  });

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const defaultCategoryId = categoryId === "uncategorized" ? null : categoryId;

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const front = newFront.trim();
    const back = newBack.trim();
    if (!front || !back) {
      setAddError("句子和翻譯都是必填");
      return;
    }
    startTransition(async () => {
      const created = await createSentence({
        front,
        back,
        languageId: language.id,
        categoryId: defaultCategoryId,
      });
      setSentences((prev) => [...prev, created]);
      setNewFront("");
      setNewBack("");
      setAddError("");
      setShowAddForm(false);
    });
  }

  function startEdit(sentence: Sentence) {
    setEditingId(sentence.id);
    setEditState({
      front: sentence.front,
      back: sentence.back,
      categoryId: sentence.categoryId ?? "none",
    });
  }

  function handleEditSubmit(id: string) {
    const front = editState.front.trim();
    const back = editState.back.trim();
    if (!front || !back) return;
    const newCatId =
      editState.categoryId === "none" ? null : editState.categoryId;
    startTransition(async () => {
      await updateSentence(id, { front, back, categoryId: newCatId });
      setSentences((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, front, back, categoryId: newCatId } : s
        )
      );
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSentence(id, language.id);
      setSentences((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          asChild
        >
          <Link href={`/languages/${language.id}/sentences`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            句子管理
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{categoryName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language.name} · {sentences.length} 個句子
          </p>
        </div>
        <Button onClick={() => setShowAddForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-1" />新增句子
        </Button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3"
        >
          <h2 className="font-semibold text-foreground">新增句子</h2>
          <div className="flex flex-col gap-2">
            <Input
              autoFocus
              placeholder={`句子（${language.name}）`}
              value={newFront}
              onChange={(e) => {
                setNewFront(e.target.value);
                setAddError("");
              }}
            />
            <Input
              placeholder="翻譯（母語）"
              value={newBack}
              onChange={(e) => {
                setNewBack(e.target.value);
                setAddError("");
              }}
            />
          </div>
          {addError && <p className="text-destructive text-sm">{addError}</p>}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddForm(false);
                setAddError("");
              }}
            >
              取消
            </Button>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-1" />新增
            </Button>
          </div>
        </form>
      )}

      {sentences.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center text-muted-foreground">
          <p className="text-lg font-medium">還沒有句子</p>
          <p className="text-sm">點擊「新增句子」開始加入</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sentences.map((sentence) => {
          const isEditing = editingId === sentence.id;

          if (isEditing) {
            return (
              <div
                key={sentence.id}
                className="bg-card border border-primary/40 rounded-2xl p-4 flex flex-col gap-2"
              >
                <Input
                  autoFocus
                  value={editState.front}
                  onChange={(e) =>
                    setEditState((s) => ({ ...s, front: e.target.value }))
                  }
                  placeholder="句子"
                />
                <Input
                  value={editState.back}
                  onChange={(e) =>
                    setEditState((s) => ({ ...s, back: e.target.value }))
                  }
                  placeholder="翻譯"
                />
                {categories.length > 0 && (
                  <Select
                    value={editState.categoryId}
                    onValueChange={(v) =>
                      setEditState((s) => ({ ...s, categoryId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇分類" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">無分類</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex gap-2 justify-end mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-4 h-4 mr-1" />取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEditSubmit(sentence.id)}
                  >
                    <Check className="w-4 h-4 mr-1" />儲存
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={sentence.id}
              className="bg-card border border-border rounded-2xl px-5 py-4 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-base leading-snug">
                  {sentence.front}
                </p>
                <p className="text-muted-foreground text-sm mt-1 leading-snug">
                  {sentence.back}
                </p>
                {sentence.categoryId && categoryMap[sentence.categoryId] && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {categoryMap[sentence.categoryId]}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => startEdit(sentence)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>刪除句子？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{sentence.front}」將被永久刪除，無法復原。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleDelete(sentence.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />刪除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 手動驗證**

前往 `/languages/[id]/sentences`，點擊「未分類」分類卡片，確認：
- 前往 `/languages/[id]/sentences/uncategorized`
- 返回按鈕指向句子管理頁
- 可新增、編輯、刪除句子
- 編輯時可更換分類（移動到其他分類）

新增一個句子分類後點進去，確認同樣功能正常。

- [ ] **Step 4: Commit**

```bash
git add "app/languages/[id]/sentences/[categoryId]/"
git commit -m "feat(sentences): 新增句子分類頁（分類內 CRUD）"
```

---

## Task 7: 整合驗證

- [ ] **Step 1: 完整功能流程測試**

執行 `npm run lint` 確認無 lint 錯誤：
```bash
npm run lint
```

- [ ] **Step 2: 手動走完完整流程**

1. 首頁 → 選擇語言 → 看到兩張入口卡片
2. 點擊「單字管理」→ 看到統計 + 複習按鈕 + 分類列表
3. 新增一個單字分類 → 分類出現在列表
4. 點擊返回 → 回到語言入口頁
5. 點擊「句子管理」→ 看到統計 + 複習按鈕 + 句子分類列表
6. 新增一個句子分類 → 分類出現在列表
7. 點擊句子分類 → 進入分類內頁
8. 新增一個句子 → 句子出現
9. 編輯句子 → 成功更新
10. 刪除句子 → 句子消失
11. 回到句子管理頁 → 分類卡片的數量正確更新

- [ ] **Step 3: 確認舊路由不受影響**

確認以下路由仍正常：
- `/review/[languageId]`（單字複習頁）
- `/sentences/[languageId]/review`（句子複習頁）
- `/languages/[id]/categories/[categoryId]`（單字分類頁）
- `/languages/[id]/stats`（統計頁）
