# 明天複習預覽功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在單字管理頁與句子管理頁各加入「明天待複習 X 個 →」連結，點擊後進入唯讀預覽頁，列出明天到期的每筆項目。

**Architecture:** 新增兩個 server action（`getTomorrowVocabReviews`、`getTomorrowSentenceReviews`）以 `gte/lt` 查詢 `nextReviewAt ∈ [明天零時, 後天零時)`；各管理頁 server component 新增呼叫並傳 count 給 client；各自新增兩個預覽頁（1 server component + 1 client component），唯讀展示。

**Tech Stack:** Next.js 15 App Router、Drizzle ORM、Tailwind CSS v4、shadcn/ui、TypeScript

---

## 檔案結構

| 動作 | 路徑 |
|------|------|
| Modify | `lib/actions/vocabulary.ts` |
| Modify | `lib/actions/sentences.ts` |
| Modify | `app/languages/[id]/vocabulary/page.tsx` |
| Modify | `app/languages/[id]/vocabulary/VocabularyClient.tsx` |
| Create | `app/languages/[id]/vocabulary/tomorrow/page.tsx` |
| Create | `app/languages/[id]/vocabulary/tomorrow/TomorrowVocabClient.tsx` |
| Modify | `app/languages/[id]/sentences/page.tsx` |
| Modify | `app/languages/[id]/sentences/SentencesClient.tsx` |
| Create | `app/languages/[id]/sentences/tomorrow/page.tsx` |
| Create | `app/languages/[id]/sentences/tomorrow/TomorrowSentenceClient.tsx` |

---

## Task 1: 新增 server action — getTomorrowVocabReviews 與 getTomorrowSentenceReviews

**Files:**
- Modify: `lib/actions/vocabulary.ts`
- Modify: `lib/actions/sentences.ts`

- [ ] **Step 1: 在 vocabulary.ts 加入 gte import 與 getTomorrowVocabReviews**

`lib/actions/vocabulary.ts` 的 drizzle-orm import 行改為：

```ts
import { revalidatePath } from "next/cache";
import { and, eq, gte, isNull, lte, lt, count, sql, gt, desc } from "drizzle-orm";
```

在 `getTodayReviews` 函式之後新增：

```ts
export type TomorrowVocabItem = {
  id: string;
  front: string;
  back: string;
  exampleJp: string;
  zhuyin: string;
  categoryName: string | null;
};

export async function getTomorrowVocabReviews(languageId: string): Promise<TomorrowVocabItem[]> {
  const userId = await getUserId();
  const tomorrowStart = new Date();
  tomorrowStart.setHours(0, 0, 0, 0);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterStart = new Date(tomorrowStart);
  dayAfterStart.setDate(dayAfterStart.getDate() + 1);

  return db
    .select({
      id: vocabulary.id,
      front: vocabulary.front,
      back: vocabulary.back,
      exampleJp: vocabulary.exampleJp,
      zhuyin: vocabulary.zhuyin,
      categoryName: categories.name,
    })
    .from(vocabulary)
    .leftJoin(categories, eq(vocabulary.categoryId, categories.id))
    .where(
      and(
        eq(vocabulary.userId, userId),
        eq(vocabulary.languageId, languageId),
        lt(vocabulary.reviewStage, 6),
        gte(vocabulary.nextReviewAt, tomorrowStart),
        lt(vocabulary.nextReviewAt, dayAfterStart),
      )
    )
    .orderBy(categories.name, vocabulary.front);
}
```

- [ ] **Step 2: 在 sentences.ts 加入 gte import 與 getTomorrowSentenceReviews**

`lib/actions/sentences.ts` 的 drizzle-orm import 行改為：

```ts
import { and, eq, gte, isNull, lte, lt, count, sql, gt, desc } from "drizzle-orm";
```

在 `getTodaySentenceReviews` 函式之後新增：

