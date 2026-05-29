# Sentence Category Practice Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在句子分類內頁新增「複習」按鈕，進入純本地練習模式，複習該分類全部句子，不更新 SRS 資料庫。

**Architecture:** 新增 `/languages/[id]/sentences/[categoryId]/review` 路由，page.tsx（server）載入全部句子後傳給 SentencePracticeClient（client）。Client 邏輯與現有 SentenceReviewClient 一致，但移除所有 DB 寫入與刪除操作。分類內頁 SentenceCategoryClient 新增「複習」按鈕導向此路由。

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, lucide-react, shadcn/ui

---

## File Map

| 動作 | 路徑 |
|------|------|
| **新增** | `app/languages/[id]/sentences/[categoryId]/review/page.tsx` |
| **新增** | `app/languages/[id]/sentences/[categoryId]/review/SentencePracticeClient.tsx` |
| **修改** | `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx` |

---

## Task 1：建立 SentencePracticeClient

**Files:**
- Create: `app/languages/[id]/sentences/[categoryId]/review/SentencePracticeClient.tsx`

- [ ] **Step 1：建立檔案，寫入完整 Client component**

建立 `app/languages/[id]/sentences/[categoryId]/review/SentencePracticeClient.tsx`，內容如下：

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FlashCard from "@/components/FlashCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import type { Language, Sentence } from "@/lib/db/schema";

