# 已畢業單字 Sheet 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 點擊語言頁面的「已畢業」統計卡片，從右側滑出 Sheet 顯示所有已畢業單字，支援依分類或依畢業時間兩種排列方式。

**Architecture:** 新增 `getGraduatedVocab` server action（LEFT JOIN categories）、`GraduatedSheet` client component（管理自身 open state，lazy fetch），並修改 `LanguageClient.tsx` 將「已畢業」卡片包成 Sheet trigger。

**Tech Stack:** Next.js App Router, Drizzle ORM (Neon PostgreSQL), shadcn/ui Sheet, Tailwind CSS v4, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-25-graduated-sheet-design.md`

---

## 檔案對應

| 動作 | 路徑 |
|------|------|
| 安裝 | `components/ui/sheet.tsx`（由 shadcn CLI 產生） |
| 新增 | `components/GraduatedSheet.tsx` |
| 修改 | `lib/actions/vocabulary.ts`（新增 `getGraduatedVocab`） |
| 修改 | `app/languages/[id]/LanguageClient.tsx`（已畢業卡片 → SheetTrigger） |

---

## Task 1: 安裝 shadcn Sheet 元件

**Files:**
- Create: `components/ui/sheet.tsx`

- [ ] **Step 1: 安裝 Sheet 元件**

```bash
npx shadcn@latest add sheet
```

Expected: 建立 `components/ui/sheet.tsx`，無錯誤。

- [ ] **Step 2: 確認 TypeScript 編譯通過**

```bash
npx tsc --noEmit
```

Expected: 無輸出（無錯誤）。

- [ ] **Step 3: Commit**

```bash
git add components/ui/sheet.tsx
git commit -m "feat: add shadcn sheet component"
```

---

## Task 2: 新增 `getGraduatedVocab` server action

**Files:**
- Modify: `lib/actions/vocabulary.ts`

- [ ] **Step 1: 在 `lib/actions/vocabulary.ts` 頂端修改 schema import**

`leftJoin` 是 Drizzle 的查詢建構方法（`.leftJoin(table, condition)`），不需要從 `drizzle-orm` import。只需要將 schema import 加入 `categories`：

```ts
// 原本：
import { vocabulary } from "@/lib/db/schema";
// 改為：
import { vocabulary, categories } from "@/lib/db/schema";
```

- [ ] **Step 2: 在檔案末尾新增 `getGraduatedVocab` action**

```ts
export type GraduatedVocab = {
  id: string;
  front: string;
  back: string;
  categoryName: string | null;
  lastReviewedAt: Date | null;
};

export async function getGraduatedVocab(
  languageId: string
): Promise<GraduatedVocab[]> {
  const userId = await getUserId();
  return db
    .select({
      id: vocabulary.id,
      front: vocabulary.front,
      back: vocabulary.back,
      categoryName: categories.name,
      lastReviewedAt: vocabulary.lastReviewedAt,
    })
    .from(vocabulary)
    .leftJoin(categories, eq(vocabulary.categoryId, categories.id))
    .where(
      and(
        eq(vocabulary.userId, userId),
        eq(vocabulary.languageId, languageId),
        eq(vocabulary.reviewStage, 5)
      )
    );
}
```

注意：`leftJoin` 是 Drizzle 的查詢建構方法（`.leftJoin(table, condition)`），不是從 `drizzle-orm` import 的函式。將 Step 1 的 import 改回只 import `and, eq, lte, lt`（不需要 import leftJoin）。

- [ ] **Step 3: 確認 TypeScript 編譯通過**

```bash
npx tsc --noEmit
```

Expected: 無輸出（無錯誤）。

- [ ] **Step 4: Commit**

```bash
git add lib/actions/vocabulary.ts
git commit -m "feat: add getGraduatedVocab server action"
```

---

## Task 3: 建立 `GraduatedSheet` 元件

**Files:**
- Create: `components/GraduatedSheet.tsx`

- [ ] **Step 1: 建立元件檔案**

建立 `components/GraduatedSheet.tsx`：

```tsx
"use client";

import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getGraduatedVocab, type GraduatedVocab } from "@/lib/actions/vocabulary";

interface GraduatedSheetProps {
  languageId: string;
  totalCount: number;
  children: React.ReactNode; // trigger element
}