```ts
export type TomorrowSentenceItem = {
  id: string;
  front: string;
  back: string;
  categoryName: string | null;
};

export async function getTomorrowSentenceReviews(languageId: string): Promise<TomorrowSentenceItem[]> {
  const userId = await getUserId();
  const tomorrowStart = new Date();
  tomorrowStart.setHours(0, 0, 0, 0);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterStart = new Date(tomorrowStart);
  dayAfterStart.setDate(dayAfterStart.getDate() + 1);

  return db
    .select({
      id: sentences.id,
      front: sentences.front,
      back: sentences.back,
      categoryName: categories.name,
    })
    .from(sentences)
    .leftJoin(categories, eq(sentences.categoryId, categories.id))
    .where(
      and(
        eq(sentences.userId, userId),
        eq(sentences.languageId, languageId),
        lt(sentences.reviewStage, 6),
        gte(sentences.nextReviewAt, tomorrowStart),
        lt(sentences.nextReviewAt, dayAfterStart),
      )
    )
    .orderBy(categories.name, sentences.front);
}
```

- [ ] **Step 3: 執行 TypeScript 編譯驗證**

```bash
npm run build 2>&1 | head -40
```

預期：無 TypeScript 錯誤（Next.js build 可能因尚未建立頁面而產生其他警告，忽略之）。若有 type error 請先修正。

- [ ] **Step 4: Commit**

```bash
git add lib/actions/vocabulary.ts lib/actions/sentences.ts
git commit -m "feat(actions): 新增明天待複習查詢 getTomorrowVocabReviews 和 getTomorrowSentenceReviews"
```

---

## Task 2: 單字管理頁加入「明天待複習」入口

**Files:**
- Modify: `app/languages/[id]/vocabulary/page.tsx`
- Modify: `app/languages/[id]/vocabulary/VocabularyClient.tsx`

- [ ] **Step 1: 修改 vocabulary/page.tsx，增加 tomorrow count 的取得**

將 `app/languages/[id]/vocabulary/page.tsx` 全文替換為：

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
  getTomorrowVocabReviews,
} from "@/lib/actions/vocabulary";

export default async function VocabularyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, reviews, counts, vocabCounts, initialCategories, tomorrowItems] =
    await Promise.all([
      getLanguageById(id),
      getTodayReviews(id),
      getVocabularyCounts(id),
      getCategoryVocabCounts(id),
      getCategories(id, "vocab"),
      getTomorrowVocabReviews(id),
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
      tomorrowCount={tomorrowItems.length}
    />
  );
}
```

- [ ] **Step 2: 修改 VocabularyClient.tsx，加入 tomorrowCount prop 與連結**

找到 `interface Props` 區塊（約第 45–52 行），將 `reviewCount` 下方加入 `tomorrowCount`:

```ts
interface Props {
  language: Language;
  reviewCount: number;
  tomorrowCount: number;
  totalCount: number;
  graduatedCount: number;
  initialCategories: Category[];
  vocabCounts: Record<string, number>;
}
```

找到 function 宣告（約第 54–61 行），加入解構：

```ts
export default function VocabularyClient({
  language,
  reviewCount,
  tomorrowCount,
  totalCount,
  graduatedCount,
  initialCategories,
  vocabCounts,
}: Props) {
```

找到「複習按鈕」區塊結尾（`</Button>` 或 `</Button>` 的 `}` 之後，約第 176–180 行），在複習按鈕 JSX 之後插入：

```tsx
{tomorrowCount > 0 && (
  <Link
    href={`/languages/${language.id}/vocabulary/tomorrow`}
    className="text-sm text-muted-foreground hover:text-primary text-center block -mt-3"
  >
    明天待複習 {tomorrowCount} 個 →
  </Link>
)}
```

- [ ] **Step 3: 確認 Link 已 import**

VocabularyClient.tsx 頂部已有 `import Link from "next/link";`，無需新增。

- [ ] **Step 4: 執行 TypeScript 編譯**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：沒有關於 `tomorrowCount` 的 type error。

- [ ] **Step 5: Commit**

```bash
git add app/languages/\[id\]/vocabulary/page.tsx app/languages/\[id\]/vocabulary/VocabularyClient.tsx
git commit -m "feat(vocab): 單字管理頁加入明天待複習數量入口"
```

---

## Task 3: 建立單字明天複習預覽頁

**Files:**
- Create: `app/languages/[id]/vocabulary/tomorrow/page.tsx`
- Create: `app/languages/[id]/vocabulary/tomorrow/TomorrowVocabClient.tsx`

- [ ] **Step 1: 建立 server component**

新建 `app/languages/[id]/vocabulary/tomorrow/page.tsx`：

```tsx
// app/languages/[id]/vocabulary/tomorrow/page.tsx
import { notFound } from "next/navigation";
import TomorrowVocabClient from "./TomorrowVocabClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getTomorrowVocabReviews } from "@/lib/actions/vocabulary";

