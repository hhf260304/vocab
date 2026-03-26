# 未分類預設分類 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Always show "未分類" as the first, fully-functional category section (add vocab, batch add, review) that cannot be renamed or deleted.

**Architecture:** UI-only virtual category — no DB changes. A sentinel object with `id = "__uncategorized__"` is prepended to the category list in `LanguageClient`. `CategorySection` gains an `isVirtual` prop that hides rename/delete and routes actions correctly for null `categoryId`. The review action learns to handle the `"uncategorized"` URL sentinel.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM (Neon PostgreSQL), Tailwind CSS, shadcn/ui

---

## File Map

| File | Change |
|------|--------|
| `lib/actions/vocabulary.ts` | `createVocabularies` signature: `string` → `string \| null`; `getTodayReviews`: handle `"uncategorized"` sentinel with `isNull` |
| `app/languages/[id]/LanguageClient.tsx` | Add sentinel constant + virtual category; add `isVirtual` prop to `CategorySection`; remove old static uncategorized section and empty state |

---

## Task 1: Fix `createVocabularies` signature and `getTodayReviews` sentinel

**Files:**
- Modify: `lib/actions/vocabulary.ts`

### Background

`createVocabularies` currently types `categoryId` as `string`, which prevents passing `null` for uncategorized vocab. `getTodayReviews` uses a truthy check for `categoryId`, so passing `"uncategorized"` would try to match a literal string in the DB column — we need an `isNull` filter instead.

- [ ] **Step 1: Update `createVocabularies` signature**

In `lib/actions/vocabulary.ts` line 104, change `categoryId: string` to `categoryId: string | null`.

The full function after change (lines 101–124):
```ts
export async function createVocabularies(
  items: { front: string; back: string; exampleJp: string; zhuyin: string }[],
  languageId: string,
  categoryId: string | null
): Promise<{ created: number }> {
  const userId = await getUserId();
  if (items.length === 0) return { created: 0 };

  await db.insert(vocabulary).values(
    items.map((item) => ({
      userId,
      languageId,
      categoryId,
      front: item.front,
      back: item.back,
      exampleJp: item.exampleJp,
      zhuyin: item.zhuyin,
      reviewStage: 0,
      nextReviewAt: new Date(),
    }))
  );
  // (rest of function unchanged)
```

- [ ] **Step 2: Add `isNull` to the Drizzle import**

Line 5 currently reads:
```ts
import { and, eq, lte, lt } from "drizzle-orm";
```
Change to:
```ts
import { and, eq, isNull, lte, lt } from "drizzle-orm";
```

- [ ] **Step 3: Handle `"uncategorized"` in `getTodayReviews`**

Lines 37–38 currently read:
```ts
  if (categoryId) conditions.push(eq(vocabulary.categoryId, categoryId));
  return db.select().from(vocabulary).where(and(...conditions));
```
Replace with:
```ts
  if (categoryId === "uncategorized") {
    conditions.push(isNull(vocabulary.categoryId));
  } else if (categoryId) {
    conditions.push(eq(vocabulary.categoryId, categoryId));
  }
  return db.select().from(vocabulary).where(and(...conditions));
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no type errors related to `categoryId`.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/vocabulary.ts
git commit -m "fix: support null categoryId in createVocabularies, handle uncategorized sentinel in getTodayReviews"
```

---

