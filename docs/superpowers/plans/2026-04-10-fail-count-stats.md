# 錯誤次數統計頁面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在每個語言的複習流程中記錄單字被忘記的累計次數，並在 `/languages/[id]/stats` 顯示錯誤排行榜。

**Architecture:** 在 `vocabulary` 表新增 `failCount` 欄位，修改 `markReview` server action 使其在 `remembered=false` 時遞增該欄位，同時調整 `ReviewClient` 使忘記時也呼叫 server action。新增 `getFailStats` action 與純 server component 統計頁面，並在語言頁面加入入口連結。

**Tech Stack:** Next.js App Router (server components + server actions), Drizzle ORM, Neon PostgreSQL, Tailwind CSS, shadcn/ui

---

## File Map

| 檔案 | 變更 |
|------|------|
| `lib/db/schema.ts` | 新增 `failCount` 欄位 |
| `drizzle/` | Drizzle Kit 自動產生 migration SQL |
| `lib/actions/vocabulary.ts` | 修改 `markReview`；新增 `getFailStats` |
| `app/review/[languageId]/ReviewClient.tsx` | 忘記時也呼叫 `markReview(id, false)` |
| `app/languages/[id]/LanguageClient.tsx` | 新增「錯誤統計」連結按鈕 |
| `app/languages/[id]/stats/page.tsx` | 新增統計頁面（server component，新建） |

---

## Task 1：在 Schema 新增 `failCount` 欄位

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1：修改 `lib/db/schema.ts`，在 `vocabulary` 表加入 `failCount`**

  在 `lastReviewedAt` 欄位下方新增一行：

  ```ts
  // lib/db/schema.ts（節錄 vocabulary table，顯示變更位置）
  export const vocabulary = pgTable("vocabulary", {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    languageId: text("language_id").references(() => languages.id, {
      onDelete: "set null",
    }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),
    front: text("japanese").notNull(),
    back: text("chinese").notNull(),
    exampleJp: text("example_jp").notNull().default(""),
    zhuyin: text("zhuyin").notNull().default(""),
    reviewStage: integer("review_stage").notNull().default(0),
    nextReviewAt: timestamp("next_review_at").default(sql`now()`).notNull(),
    lastReviewedAt: timestamp("last_reviewed_at"),
    failCount: integer("fail_count").notNull().default(0),   // ← 新增
    createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  });
  ```

- [ ] **Step 2：產生 migration**

  ```bash
  npx drizzle-kit generate
  ```

  預期在 `drizzle/` 產生一個新的 `.sql` 檔，內容類似：
  ```sql
  ALTER TABLE "vocabulary" ADD COLUMN "fail_count" integer NOT NULL DEFAULT 0;
  ```

- [ ] **Step 3：執行 migration**

  ```bash
  npx drizzle-kit migrate
  ```

  預期輸出：`... applied X migrations`（無錯誤）

- [ ] **Step 4：Commit**

  ```bash
  git add lib/db/schema.ts drizzle/
  git commit -m "feat(schema): 新增 vocabulary.failCount 欄位"
  ```

---

## Task 2：修改 `markReview` 以記錄錯誤次數

**Files:**
- Modify: `lib/actions/vocabulary.ts`

- [ ] **Step 1：修改 `markReview` 函式，在 `remembered=false` 時遞增 `failCount`**

  將 `lib/actions/vocabulary.ts` 中的 `markReview` 函式從：

  ```ts
  await db
    .update(vocabulary)
    .set({
      reviewStage: stage,
      nextReviewAt: nextReviewAtDate,
      lastReviewedAt: new Date(),
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));
  ```

  改為：

  ```ts
  await db
    .update(vocabulary)
    .set({
      reviewStage: stage,
      nextReviewAt: nextReviewAtDate,
      lastReviewedAt: new Date(),
      ...(remembered ? {} : { failCount: sql`${vocabulary.failCount} + 1` }),
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));
  ```

  同時確認檔案頂部的 import 已包含 `sql`（原本已有）。

- [ ] **Step 2：Commit**

  ```bash
  git add lib/actions/vocabulary.ts
  git commit -m "feat(actions): markReview 答錯時遞增 failCount"
  ```

---

## Task 3：新增 `getFailStats` Server Action

**Files:**
- Modify: `lib/actions/vocabulary.ts`

- [ ] **Step 1：在 `lib/actions/vocabulary.ts` 末尾新增 `getFailStats` 函式與型別**

  ```ts
  export type FailStat = {
    id: string;
    front: string;
    back: string;
    failCount: number;
    categoryName: string | null;
  };

  export async function getFailStats(languageId: string): Promise<FailStat[]> {
    const userId = await getUserId();
    return db
      .select({
        id: vocabulary.id,
        front: vocabulary.front,
        back: vocabulary.back,
        failCount: vocabulary.failCount,
        categoryName: categories.name,
      })
      .from(vocabulary)
      .leftJoin(categories, eq(vocabulary.categoryId, categories.id))
      .where(
        and(
          eq(vocabulary.userId, userId),
          eq(vocabulary.languageId, languageId),
          gt(vocabulary.failCount, 0)
        )
      )
      .orderBy(desc(vocabulary.failCount));
  }
  ```

  同時更新 `lib/actions/vocabulary.ts` 頂部的 import（加入 `gt` 和 `desc`）：

  ```ts
  import { and, eq, isNull, lte, lt, count, sql, gt, desc } from "drizzle-orm";
  ```

- [ ] **Step 2：Commit**

  ```bash
  git add lib/actions/vocabulary.ts
  git commit -m "feat(actions): 新增 getFailStats server action"
  ```

---

## Task 4：修改 `ReviewClient` 使忘記時也呼叫 `markReview`