export default async function TomorrowVocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, items] = await Promise.all([
    getLanguageById(id),
    getTomorrowVocabReviews(id),
  ]);

  if (!language) notFound();

  return <TomorrowVocabClient language={language} items={items} />;
}
```

- [ ] **Step 2: 建立 client component**

新建 `app/languages/[id]/vocabulary/tomorrow/TomorrowVocabClient.tsx`：

```tsx
// app/languages/[id]/vocabulary/tomorrow/TomorrowVocabClient.tsx
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/db/schema";
import type { TomorrowVocabItem } from "@/lib/actions/vocabulary";

interface Props {
  language: Language;
  items: TomorrowVocabItem[];
}

export default function TomorrowVocabClient({ language, items }: Props) {
  const groups: Record<string, TomorrowVocabItem[]> = {};
  for (const item of items) {
    const key = item.categoryName ?? "未分類";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          asChild
        >
          <Link href={`/languages/${language.id}/vocabulary`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Link>
        </Button>
        {items.length > 0 && (
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
            {items.length} 個
          </span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">明天的複習預覽</h1>
        <p className="text-sm text-muted-foreground mt-1">{language.name}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">明天沒有待複習的項目 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groups).map(([categoryName, groupItems]) => (
            <div key={categoryName} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {categoryName}（{groupItems.length} 個）
              </h2>
              {groupItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1"
                >
                  <p className="font-bold text-foreground">{item.front}</p>
                  {item.zhuyin && (
                    <p className="text-sm text-muted-foreground">{item.zhuyin}</p>
                  )}
                  <p className="text-sm text-primary/80">{item.back}</p>
                  {item.exampleJp && (
                    <p className="text-xs text-muted-foreground mt-1 border-t border-border pt-1">
                      {item.exampleJp}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 執行 TypeScript 編譯**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：無 type error。

- [ ] **Step 4: Commit**

```bash
git add "app/languages/[id]/vocabulary/tomorrow/"
git commit -m "feat(vocab): 新增單字明天複習預覽頁"
```

---

## Task 4: 句子管理頁加入「明天待複習」入口

**Files:**
- Modify: `app/languages/[id]/sentences/page.tsx`
- Modify: `app/languages/[id]/sentences/SentencesClient.tsx`

- [ ] **Step 1: 修改 sentences/page.tsx，增加 tomorrow count 的取得**

將 `app/languages/[id]/sentences/page.tsx` 全文替換為：

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
  getTomorrowSentenceReviews,
} from "@/lib/actions/sentences";

export default async function SentencesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, sentenceCounts, sentenceReviews, initialCategories, categoryCounts, tomorrowItems] =
    await Promise.all([
      getLanguageById(id),
      getSentenceCounts(id),
      getTodaySentenceReviews(id),
      getCategories(id, "sentence"),
      getCategorySentenceCounts(id),
      getTomorrowSentenceReviews(id),
    ]);

  if (!language) notFound();

  return (
    <SentencesClient
      language={language}
      totalCount={sentenceCounts.total}
      graduatedCount={sentenceCounts.graduated}
      reviewCount={sentenceReviews.length}
      initialCategories={initialCategories}
      categoryCounts={categoryCounts}
      tomorrowCount={tomorrowItems.length}
    />
  );
}
```

- [ ] **Step 2: 修改 SentencesClient.tsx，加入 tomorrowCount prop 與連結**

找到 `interface Props`（約第 44–51 行），加入 `tomorrowCount`：

```ts
interface Props {
  language: Language;
  totalCount: number;
  graduatedCount: number;
  reviewCount: number;
  tomorrowCount: number;
  initialCategories: Category[];
  categoryCounts: Record<string, number>;
}
```

找到 function 宣告，加入解構：

```ts
export default function SentencesClient({
  language,
  totalCount,
  graduatedCount,
  reviewCount,
  tomorrowCount,
  initialCategories,
  categoryCounts,
}: Props) {
```

找到「複習按鈕」區塊（`reviewCount > 0` 的 JSX 條件，約第 147–161 行），在其之後插入：

```tsx
{tomorrowCount > 0 && (
  <Link
    href={`/languages/${language.id}/sentences/tomorrow`}
    className="text-sm text-emerald-600/70 dark:text-emerald-400/70 hover:text-emerald-500 text-center block -mt-3"
  >
    明天待複習 {tomorrowCount} 個 →
  </Link>
)}
```

- [ ] **Step 3: 執行 TypeScript 編譯**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

預期：無 type error。

- [ ] **Step 4: Commit**

```bash
git add "app/languages/[id]/sentences/page.tsx" "app/languages/[id]/sentences/SentencesClient.tsx"
git commit -m "feat(sentences): 句子管理頁加入明天待複習數量入口"
```

---

## Task 5: 建立句子明天複習預覽頁

**Files:**
- Create: `app/languages/[id]/sentences/tomorrow/page.tsx`
- Create: `app/languages/[id]/sentences/tomorrow/TomorrowSentenceClient.tsx`

- [ ] **Step 1: 建立 server component**

新建 `app/languages/[id]/sentences/tomorrow/page.tsx`：

```tsx
// app/languages/[id]/sentences/tomorrow/page.tsx
import { notFound } from "next/navigation";
import TomorrowSentenceClient from "./TomorrowSentenceClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getTomorrowSentenceReviews } from "@/lib/actions/sentences";

export default async function TomorrowSentencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, items] = await Promise.all([
    getLanguageById(id),
    getTomorrowSentenceReviews(id),
  ]);

  if (!language) notFound();

  return <TomorrowSentenceClient language={language} items={items} />;
}
```

- [ ] **Step 2: 建立 client component**

新建 `app/languages/[id]/sentences/tomorrow/TomorrowSentenceClient.tsx`：

```tsx
// app/languages/[id]/sentences/tomorrow/TomorrowSentenceClient.tsx
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/db/schema";
import type { TomorrowSentenceItem } from "@/lib/actions/sentences";

interface Props {
  language: Language;
  items: TomorrowSentenceItem[];
}

export default function TomorrowSentenceClient({ language, items }: Props) {
  const groups: Record<string, TomorrowSentenceItem[]> = {};
  for (const item of items) {
    const key = item.categoryName ?? "未分類";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          asChild
        >
          <Link href={`/languages/${language.id}/sentences`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Link>
        </Button>
        {items.length > 0 && (
          <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {items.length} 個
          </span>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">明天的複習預覽</h1>
        <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 mt-1">{language.name}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">明天沒有待複習的項目 🎉</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groups).map(([categoryName, groupItems]) => (
            <div key={categoryName} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-emerald-600/70 dark:text-emerald-400/70">
                {categoryName}（{groupItems.length} 個）
              </h2>
              {groupItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-1"
                >
                  <p className="font-bold text-foreground">{item.front}</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">{item.back}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 執行完整 build 與 lint**

```bash
npm run build 2>&1 | tail -20
```

預期：`✓ Compiled successfully` 或 `Route (app)` 路由表中出現 `/languages/[id]/vocabulary/tomorrow` 與 `/languages/[id]/sentences/tomorrow`。

```bash
npm run lint 2>&1 | tail -10
```

預期：無 error（warnings 可忽略）。

- [ ] **Step 4: 手動測試（啟動 dev server）**

```bash
npm run dev
```

驗證清單：
1. 進入單字管理頁，若有明天到期的單字，應看到「明天待複習 X 個 →」連結
2. 點擊連結，進入預覽頁，確認項目正確顯示（前面/後面均可見）
3. 確認分組標題正確（依分類名稱）
4. 頁面無「記得/忘記」按鈕
5. 點「返回」可回到單字管理頁
6. 若 tomorrow count = 0，管理頁不顯示連結（可手動在 DB 調整 nextReviewAt 驗證）
7. 以上流程對句子管理頁重複確認

- [ ] **Step 5: Commit**

```bash
git add "app/languages/[id]/sentences/tomorrow/"
git commit -m "feat(sentences): 新增句子明天複習預覽頁"
```
