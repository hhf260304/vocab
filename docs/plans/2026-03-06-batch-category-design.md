# Batch Category Creation — Design

## Overview

Allow users to create multiple categories at once via a Dialog with a multi-line textarea, instead of adding them one by one.

## UI

In `LanguageClient.tsx`, the "單字庫" section header already has a "+ 新增分類" button. A new "批次新增" button is added beside it.

Clicking "批次新增" opens a Dialog containing:
- Title: 批次新增分類
- Description: 每行輸入一個分類名稱
- `<Textarea>` (autoFocus) for multi-line input
- Error block (red): lists duplicate names if validation fails
- Footer buttons: 取消 / 建立

## Data Flow

1. User types category names (one per line) and clicks 建立
2. Frontend parses input: split by newline, trim each line, remove empty lines
3. Calls new `createCategories(names: string[], languageId: string)` Server Action
4. Server Action logic:
   - Fetch existing categories for the language
   - Combine existing names + input names → find duplicates (case-insensitive)
   - If duplicates found: return `{ duplicates: string[] }` without writing to DB
   - If no duplicates: `db.insert(categories).values([...])` batch insert, then `revalidatePath`
5. Frontend:
   - On duplicate error: display list of duplicate names below the textarea
   - On success: close Dialog

## Files Changed

- `lib/actions/categories.ts` — add `createCategories` server action
- `app/languages/[id]/LanguageClient.tsx` — add 批次新增 button + Dialog component