## Task 2: Add `isVirtual` prop to `CategorySection`

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx` (the `CategorySection` function, lines 65–334)

### Background

`CategorySection` needs to behave differently for the virtual "未分類" entry:
- Hide "重新命名" and "刪除分類" dropdown items (the `isEditing` state is only reachable via "重新命名", so hiding the item prevents renaming entirely)
- "新增單字" link: omit `categoryId` param so vocab is inserted with `categoryId = null`
- "批次新增單字": pass `null` instead of `cat.id`
- "複習此分類" link: use `?categoryId=uncategorized`

- [ ] **Step 1: Add `isVirtual` to the prop interface**

The `CategorySection` function signature (line 65) currently has no `isVirtual` prop. Add it:

```ts
function CategorySection({
  cat,
  vocabs,
  languageId,
  ttsCode,
  isChineseLanguage,
  categories,
  onDelete,
  onDeleteCategory,
  isVirtual = false,
}: {
  cat: Category;
  vocabs: Vocabulary[];
  languageId: string;
  ttsCode: string;
  isChineseLanguage: boolean;
  categories: Category[];
  onDelete: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  isVirtual?: boolean;
})
```

- [ ] **Step 2: Update "複習此分類" link**

Find the `DropdownMenuItem` with the "複習此分類" link (around line 224–228):
```tsx
<DropdownMenuItem asChild>
  <Link href={`/review/${languageId}?categoryId=${cat.id}`}>
    複習此分類
  </Link>
</DropdownMenuItem>
```
Replace with:
```tsx
<DropdownMenuItem asChild>
  <Link href={isVirtual
    ? `/review/${languageId}?categoryId=uncategorized`
    : `/review/${languageId}?categoryId=${cat.id}`
  }>
    複習此分類
  </Link>
</DropdownMenuItem>
```

- [ ] **Step 3: Update "新增單字" link**

Find the `DropdownMenuItem` with the "新增單字" link (around line 229–234):
```tsx
<DropdownMenuItem asChild>
  <Link
    href={`/vocabulary/new?languageId=${languageId}&categoryId=${cat.id}`}
  >
    新增單字
  </Link>
</DropdownMenuItem>
```
Replace with:
```tsx
<DropdownMenuItem asChild>
  <Link
    href={isVirtual
      ? `/vocabulary/new?languageId=${languageId}`
      : `/vocabulary/new?languageId=${languageId}&categoryId=${cat.id}`
    }
  >
    新增單字
  </Link>
</DropdownMenuItem>
```

- [ ] **Step 4: Update "批次新增單字" to pass `null` when `isVirtual`**

The `handleBatchCreate` function inside `CategorySection` (around line 93) calls:
```ts
await createVocabularies(items, languageId, cat.id);
```
Replace with:
```ts
await createVocabularies(items, languageId, isVirtual ? null : cat.id);
```

- [ ] **Step 5: Hide "重新命名" and "刪除分類" when `isVirtual`**

Find the two `DropdownMenuItem` entries (around lines 245–253):
```tsx
<DropdownMenuItem onSelect={() => setIsEditing(true)}>
  重新命名
</DropdownMenuItem>
<DropdownMenuItem
  onSelect={() => onDeleteCategory(cat.id)}
  className="text-destructive focus:text-destructive"
>
  刪除分類
</DropdownMenuItem>
```
Wrap both in a conditional:
```tsx
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
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "feat: add isVirtual prop to CategorySection"
```

---

## Task 3: Wire up virtual "未分類" in `LanguageClient` and remove old static section

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx` (the `LanguageClient` function, lines 345–650)

### Background

The `LanguageClient` currently:
1. Builds `groups` from real DB categories
2. Separately computes `uncategorizedVocabs` and renders them as a plain static block at the bottom
3. Shows a `📂 先新增分類` empty-state block when there are no categories and no uncategorized vocab

We will:
- Define `UNCATEGORIZED_ID = "__uncategorized__"` at module level (outside the component, after imports)
- Prepend a virtual category to `groups` so it's always first
- Remove the static uncategorized section
- Remove the empty-state block

- [ ] **Step 1: Add the sentinel constant**

After the imports (after line 48, before `function parseBatchVocabLine`), add:
```ts
const UNCATEGORIZED_ID = "__uncategorized__";
```

- [ ] **Step 2: Build virtual category and prepend to groups**

