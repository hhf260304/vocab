# 未分類預設分類 — Design Spec

Date: 2026-03-26

## Overview

Add a permanent "未分類" section that always appears first in the vocabulary list, replacing the current static uncategorized section at the bottom. It behaves like a full `CategorySection` (add vocab, batch add, review) but cannot be renamed or deleted.

## Approach

UI-only virtual category (no database changes). Vocab with `categoryId = null` belongs to this section — same data as the current bottom section, just repositioned and upgraded.

## Changes

### `LanguageClient.tsx`

1. Define a sentinel constant: `const UNCATEGORIZED_ID = "__uncategorized__"`
2. Build a virtual `Category` object with `id = UNCATEGORIZED_ID` and `name = "未分類"`, prepend it to `groups` as the first entry (always shown, even when empty).
3. Remove the old static uncategorized section at the bottom.
4. Remove the `📂 先新增分類` empty state block (the `initialCategories.length === 0 && uncategorizedVocabs.length === 0` condition and its JSX) — since "未分類" is always shown, the list is never empty.
5. Pass `isVirtual={true}` to the `CategorySection` for the uncategorized entry.

### `CategorySection`

1. Accept `isVirtual?: boolean` prop.
2. When `isVirtual`:
   - Hide "重新命名" and "刪除分類" dropdown items. The inline-edit state (`isEditing`) is only triggered by the "重新命名" dropdown item — hiding that item is sufficient to prevent renaming.
   - "新增單字" link omits `categoryId` param — the `/vocabulary/new` page and `createVocabulary` action already default `categoryId` to `null` when the param is absent.
   - "批次新增單字": pass `null` as `categoryId` to `createVocabularies` instead of `cat.id` (which is the sentinel `"__uncategorized__"` — not a valid DB value). Note: the top-level "批次新增" button in `LanguageClient` opens a separate dialog that calls `createCategories` (batch-create categories), not `createVocabularies` — it is unaffected by this change.
   - "複習此分類" link uses `/review/${languageId}?categoryId=uncategorized`. Note: `"uncategorized"` is the URL-level sentinel (review page); `"__uncategorized__"` is the component-level sentinel. Intentionally different strings at different layers.

### `lib/actions/vocabulary.ts`

**`createVocabularies` signature**: change `categoryId: string` to `categoryId: string | null` so passing `null` for uncategorized vocab is type-safe. The Drizzle insert already handles nullable columns correctly.

**`getTodayReviews`**: when `categoryId === "uncategorized"`, filter with `isNull(vocabulary.categoryId)` instead of `eq(vocabulary.categoryId, categoryId)`. Add `isNull` to the Drizzle import.

## What Does Not Change

- Database schema — no migration needed.
- All vocab with `categoryId = null` remains as-is.
- All other category sections are unaffected.