export default function SentencePracticeClient({
  sentences,
  language,
  categoryId,
  categoryName,
}: {
  sentences: Sentence[];
  language: Language;
  categoryId: string;
  categoryName: string;
}) {
  const router = useRouter();
  const backUrl = `/languages/${language.id}/sentences/${categoryId}`;

  const [currentCards, setCurrentCards] = useState<Sentence[]>(() => {
    const shuffled = [...sentences];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [forgottenThisRound, setForgottenThisRound] = useState<Sentence[]>([]);
  const [roundRemembered, setRoundRemembered] = useState(0);
  const [round, setRound] = useState(1);
  const [view, setView] = useState<"reviewing" | "results">("reviewing");
  const [resetKey, setResetKey] = useState(0);

  const current = currentCards[index];

  if (sentences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <BookOpen className="w-14 h-14 text-emerald-500" />
        <h2 className="text-xl font-bold text-foreground">這個分類還沒有句子</h2>
        <Button variant="link" className="text-emerald-600" onClick={() => router.push(backUrl)}>
          回到{categoryName}
        </Button>
      </div>
    );
  }

  function handleAnswer(remembered: boolean) {
    if (!current) return;
    const currentCard = current;
    const nextIndex = index + 1;
    const isLastCard = nextIndex >= currentCards.length;

    if (!remembered) {
      setFailedIds((prev) => new Set(prev).add(currentCard.id));
      setForgottenThisRound((prev) => [...prev, currentCard]);
    } else if (!failedIds.has(currentCard.id)) {
      setRoundRemembered((n) => n + 1);
    }

    if (isLastCard) setView("results");
    else setIndex(nextIndex);
  }

  function startNextRound() {
    const nextCards = [...forgottenThisRound];
    for (let i = nextCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextCards[i], nextCards[j]] = [nextCards[j], nextCards[i]];
    }
    setCurrentCards(nextCards);
    setForgottenThisRound([]);
    setRoundRemembered(0);
    setIndex(0);
    setView("reviewing");
    setRound((r) => r + 1);
    setResetKey((k) => k + 1);
  }

  if (view === "results") {
    const forgotCount = forgottenThisRound.length;
    const allDone = forgotCount === 0;

    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        {allDone
          ? <Sparkles className="w-14 h-14 text-emerald-500" />
          : <CheckCircle2 className="w-14 h-14 text-emerald-500" />
        }
        <h2 className="text-2xl font-bold text-foreground">
          {allDone ? "全部記得！" : "這輪練習完成！"}
        </h2>
        <div className="flex gap-6">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-emerald-600">{roundRemembered}</span>
            <span className="text-sm text-muted-foreground">記得</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-red-500">{forgotCount}</span>
            <span className="text-sm text-muted-foreground">忘記</span>
          </div>
        </div>
        {!allDone && (
          <Button
            className="px-8 bg-emerald-500 hover:bg-emerald-600 text-white active:scale-[0.98] transition-transform"
            onClick={startNextRound}
          >
            <RotateCcw className="w-4 h-4 mr-1" />再練忘記的句子 ({forgotCount})
          </Button>
        )}
        <Button
          variant={allDone ? "default" : "ghost"}
          className={`active:scale-[0.98] transition-transform ${allDone ? "px-8 bg-emerald-500 hover:bg-emerald-600 text-white" : "text-muted-foreground"}`}
          onClick={() => router.push(backUrl)}
        >
          回到{categoryName}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{language.name} · 練習</span>
            {round > 1 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                第 {round} 輪
              </span>
            )}
          </div>
          <span className="font-bold text-foreground">
            {index + 1} / {currentCards.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push(backUrl)}
        >
          離開
        </Button>
      </div>
      <Progress value={((index + 1) / currentCards.length) * 100} className="w-full [&>div]:bg-emerald-500" />
      <FlashCard
        key={`${index}-${resetKey}`}
        card={current}
        ttsCode={language.ttsCode}
        isAnswering={false}
        onRemembered={() => handleAnswer(true)}
        onForgot={() => handleAnswer(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2：確認 TypeScript 編譯無誤**

```bash
cd /Users/user/Desktop/vocab && npx tsc --noEmit 2>&1 | head -30
```

預期：無錯誤輸出（或僅有與本次修改無關的既有錯誤）。

- [ ] **Step 3：Commit**

```bash
git add app/languages/\[id\]/sentences/\[categoryId\]/review/SentencePracticeClient.tsx
git commit -m "feat(sentences): 新增句子分類練習 Client component"
```

---

## Task 2：建立 review/page.tsx（Server Component）

**Files:**
- Create: `app/languages/[id]/sentences/[categoryId]/review/page.tsx`

- [ ] **Step 1：建立 Server Component**

建立 `app/languages/[id]/sentences/[categoryId]/review/page.tsx`，內容如下：

```tsx
import { notFound } from "next/navigation";
import { getLanguageById } from "@/lib/actions/languages";
import { getCategories } from "@/lib/actions/categories";
import { getSentences } from "@/lib/actions/sentences";
import SentencePracticeClient from "./SentencePracticeClient";

export default async function SentencePracticeReviewPage({
  params,
}: {
  params: Promise<{ id: string; categoryId: string }>;
}) {
  const { id, categoryId } = await params;
  const [language, categories, sentenceList] = await Promise.all([
    getLanguageById(id),
    getCategories(id, "sentence"),
    getSentences(id, categoryId),
  ]);

  if (!language) notFound();

  const categoryName =
    categoryId === "uncategorized"
      ? "未分類"
      : categories.find((c) => c.id === categoryId)?.name;

  if (!categoryName) notFound();

  return (
    <SentencePracticeClient
      sentences={sentenceList}
      language={language}
      categoryId={categoryId}
      categoryName={categoryName}
    />
  );
}
```

- [ ] **Step 2：確認 TypeScript 編譯無誤**

```bash
cd /Users/user/Desktop/vocab && npx tsc --noEmit 2>&1 | head -30
```

預期：無錯誤輸出。

- [ ] **Step 3：Commit**

```bash
git add app/languages/\[id\]/sentences/\[categoryId\]/review/page.tsx
git commit -m "feat(sentences): 新增句子分類練習頁 server component"
```

---

## Task 3：在分類內頁新增「複習」按鈕

**Files:**
- Modify: `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx`

- [ ] **Step 1：在 import 列加入 BookOpen icon**

找到現有 import 行：

```tsx
import { ArrowLeft, Check, ListPlus, Pencil, Plus, Trash2, Volume2, X } from "lucide-react";
```

改為：

```tsx
import { ArrowLeft, BookOpen, Check, ListPlus, Pencil, Plus, Trash2, Volume2, X } from "lucide-react";
```

- [ ] **Step 2：在按鈕列最前方加入「複習」按鈕**

找到現有按鈕列區塊（約 231–246 行）：

```tsx
        <div className="flex gap-2 shrink-0">
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => {
              setBatchOpen(true);
              setBatchText("");
              setBatchErrors([]);
            }}
          >
            <ListPlus className="w-4 h-4 mr-1" />
            批次新增
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShowAddForm((s) => !s)}>
            <Plus className="w-4 h-4 mr-1" />新增句子
          </Button>
        </div>
```

改為：

```tsx
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            disabled={sentences.length === 0}
            onClick={() => router.push(`/languages/${language.id}/sentences/${categoryId}/review`)}
          >
            <BookOpen className="w-4 h-4 mr-1" />複習
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => {
              setBatchOpen(true);
              setBatchText("");
              setBatchErrors([]);
            }}
          >
            <ListPlus className="w-4 h-4 mr-1" />
            批次新增
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShowAddForm((s) => !s)}>
            <Plus className="w-4 h-4 mr-1" />新增句子
          </Button>
        </div>
```

- [ ] **Step 3：確認 TypeScript 編譯無誤**

```bash
cd /Users/user/Desktop/vocab && npx tsc --noEmit 2>&1 | head -30
```

預期：無錯誤輸出。

- [ ] **Step 4：Commit**

```bash
git add app/languages/\[id\]/sentences/\[categoryId\]/SentenceCategoryClient.tsx
git commit -m "feat(sentences): 分類內頁新增複習按鈕導向練習模式"
```

---

## Task 4：手動驗證

- [ ] **Step 1：啟動開發伺服器**

```bash
cd /Users/user/Desktop/vocab && npm run dev
```

- [ ] **Step 2：驗證正常流程**

1. 開啟任一有句子的分類內頁（例如截圖中的「餐廳」分類）
2. 確認標題列出現「複習」按鈕（outline 綠色邊框）
3. 點擊「複習」，確認進入練習頁
4. 確認顯示「[語言名] · 練習」及進度條
5. 翻幾張卡片，標記記得 / 忘記
6. 完成最後一張卡片，確認出現結果頁
7. 結果頁點「回到[分類名]」，確認回到分類內頁

- [ ] **Step 3：驗證邊界情況**

1. 建立一個空分類，確認「複習」按鈕為 disabled 狀態
2. 直接訪問空分類的 `/review` URL，確認顯示「這個分類還沒有句子」畫面
3. 練習有忘記的句子時，確認「再練忘記的句子」按鈕出現並正常啟動下一輪
4. 第 2 輪確認顯示「第 2 輪」badge
5. 確認練習中按「離開」也回到分類內頁