type GroupBy = "category" | "date";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function GraduatedSheet({
  languageId,
  totalCount,
  children,
}: GraduatedSheetProps) {
  const [open, setOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [vocab, setVocab] = useState<GraduatedVocab[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && vocab === null) {
      setLoading(true);
      setError(false);
      try {
        const data = await getGraduatedVocab(languageId);
        setVocab(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  // 依分類分組：{ categoryName: GraduatedVocab[] }，按分類名稱字母排序，null 分類歸「未分類」
  const groupedByCategory = useMemo(() => {
    if (!vocab) return [];
    const map = new Map<string, GraduatedVocab[]>();
    for (const v of vocab) {
      const key = v.categoryName ?? "未分類";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [vocab]);

  // 依畢業時間降序排列，null 置於最後
  const sortedByDate = useMemo(() => {
    if (!vocab) return [];
    return [...vocab].sort((a, b) => {
      if (!a.lastReviewedAt && !b.lastReviewedAt) return 0;
      if (!a.lastReviewedAt) return 1;
      if (!b.lastReviewedAt) return -1;
      return b.lastReviewedAt.getTime() - a.lastReviewedAt.getTime();
    });
  }, [vocab]);

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-lg font-bold">已畢業單字</SheetTitle>
          <p className="text-xs text-muted-foreground">共 {totalCount} 個單字</p>
        </SheetHeader>

        {/* Toggle */}
        <div className="flex gap-2 px-5 py-3 border-b border-border">
          <button
            onClick={() => setGroupBy("category")}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              groupBy === "category"
                ? "bg-blue-950 text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            依分類
          </button>
          <button
            onClick={() => setGroupBy("date")}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              groupBy === "date"
                ? "bg-blue-950 text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            依畢業時間
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="p-5 text-center text-sm text-muted-foreground">
              載入失敗，請關閉後再試一次。
            </div>
          )}

          {!loading && !error && vocab !== null && vocab.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              還沒有畢業的單字，繼續加油！
            </div>
          )}

          {!loading && !error && vocab !== null && vocab.length > 0 && (
            <>
              {groupBy === "category" &&
                groupedByCategory.map(([categoryName, items]) => (
                  <div key={categoryName}>
                    <div className="px-5 py-2 bg-muted/30 sticky top-0">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        {categoryName} · {items.length} 個
                      </span>
                    </div>
                    {items.map((v) => (
                      <VocabRow key={v.id} vocab={v} showCategory={false} />
                    ))}
                  </div>
                ))}

              {groupBy === "date" &&
                sortedByDate.map((v) => (
                  <VocabRow key={v.id} vocab={v} showCategory={true} />
                ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VocabRow({
  vocab,
  showCategory,
}: {
  vocab: GraduatedVocab;
  showCategory: boolean;
}) {
  return (
    <div className="px-5 py-2.5 border-b border-border">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {vocab.front}
        </span>
        <span className="text-xs text-muted-foreground truncate">{vocab.back}</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {showCategory && vocab.categoryName && (
          <Badge variant="secondary" className="text-xs py-0 px-2">
            {vocab.categoryName}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDate(vocab.lastReviewedAt)}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 確認 TypeScript 編譯通過**

```bash
npx tsc --noEmit
```

Expected: 無輸出（無錯誤）。

- [ ] **Step 3: Commit**

```bash
git add components/GraduatedSheet.tsx
git commit -m "feat: add GraduatedSheet component"
```

---

## Task 4: 修改 `LanguageClient.tsx` 接上 Sheet

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx`

- [ ] **Step 1: 新增 import**

在檔案頂端現有 import 中加入：

```ts
import { GraduatedSheet } from "@/components/GraduatedSheet";
```

- [ ] **Step 2: 將「已畢業」統計卡片包進 `GraduatedSheet`**

找到 `LanguageClient.tsx` 第 457-460 行的已畢業卡片：

```tsx
// 原本：
<div className="bg-card border border-border rounded-2xl p-4 text-center">
  <p className="text-2xl font-bold text-foreground">{graduatedCount}</p>
  <p className="text-xs text-muted-foreground mt-1">已畢業</p>
</div>
```

替換為：

```tsx
// 修改後：
<GraduatedSheet languageId={language.id} totalCount={graduatedCount}>
  <div className="bg-card border border-border rounded-2xl p-4 text-center cursor-pointer hover:bg-accent transition-colors">
    <p className="text-2xl font-bold text-foreground">{graduatedCount}</p>
    <p className="text-xs text-muted-foreground mt-1">已畢業</p>
  </div>
</GraduatedSheet>
```

- [ ] **Step 3: 確認 TypeScript 編譯通過**

```bash
npx tsc --noEmit
```

Expected: 無輸出（無錯誤）。

- [ ] **Step 4: 手動測試**

```bash
npm run dev
```

1. 前往語言頁面
2. 點擊「已畢業」統計卡片
3. 確認 Sheet 從右側滑出
4. 確認單字列表顯示正確（front、back、分類、日期）
5. 切換「依分類」/ 「依畢業時間」確認分組正確
6. 關閉後再次開啟確認資料不重複 fetch

- [ ] **Step 5: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "feat: wire GraduatedSheet to graduated stat card"
```
