# Category Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inline collapsible vocab display on the language page with navigation to a dedicated per-category page.

**Architecture:** Add two server actions (`getVocabularyCounts`, `getCategoryVocabCounts`) to replace `getVocabularies` on the language page; simplify `CategorySection` to a link card; create a new `app/languages/[id]/categories/[categoryId]` route with its own server + client component.

**Tech Stack:** Next.js App Router (server components + server actions), Drizzle ORM, Tailwind CSS, shadcn/ui

---

## File Map

| Action | File |
|--------|------|
| Modify | `lib/actions/vocabulary.ts` |
| Modify | `app/languages/[id]/page.tsx` |
| Modify | `app/languages/[id]/LanguageClient.tsx` |
| Create | `app/languages/[id]/categories/[categoryId]/page.tsx` |
| Create | `app/languages/[id]/categories/[categoryId]/CategoryClient.tsx` |

---

## Task 1: Update vocabulary server actions

**Files:**
- Modify: `lib/actions/vocabulary.ts`

- [ ] **Step 1: Add `categoryId` filter to `getVocabularies`**

In `lib/actions/vocabulary.ts`, update the import line and `getVocabularies` function:

```ts
import { and, eq, isNull, lte, lt, count, sql } from "drizzle-orm";
```

Replace the existing `getVocabularies` function:

```ts
export async function getVocabularies(languageId?: string, categoryId?: string) {
  const userId = await getUserId();
  const conditions = [eq(vocabulary.userId, userId)];
  if (languageId) conditions.push(eq(vocabulary.languageId, languageId));
  if (categoryId === "uncategorized") {
    conditions.push(isNull(vocabulary.categoryId));
  } else if (categoryId) {
    conditions.push(eq(vocabulary.categoryId, categoryId));
  }
  return db
    .select()
    .from(vocabulary)
    .where(and(...conditions))
    .orderBy(vocabulary.createdAt);
}
```

- [ ] **Step 2: Add `getVocabularyCounts`**

Add after `getVocabularies`:

```ts
export async function getVocabularyCounts(
  languageId: string
): Promise<{ total: number; graduated: number }> {
  const userId = await getUserId();
  const [result] = await db
    .select({
      total: count(),
      graduated: sql<number>`count(*) filter (where ${vocabulary.reviewStage} = 6)`,
    })
    .from(vocabulary)
    .where(and(eq(vocabulary.userId, userId), eq(vocabulary.languageId, languageId)));
  return { total: result?.total ?? 0, graduated: Number(result?.graduated ?? 0) };
}
```

- [ ] **Step 3: Add `getCategoryVocabCounts`**

Add after `getVocabularyCounts`:

```ts
export async function getCategoryVocabCounts(
  languageId: string
): Promise<Record<string, number>> {
  const userId = await getUserId();
  const rows = await db
    .select({
      categoryId: vocabulary.categoryId,
      count: count(),
    })
    .from(vocabulary)
    .where(and(eq(vocabulary.userId, userId), eq(vocabulary.languageId, languageId)))
    .groupBy(vocabulary.categoryId);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.categoryId ?? "uncategorized"] = row.count;
  }
  return result;
}
```

- [ ] **Step 4: Update `revalidatePath` calls to cover category sub-routes**

In `createVocabularies`, replace:
```ts
  revalidatePath(`/languages/${languageId}`);
  revalidatePath(`/review/${languageId}`);
```
with:
```ts
  revalidatePath(`/languages/${languageId}`, "layout");
  revalidatePath(`/review/${languageId}`);
```

In `deleteVocabulary`, replace:
```ts
  revalidatePath("/");
  if (languageId) revalidatePath(`/languages/${languageId}`);
```
with:
```ts
  revalidatePath("/");
  if (languageId) revalidatePath(`/languages/${languageId}`, "layout");
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no errors in `lib/actions/vocabulary.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/actions/vocabulary.ts
git commit -m "feat: add getVocabularyCounts, getCategoryVocabCounts; extend getVocabularies with categoryId filter"
```

---

## Task 2: Update language page server component

**Files:**
- Modify: `app/languages/[id]/page.tsx`

- [ ] **Step 1: Replace the page component**

Replace the entire file content:

```tsx
// app/languages/[id]/page.tsx
import { notFound } from "next/navigation";
import LanguageClient from "./LanguageClient";
import { getCategories } from "@/lib/actions/categories";
import { getLanguageById } from "@/lib/actions/languages";
import {
  getVocabularyCounts,
  getCategoryVocabCounts,
  getTodayReviews,
} from "@/lib/actions/vocabulary";

