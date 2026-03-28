# Category Page Design

**Date:** 2026-03-28

## Overview

Change the vocabulary library so that clicking a category navigates to a dedicated category page instead of expanding vocab inline. The category page shows all vocabulary in that category and hosts the add/batch-add actions.

## Routes

New files:
- `app/languages/[id]/categories/[categoryId]/page.tsx` — server component
- `app/languages/[id]/categories/[categoryId]/CategoryClient.tsx` — client component

`[categoryId]` accepts either a real UUID or the special value `uncategorized`.

## Data Layer

`getVocabularies` in `lib/actions/vocabulary.ts` gains an optional `categoryId` parameter:
- `undefined` → return all vocab for the language (existing behaviour)
- `"uncategorized"` → filter `WHERE categoryId IS NULL`
- any other string → filter `WHERE categoryId = <id>`

## Language Page Changes (`LanguageClient.tsx` + `page.tsx`)

`page.tsx` removes the `getVocabularies` call and stops passing `initialVocabularies` to `LanguageClient` (vocab is no longer displayed inline). A new server action `getVocabularyCounts(languageId)` returns `{ total, graduated }` so the language page can still show the stats without fetching full vocab rows.

`LanguageClient` removes the `initialVocabularies` prop.

`CategorySection` becomes a plain link card (no Collapsible):
- Clicking the category name navigates to `/languages/[id]/categories/[categoryId]`
- Uncategorized virtual category links to `/languages/[id]/categories/uncategorized`
- Dropdown keeps: 複習此分類, 重新命名 (real categories only), 刪除分類 (real categories only)
- Dropdown removes: 新增單字, 批次新增單字 (moved to category page)

## Category Page Content (`CategoryClient.tsx`)

Layout:
- Top: back button (← `language.name`), category name as heading, vocab count
- Top-right: "新增單字" link button → `/vocabulary/new?languageId=...&categoryId=...`, "批次新增" button
- Body: list of `VocabCard` components with edit (link to `/vocabulary/[id]`) and delete (confirmation dialog)

Batch-add dialog: reuse logic from the existing `CategorySection` component.

Empty state: show "還沒有單字，點「+ 新增單字」開始新增" when vocab list is empty.
