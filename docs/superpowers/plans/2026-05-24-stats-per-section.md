# 統計功能移入各自管理頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把統計入口從語言總覽頁頂端移除，改放入單字管理頁與句子管理頁各自的頂端，並建立對應的統計頁面。

**Architecture:** 新增 `getSentenceFailStats` action；把現有 vocab stats 頁搬到 `vocabulary/stats/`；建立對稱的 `sentences/stats/` 頁；調整三個 Client 元件的頂端按鈕列。

**Tech Stack:** Next.js App Router, Drizzle ORM, Neon PostgreSQL, Tailwind CSS, shadcn/ui

---

## 檔案一覽

| 動作 | 路徑 |
|---|---|
| 修改 | `lib/actions/sentences.ts` |
| 新建 | `app/languages/[id]/vocabulary/stats/page.tsx` |
| 新建 | `app/languages/[id]/sentences/stats/page.tsx` |
| 修改 | `app/languages/[id]/vocabulary/VocabularyClient.tsx` |
| 修改 | `app/languages/[id]/sentences/SentencesClient.tsx` |
| 修改 | `app/languages/[id]/LanguageClient.tsx` |
| 刪除 | `app/languages/[id]/stats/page.tsx` |

---

### Task 1：新增 `getSentenceFailStats` action

**Files:**
- Modify: `lib/actions/sentences.ts`

- [ ] **Step 1：更新 drizzle-orm import，加入 `gt` 與 `desc`**

在 `lib/actions/sentences.ts` 第 5 行，把 import 改為：

```ts
import { and, eq, isNull, lte, lt, count, sql, gt, desc } from "drizzle-orm";
```

- [ ] **Step 2：更新 schema import，加入 `categories`**

把第 8 行改為：

```ts
import { sentences, categories } from "@/lib/db/schema";
```

- [ ] **Step 3：在檔案末尾加入 `getSentenceFailStats`**

```ts
export type SentenceFailStat = {
  id: string;
  front: string;
  back: string;
  failCount: number;
  categoryName: string | null;
};

export async function getSentenceFailStats(languageId: string): Promise<SentenceFailStat[]> {
  const userId = await getUserId();
  return db
    .select({
      id: sentences.id,
      front: sentences.front,
      back: sentences.back,
      failCount: sentences.failCount,
      categoryName: categories.name,
    })
    .from(sentences)
    .leftJoin(categories, eq(sentences.categoryId, categories.id))
    .where(
      and(
        eq(sentences.userId, userId),
        eq(sentences.languageId, languageId),
        gt(sentences.failCount, 0)
      )
    )
    .orderBy(desc(sentences.failCount));
}
```

- [ ] **Step 4：確認 TypeScript 無錯誤**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：無 TypeScript 錯誤。

- [ ] **Step 5：Commit**

```bash
git add lib/actions/sentences.ts
git commit -m "feat(sentences): 新增 getSentenceFailStats action"
```

---

### Task 2：建立單字統計頁 `vocabulary/stats/page.tsx`

**Files:**
- Create: `app/languages/[id]/vocabulary/stats/page.tsx`

- [ ] **Step 1：建立目錄並新建頁面**

內容與現有 `app/languages/[id]/stats/page.tsx` 相同，但 back button 連回 `/languages/${id}/vocabulary`：

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLanguageById } from "@/lib/actions/languages";
import { getFailStats } from "@/lib/actions/vocabulary";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BarChart2 } from "lucide-react";

export default async function VocabStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, stats] = await Promise.all([
    getLanguageById(id),
    getFailStats(id),
  ]);

  if (!language) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground px-0" asChild>
          <Link href={`/languages/${id}/vocabulary`}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            單字管理
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <BarChart2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">錯誤排行榜</h1>
      </div>

      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <BarChart2 className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">還沒有錯誤紀錄</p>
          <p className="text-sm text-muted-foreground/60">複習時答錯的單字會出現在這裡</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stats.map((item, index) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-2xl px-5 py-3.5 flex items-center gap-4"
            >
              <span className="text-sm font-bold text-muted-foreground w-6 shrink-0 text-center">
                {index + 1}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-foreground truncate">{item.front}</span>
                <span className="text-sm text-muted-foreground truncate">{item.back}</span>
              </div>
              {item.categoryName && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                  {item.categoryName}
                </span>
              )}
              <span className="text-sm font-bold text-destructive shrink-0">
                {item.failCount} 次
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2：確認 build 正常**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：無錯誤。

- [ ] **Step 3：Commit**

```bash
git add app/languages/\\[id\\]/vocabulary/stats/page.tsx
git commit -m "feat(vocab): 新增單字統計頁 vocabulary/stats"
```

---

### Task 3：建立句子統計頁 `sentences/stats/page.tsx`

**Files:**
- Create: `app/languages/[id]/sentences/stats/page.tsx`

- [ ] **Step 1：新建句子統計頁**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLanguageById } from "@/lib/actions/languages";
import { getSentenceFailStats } from "@/lib/actions/sentences";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BarChart2 } from "lucide-react";