export default async function LanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, reviews, counts, vocabCounts, categories] = await Promise.all([
    getLanguageById(id),
    getTodayReviews(id),
    getVocabularyCounts(id),
    getCategoryVocabCounts(id),
    getCategories(id),
  ]);

  if (!language) notFound();

  return (
    <LanguageClient
      language={language}
      reviewCount={reviews.length}
      totalCount={counts.total}
      graduatedCount={counts.graduated}
      initialCategories={categories}
      vocabCounts={vocabCounts}
    />
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -40
```

Expected: errors only in `LanguageClient.tsx` (prop mismatch) — that's fine, next task fixes it.

- [ ] **Step 3: Commit**

```bash
git add app/languages/\[id\]/page.tsx
git commit -m "feat: use getVocabularyCounts and getCategoryVocabCounts on language page"
```

---

## Task 3: Simplify LanguageClient — CategorySection becomes a link card

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx`

- [ ] **Step 1: Update imports**

Remove `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from the shadcn/ui imports block. Remove `VocabCard` and `createVocabularies` imports. Add `Link` import if not already present (`import Link from "next/link"` — it's already there).

The top of the file should look like:

```tsx
// app/languages/[id]/LanguageClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GraduatedSheet } from "@/components/GraduatedSheet";
import {
  createCategories,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions/categories";
import type { Category, Language } from "@/lib/db/schema";
```

- [ ] **Step 2: Replace `parseBatchVocabLine` and `CategorySection`**

Remove the `parseBatchVocabLine` function entirely (no longer used in this file).

Replace the entire `CategorySection` function with:

```tsx
function CategorySection({
  cat,
  languageId,
  vocabCount,
  categories,
  onDeleteCategory,
  isVirtual = false,
}: {
  cat: Category;
  languageId: string;
  vocabCount: number;
  categories: Category[];
  onDeleteCategory: (id: string) => void;
  isVirtual?: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(cat.name);

  async function handleRename() {
    if (isVirtual) return;
    const trimmed = editName.trim();
    if (!trimmed || trimmed === cat.name) {
      setIsEditing(false);
      setEditName(cat.name);
      return;
    }
    const isDuplicate = categories.some(
      (c) =>
        c.id !== cat.id &&
        c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (isDuplicate) {
      setEditName(cat.name);
      setIsEditing(false);
      return;
    }
    await updateCategory(cat.id, trimmed, languageId);
    setIsEditing(false);
    router.refresh();
  }

  const href = isVirtual
    ? `/languages/${languageId}/categories/uncategorized`
    : `/languages/${languageId}/categories/${cat.id}`;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
        {isEditing ? (
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              autoFocus
              className="h-7 text-sm font-semibold"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditName(cat.name);
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleRename}
              className="shrink-0"
            >
              ✓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setEditName(cat.name);
              }}
              className="shrink-0"
            >
              ✕
            </Button>
          </div>
        ) : (
          <Link
            href={href}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <span className="font-semibold text-foreground truncate min-w-0">
              {cat.name}
            </span>
            <span className="text-sm text-muted-foreground shrink-0">
              {vocabCount} 個單字
            </span>
            <span className="text-muted-foreground text-xs ml-auto">▶</span>
          </Link>
        )}
        {!isEditing && (
          <div className="ml-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 text-muted-foreground"
                >
                  ⋮
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    href={
                      isVirtual
                        ? `/review/${languageId}?categoryId=uncategorized`
                        : `/review/${languageId}?categoryId=${cat.id}`
                    }
                  >
                    複習此分類
                  </Link>
                </DropdownMenuItem>
                {!isVirtual && (
                  <>
                    <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                      重新命名
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => onDeleteCategory(cat.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      刪除分類
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update the `Props` interface and `LanguageClient` component**

Replace the `Props` interface:

```tsx
interface Props {
  language: Language;
  reviewCount: number;
  totalCount: number;
  graduatedCount: number;
  initialCategories: Category[];
  vocabCounts: Record<string, number>;
}
```

In `LanguageClient`, update the destructured props:

```tsx
export default function LanguageClient({
  language,
  reviewCount,
  totalCount,
  graduatedCount,
  initialCategories,
  vocabCounts,
}: Props) {
```

- [ ] **Step 4: Remove vocab-related state and handlers, update `groups`**

Remove the `handleDeleteVocab` function.

Change `pendingDelete` state type — it only handles category deletion now. Replace:
```tsx
  const [pendingDelete, setPendingDelete] = useState<{
    type: "vocab" | "category";
    id: string;
    name: string;
  } | null>(null);
```
with:
```tsx
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
```

Update `handleDeleteCategory`:
```tsx
  function handleDeleteCategory(id: string) {
    const cat = initialCategories.find((c) => c.id === id);
    if (cat) setPendingDelete({ id, name: cat.name });
  }
```

Update `confirmDelete`:
```tsx
  function confirmDelete() {
    if (!pendingDelete) return;
    const snapshot = pendingDelete;
    setPendingDelete(null);
    startTransition(async () => {
      await deleteCategory(snapshot.id, language.id);
    });
  }
```

Replace the `groups` computation:
```tsx
  const virtualCategory: Category = {
    id: UNCATEGORIZED_ID,
    name: "未分類",
    userId: language.userId,
    languageId: language.id,
    createdAt: language.createdAt,
  };

  const groups = [
    { cat: virtualCategory, vocabCount: vocabCounts["uncategorized"] ?? 0, isVirtual: true },
    ...initialCategories.map((cat) => ({
      cat,
      vocabCount: vocabCounts[cat.id] ?? 0,
      isVirtual: false,
    })),
  ];
```

- [ ] **Step 5: Update `CategorySection` usage and the delete dialog**

Replace the `groups.map(...)` block in the JSX:
```tsx
        {groups.map(({ cat, vocabCount, isVirtual }) => (
          <CategorySection
            key={cat.id}
            cat={cat}
            languageId={language.id}
            vocabCount={vocabCount}
            categories={initialCategories}
            onDeleteCategory={handleDeleteCategory}
            isVirtual={isVirtual}
          />
        ))}
```

Update the delete confirmation dialog description (it only handles categories now):
```tsx
              <AlertDialogDescription>
                確定刪除分類「{pendingDelete?.name}」？此分類底下的所有單字將一併刪除，此操作無法復原。
              </AlertDialogDescription>
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | head -60
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add app/languages/\[id\]/LanguageClient.tsx
git commit -m "feat: replace CategorySection collapsible with navigation link card"
```

---

## Task 4: Create category page server component

**Files:**
- Create: `app/languages/[id]/categories/[categoryId]/page.tsx`

- [ ] **Step 1: Create the directory and page file**

```bash
mkdir -p app/languages/\[id\]/categories/\[categoryId\]
```

Create `app/languages/[id]/categories/[categoryId]/page.tsx`:

```tsx
// app/languages/[id]/categories/[categoryId]/page.tsx
import { notFound } from "next/navigation";
import CategoryClient from "./CategoryClient";
import { getCategories } from "@/lib/actions/categories";
import { getLanguageById } from "@/lib/actions/languages";
import { getVocabularies } from "@/lib/actions/vocabulary";
import type { Category } from "@/lib/db/schema";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = await params;
  const [language, categories, vocabs] = await Promise.all([
    getLanguageById(id),
    getCategories(id),
    getVocabularies(id, categoryId),
  ]);

  if (!language) notFound();

  const isVirtual = categoryId === "uncategorized";
  let cat: Category;

  if (isVirtual) {
    cat = {
      id: "uncategorized",
      name: "未分類",
      languageId: id,
      userId: language.userId,
      createdAt: language.createdAt,
    };
  } else {
    const found = categories.find((c) => c.id === categoryId);
    if (!found) notFound();
    cat = found;
  }

  return (
    <CategoryClient
      language={language}
      category={cat}
      initialVocabularies={vocabs}
      isVirtual={isVirtual}
    />
  );
}
```

- [ ] **Step 2: Verify build (will fail until CategoryClient exists — that's expected)**

```bash
npm run build 2>&1 | grep "CategoryClient"
```

Expected: error about missing module `./CategoryClient`.

- [ ] **Step 3: Commit**

```bash
git add "app/languages/[id]/categories/[categoryId]/page.tsx"
git commit -m "feat: add category page server component"
```

---

## Task 5: Create CategoryClient

**Files:**
- Create: `app/languages/[id]/categories/[categoryId]/CategoryClient.tsx`

- [ ] **Step 1: Create the file**

Create `app/languages/[id]/categories/[categoryId]/CategoryClient.tsx`:

```tsx
// app/languages/[id]/categories/[categoryId]/CategoryClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import VocabCard from "@/components/VocabCard";
import { createVocabularies, deleteVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Language, Vocabulary } from "@/lib/db/schema";

function parseBatchVocabLine(
  line: string,
  isChineseLanguage: boolean,
): { back: string; front: string; exampleJp: string; zhuyin: string } | null {
  const parts = line.includes("\t") ? line.split("\t") : line.split("|");
  const [front, back, third] = parts.map((p) => p.trim());
  if (!front || !back) return null;
  return {
    front,
    back,
    exampleJp: isChineseLanguage ? "" : (third ?? ""),
    zhuyin: isChineseLanguage ? (third ?? "") : "",
  };
}

interface Props {
  language: Language;
  category: Category;
  initialVocabularies: Vocabulary[];
  isVirtual: boolean;
}

export default function CategoryClient({
  language,
  category,
  initialVocabularies,
  isVirtual,
}: Props) {
  const router = useRouter();
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchErrors, setBatchErrors] = useState<number[]>([]);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const isChineseLanguage = language.ttsCode === "zh-TW";
  const pendingDeleteVocab = initialVocabularies.find((v) => v.id === pendingDeleteId);

  async function handleBatchCreate() {
    const lines = batchText.split("\n").filter((l) => l.trim());
    const errorLines: number[] = [];
    const items: {
      back: string;
      front: string;
      exampleJp: string;
      zhuyin: string;
    }[] = [];

    lines.forEach((line, i) => {
      const parsed = parseBatchVocabLine(line, isChineseLanguage);
      if (!parsed) errorLines.push(i + 1);
      else items.push(parsed);
    });

    if (errorLines.length > 0) {
      setBatchErrors(errorLines);
      return;
    }
    if (items.length === 0) return;

    setIsBatchSubmitting(true);
    await createVocabularies(items, language.id, isVirtual ? null : category.id);
    setIsBatchSubmitting(false);
    setBatchOpen(false);
    setBatchText("");
    setBatchErrors([]);
    router.refresh();
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    await deleteVocabulary(pendingDeleteId, language.id);
    setPendingDeleteId(null);
    router.refresh();
  }

  const newVocabHref = isVirtual
    ? `/vocabulary/new?languageId=${language.id}`
    : `/vocabulary/new?languageId=${language.id}&categoryId=${category.id}`;

  return (
    <div className="flex flex-col gap-6">
      {/* 返回 */}
      <div>
        <Link
          href={`/languages/${language.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {language.name}
        </Link>
      </div>

      {/* 標題列 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {initialVocabularies.length} 個單字
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              setBatchOpen(true);
              setBatchText("");
              setBatchErrors([]);
            }}
          >
            批次新增
          </Button>
          <Button asChild>
            <Link href={newVocabHref}>+ 新增單字</Link>
          </Button>
        </div>
      </div>

      {/* 單字列表 */}
      <div className="flex flex-col gap-2">
        {initialVocabularies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            還沒有單字，點「+ 新增單字」開始新增
          </p>
        ) : (
          initialVocabularies.map((vocab) => (
            <VocabCard
              key={vocab.id}
              vocab={vocab}
              ttsCode={language.ttsCode}
              onDelete={() => setPendingDeleteId(vocab.id)}
            />
          ))
        )}
      </div>

      {/* 刪除確認 */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定刪除「{pendingDeleteVocab?.front}」？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批次新增 */}
      <Dialog
        open={batchOpen}
        onOpenChange={(o) => {
          setBatchOpen(o);
          if (!o) {
            setBatchText("");
            setBatchErrors([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次新增單字 — {category.name}</DialogTitle>
            <DialogDescription>
              {isChineseLanguage
                ? "每行一筆：母語 | 目標語言 | 注音（選填）"
                : "每行一筆：翻譯 | 目標語單字 | 例句（選填）"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              rows={8}
              placeholder={"吃 | 食べる | 私はご飯を食べる\n喝 | 飲む"}
              value={batchText}
              onChange={(e) => {
                setBatchText(e.target.value);
                if (batchErrors.length > 0) setBatchErrors([]);
              }}
            />
            {batchErrors.length > 0 && (
              <p className="text-sm text-destructive">
                {isChineseLanguage
                  ? "以下行格式有誤（需至少「母語 | 目標語言」）："
                  : "以下行格式有誤（需至少「翻譯 | 目標語單字」）："}
                {batchErrors.map((n) => (
                  <span key={n} className="block font-medium">
                    ・第 {n} 行
                  </span>
                ))}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBatchCreate} disabled={isBatchSubmitting}>
              {isBatchSubmitting ? "新增中…" : "新增"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify full build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add "app/languages/[id]/categories/[categoryId]/CategoryClient.tsx"
git commit -m "feat: add category page client — vocab list, add, batch add, delete"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - ✅ New route `/languages/[id]/categories/[categoryId]` — Task 4 + 5
  - ✅ `uncategorized` special value — Task 4 page.tsx + Task 5 href logic
  - ✅ `getVocabularies` with `categoryId` filter — Task 1
  - ✅ `getVocabularyCounts` — Task 1
  - ✅ Language page removes `initialVocabularies` — Task 2 + 3
  - ✅ CategorySection → link card — Task 3
  - ✅ Dropdown: removes 新增單字/批次新增, keeps 複習/重新命名/刪除 — Task 3
  - ✅ Category page: back button, heading, vocab count, add button, batch add button — Task 5
  - ✅ Category page: VocabCard with edit + delete — Task 5
  - ✅ Empty state — Task 5
- [x] **No placeholders** — all steps have complete code
- [x] **Type consistency** — `vocabCounts: Record<string, number>` used consistently across Task 2 (page.tsx), Task 3 (Props interface + groups), and Task 5 (CategoryClient accesses `vocabCounts` via prop)