The current `groups` computation (around lines 432–435) reads:
```ts
const groups = initialCategories.map((cat) => ({
  cat,
  vocabs: initialVocabularies.filter((v) => v.categoryId === cat.id),
}));
```
Replace with:
```ts
const UNCATEGORIZED_ID = "__uncategorized__";

const virtualCategory: Category = {
  id: UNCATEGORIZED_ID,
  name: "未分類",
  userId: language.userId,
  languageId: language.id,
  createdAt: new Date(),
};

const groups = [
  {
    cat: virtualCategory,
    vocabs: initialVocabularies.filter((v) => v.categoryId === null),
    isVirtual: true,
  },
  ...initialCategories.map((cat) => ({
    cat,
    vocabs: initialVocabularies.filter((v) => v.categoryId === cat.id),
    isVirtual: false,
  })),
];
```

Note: remove the `const UNCATEGORIZED_ID` line added in Step 1 of this task if you already added it at module level — keep only one declaration.

- [ ] **Step 3: Remove `uncategorizedVocabs` (no longer needed)**

Delete the line:
```ts
const uncategorizedVocabs = initialVocabularies.filter((v) => !v.categoryId);
```

- [ ] **Step 4: Update the JSX render to use the new groups shape**

The render currently reads (around line 541–570):
```tsx
{initialCategories.length === 0 && uncategorizedVocabs.length === 0 ? (
  <div className="text-center py-12 text-muted-foreground">
    <p className="text-4xl mb-3">📂</p>
    <p className="font-medium">先新增分類，再加入單字</p>
    <p className="text-sm mt-1">點右上角「+ 新增分類」開始</p>
  </div>
) : (
  <>
    {groups.map(({ cat, vocabs }) => (
      <CategorySection
        key={cat.id}
        cat={cat}
        vocabs={vocabs}
        languageId={language.id}
        ttsCode={language.ttsCode}
        isChineseLanguage={language.ttsCode === "zh-TW"}
        categories={initialCategories}
        onDelete={handleDeleteVocab}
        onDeleteCategory={handleDeleteCategory}
      />
    ))}
    {uncategorizedVocabs.length > 0 && (
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="font-semibold text-foreground mb-2">
          未分類 ({uncategorizedVocabs.length})
        </p>
        {uncategorizedVocabs.map((vocab) => (
          <div key={vocab.id} className="px-2 py-1">
            <VocabCard
              vocab={vocab}
              ttsCode={language.ttsCode}
              onDelete={() => handleDeleteVocab(vocab.id)}
            />
          </div>
        ))}
      </div>
    )}
  </>
)}
```

Replace the entire block with:
```tsx
<>
  {groups.map(({ cat, vocabs, isVirtual }) => (
    <CategorySection
      key={cat.id}
      cat={cat}
      vocabs={vocabs}
      languageId={language.id}
      ttsCode={language.ttsCode}
      isChineseLanguage={language.ttsCode === "zh-TW"}
      categories={initialCategories}
      onDelete={handleDeleteVocab}
      onDeleteCategory={handleDeleteCategory}
      isVirtual={isVirtual}
    />
  ))}
</>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no type errors.

- [ ] **Step 6: Manual smoke test**

Start dev server:
```bash
npm run dev
```

Check:
1. "未分類" always appears first, even with no uncategorized vocab.
2. "未分類" dropdown shows "複習此分類", "新增單字", "批次新增單字" — but NOT "重新命名" or "刪除分類".
3. Clicking "新增單字" navigates to `/vocabulary/new?languageId=...` (no `categoryId` param).
4. Clicking "複習此分類" navigates to `/review/...?categoryId=uncategorized`.
5. Batch adding vocab in "未分類" saves with `categoryId = null` (verify in DB or by refreshing the page and seeing them in "未分類").
6. Other named categories still work correctly (rename, delete, add vocab with correct categoryId).

- [ ] **Step 7: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "feat: show 未分類 as permanent first category section"
```