export default async function SentenceStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, stats] = await Promise.all([
    getLanguageById(id),
    getSentenceFailStats(id),
  ]);

  if (!language) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground px-0" asChild>
          <Link href={`/languages/${id}/sentences`}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            句子管理
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <BarChart2 className="w-6 h-6 text-emerald-500" />
        <h1 className="text-2xl font-bold text-foreground">錯誤排行榜</h1>
      </div>

      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <BarChart2 className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">還沒有錯誤紀錄</p>
          <p className="text-sm text-muted-foreground/60">複習時答錯的句子會出現在這裡</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stats.map((item, index) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-2xl px-5 py-3.5 flex items-center gap-4"
            >
              <span className="text-sm font-bold text-muted-foreground w-6 shrink-0 text-center">
                {index + 1}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-foreground truncate">{item.front}</span>
                <span className="text-sm text-muted-foreground truncate">{item.back}</span>
              </div>
              {item.categoryName && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                  {item.categoryName}
                </span>
              )}
              <span className="text-sm font-bold text-destructive shrink-0">
                {item.failCount} 次
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2：確認 build 正常**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：無錯誤。

- [ ] **Step 3：Commit**

```bash
git add app/languages/\\[id\\]/sentences/stats/page.tsx
git commit -m "feat(sentences): 新增句子統計頁 sentences/stats"
```

---

### Task 4：在單字管理頁頂端加統計按鈕

**Files:**
- Modify: `app/languages/[id]/vocabulary/VocabularyClient.tsx`

- [ ] **Step 1：在 import 加入 `BarChart2`**

把第 4 行改為：

```ts
import { ArrowLeft, BarChart2, FolderPlus, Plus } from "lucide-react";
```

- [ ] **Step 2：在 back button `<div>` 改為 flex justify-between 並加統計按鈕**

找到（第 126–138 行）：

```tsx
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
```

改為：

```tsx
      <div className="flex items-center justify-between">
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
        <Button variant="outline" size="sm" asChild>
          <Link href={`/languages/${language.id}/vocabulary/stats`}>
            <BarChart2 className="w-4 h-4 mr-1" />統計
          </Link>
        </Button>
      </div>
```

- [ ] **Step 3：確認 build 正常**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：無錯誤。

- [ ] **Step 4：Commit**

```bash
git add app/languages/\\[id\\]/vocabulary/VocabularyClient.tsx
git commit -m "feat(vocab): 單字管理頁頂端加統計按鈕"
```

---

### Task 5：在句子管理頁頂端加統計按鈕

**Files:**
- Modify: `app/languages/[id]/sentences/SentencesClient.tsx`

- [ ] **Step 1：在 import 加入 `BarChart2`**

把第 3 行改為：

```ts
import { ArrowLeft, BarChart2, FolderPlus, Plus } from "lucide-react";
```

- [ ] **Step 2：在 back button `<div>` 改為 flex justify-between 並加統計按鈕**

找到（第 109–121 行）：

```tsx
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
```

改為：

```tsx
      <div className="flex items-center justify-between">
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
        <Button variant="outline" size="sm" asChild>
          <Link href={`/languages/${language.id}/sentences/stats`}>
            <BarChart2 className="w-4 h-4 mr-1" />統計
          </Link>
        </Button>
      </div>
```

- [ ] **Step 3：確認 build 正常**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：無錯誤。

- [ ] **Step 4：Commit**

```bash
git add app/languages/\\[id\\]/sentences/SentencesClient.tsx
git commit -m "feat(sentences): 句子管理頁頂端加統計按鈕"
```

---

### Task 6：移除語言總覽頁的統計按鈕並刪除舊統計頁

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx`
- Delete: `app/languages/[id]/stats/page.tsx`

- [ ] **Step 1：移除 LanguageClient.tsx 的統計按鈕**

把第 4 行（`import { BarChart2 } from "lucide-react";`）整行刪除。

把第 28–32 行：

```tsx
        <Button variant="outline" asChild>
          <Link href={`/languages/${language.id}/stats`}>
            <BarChart2 className="w-4 h-4 mr-1" />統計
          </Link>
        </Button>
```

整段刪除，讓 `<div className="flex items-center justify-between">` 裡只剩 `<h1>`。

若 `<div className="flex items-center justify-between">` 現在只有一個子元素，把 `justify-between` 移除（改為 `<div>`）：

```tsx
      <div>
        <h1 className="text-2xl font-bold text-foreground">{language.name}</h1>
      </div>
```

或直接把整個 div 換成：

```tsx
      <h1 className="text-2xl font-bold text-foreground">{language.name}</h1>
```

- [ ] **Step 2：刪除舊統計頁**

```bash
rm app/languages/\[id\]/stats/page.tsx
rmdir app/languages/\[id\]/stats 2>/dev/null || true
```

- [ ] **Step 3：確認 build 正常**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：無錯誤。

- [ ] **Step 4：Commit**

```bash
git add -A app/languages/\\[id\\]/
git commit -m "feat(language): 移除總覽頁統計按鈕，刪除舊 stats 頁"
```