**Files:**
- Modify: `app/review/[languageId]/ReviewClient.tsx`

目前 `ReviewClient.tsx` 第 75-88 行的 `handleAnswer` 函式只在 `remembered=true` 時呼叫 `markReview`。需要改成忘記時也呼叫。

- [ ] **Step 1：修改 `handleAnswer` 函式**

  將：

  ```ts
  async function handleAnswer(remembered: boolean) {
    if (!current || isPending) return;
    const currentCard = current;
    const nextIndex = index + 1;
    const isLastCard = nextIndex >= currentCards.length;

    if (!remembered) {
      setFailedIds((prev) => new Set(prev).add(currentCard.id));
      setForgottenThisRound((prev) => [...prev, currentCard]);
      if (isLastCard) setView("results");
      else setIndex(nextIndex);
    } else {
      setIsPending(true);
      await markReview(currentCard.id, !failedIds.has(currentCard.id));
      setRoundRemembered((n) => n + 1);
      setIsPending(false);
      if (isLastCard) setView("results");
      else setIndex(nextIndex);
    }
  }
  ```

  改為：

  ```ts
  async function handleAnswer(remembered: boolean) {
    if (!current || isPending) return;
    const currentCard = current;
    const nextIndex = index + 1;
    const isLastCard = nextIndex >= currentCards.length;

    setIsPending(true);
    if (!remembered) {
      setFailedIds((prev) => new Set(prev).add(currentCard.id));
      setForgottenThisRound((prev) => [...prev, currentCard]);
      await markReview(currentCard.id, false);
    } else {
      await markReview(currentCard.id, !failedIds.has(currentCard.id));
      setRoundRemembered((n) => n + 1);
    }
    setIsPending(false);
    if (isLastCard) setView("results");
    else setIndex(nextIndex);
  }
  ```

  注意：忘記時固定傳 `false`（不管 `failedIds`，因為每次答錯都應計入）；記得時維持原本的 `!failedIds.has(currentCard.id)` 邏輯（同一輪第一次記得才升 stage）。

- [ ] **Step 2：Commit**

  ```bash
  git add app/review/[languageId]/ReviewClient.tsx
  git commit -m "feat(review): 答錯時呼叫 markReview 以記錄 failCount"
  ```

---

## Task 5：新增統計頁面

**Files:**
- Create: `app/languages/[id]/stats/page.tsx`

- [ ] **Step 1：建立 `app/languages/[id]/stats/page.tsx`**

  ```tsx
  // app/languages/[id]/stats/page.tsx
  import { notFound } from "next/navigation";
  import Link from "next/link";
  import { getLanguageById } from "@/lib/actions/languages";
  import { getFailStats } from "@/lib/actions/vocabulary";
  import { Button } from "@/components/ui/button";
  import { ChevronLeft, BarChart2 } from "lucide-react";

  export default async function StatsPage({
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
        {/* 頂部導航 */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground px-0" asChild>
            <Link href={`/languages/${id}`}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {language.name}
            </Link>
          </Button>
        </div>

        {/* 標題 */}
        <div className="flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">錯誤排行榜</h1>
        </div>

        {/* 內容 */}
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
                {/* 排名 */}
                <span className="text-sm font-bold text-muted-foreground w-6 shrink-0 text-center">
                  {index + 1}
                </span>

                {/* 單字 */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold text-foreground truncate">{item.front}</span>
                  <span className="text-sm text-muted-foreground truncate">{item.back}</span>
                </div>

                {/* 分類標籤 */}
                {item.categoryName && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                    {item.categoryName}
                  </span>
                )}

                {/* 錯誤次數 */}
                <span className="text-sm font-bold text-red-500 shrink-0">
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

- [ ] **Step 2：Commit**

  ```bash
  git add app/languages/[id]/stats/page.tsx
  git commit -m "feat(stats): 新增語言錯誤排行榜頁面"
  ```

---

## Task 6：在語言頁面加入「錯誤統計」入口

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx`

- [ ] **Step 1：在「單字庫」標題列右側加入「錯誤統計」連結按鈕**

  找到 `LanguageClient.tsx` 中「單字庫」區塊的按鈕列（第 158-169 行），在「新增分類」按鈕前面加入「錯誤統計」連結：

  ```tsx
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-semibold text-foreground">單字庫</h2>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/languages/${language.id}/stats`}>
          <BarChart2 className="w-4 h-4 mr-1" />統計
        </Link>
      </Button>
      <Button onClick={() => setShowCatInput((s) => !s)}>
        <FolderPlus className="w-4 h-4 mr-1" />新增分類
      </Button>
      <Button asChild>
        <Link href={realUncategorized ? `/vocabulary/new?languageId=${language.id}&categoryId=${realUncategorized.id}` : `/vocabulary/new?languageId=${language.id}`}>
          <Plus className="w-4 h-4 mr-1" />新增單字
        </Link>
      </Button>
    </div>
  </div>
  ```

  同時在檔案頂部的 import 加入 `BarChart2`：

  ```ts
  import { BarChart2, FolderPlus, Plus } from "lucide-react";
  ```

- [ ] **Step 2：啟動 dev server 手動驗證**

  ```bash
  npm run dev
  ```

  確認以下流程正常：
  1. 語言頁面出現「統計」按鈕
  2. 點擊「統計」進入 `/languages/[id]/stats`
  3. 無錯誤紀錄時顯示空狀態
  4. 進行一次複習，答錯幾個單字
  5. 再次進入統計頁面，確認答錯的單字出現在排行榜

- [ ] **Step 3：Commit**

  ```bash
  git add app/languages/[id]/LanguageClient.tsx
  git commit -m "feat(language): 新增錯誤統計入口按鈕"
  ```
