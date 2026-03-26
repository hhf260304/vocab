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
4. Remove the `📂 先新增分類` empty state — the uncategorized section itself shows "還沒有單字" when empty.
5. Pass `isVirtual={true}` to the `CategorySection` for the uncategorized entry.

### `CategorySection`

1. Accept `isVirtual?: boolean` prop.
2. When `isVirtual`:
   - Hide "重新命名" and "刪除分類" dropdown items.
   - "新增單字" link omits `categoryId` param (so vocab is created with `categoryId = null`).
   - "複習此分類" link uses `/review/${languageId}?categoryId=uncategorized`.

### `lib/actions/vocabulary.ts` — `getTodayReviews`

When `categoryId === "uncategorized"`, filter with `isNull(vocabulary.categoryId)` instead of the current `eq(vocabulary.categoryId, categoryId)`.

## What Does Not Change

- Database schema — no migration needed.
- All vocab with `categoryId = null` remains as-is.
- All other category sections are unaffected.
