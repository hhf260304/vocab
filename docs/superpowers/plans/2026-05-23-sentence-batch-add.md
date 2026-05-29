# 句子批次新增 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在句子分類內頁加入「批次新增」功能，讓使用者可一次貼入多行 `句子 | 翻譯` 批次建立句子。

**Architecture:** 新增 `createSentences` server action 進行批次 insert；在 `SentenceCategoryClient` 加入 Dialog + Textarea UI，解析邏輯與單字批次新增完全對齊（自動判斷 Tab 或 `|` 分隔符）。

**Tech Stack:** Next.js App Router, Server Actions, Drizzle ORM, shadcn/ui Dialog + Textarea

---

### Task 1：新增 `createSentences` server action

**Files:**
- Modify: `lib/actions/sentences.ts`

- [ ] **Step 1：在 `lib/actions/sentences.ts` 末尾加入 `createSentences`**

在檔案最後的 `getCategorySentenceCounts` 函式之後加入以下程式碼：

```ts
export async function createSentences(
  items: { front: string; back: string }[],
  languageId: string,
  categoryId: string | null
): Promise<{ created: number }> {
  const userId = await getUserId();
  if (items.length === 0) return { created: 0 };

  await db.insert(sentences).values(
    items.map((item) => ({
      userId,
      languageId,
      categoryId,
      front: item.front,
      back: item.back,
      reviewStage: 0,
      nextReviewAt: new Date(),
    }))
  );

  revalidatePath("/");
  revalidatePath(`/languages/${languageId}`, "layout");
  return { created: items.length };
}
```

- [ ] **Step 2：確認 TypeScript 無型別錯誤**

```bash
npx tsc --noEmit 2>&1 | grep sentences
```

期望：無任何輸出（無錯誤）。

- [ ] **Step 3：Commit**

```bash
git add lib/actions/sentences.ts
git commit -m "feat(sentences): 新增批次建立 createSentences action"
```

---

### Task 2：在 SentenceCategoryClient 加入批次新增 UI

**Files:**
- Modify: `app/languages/[id]/sentences/[categoryId]/SentenceCategoryClient.tsx`

- [ ] **Step 1：更新 import**

將檔案頂部的 import 區塊改為以下內容（新增 `ListPlus`、`Dialog` 系列元件、`Textarea`、`useRouter`、`createSentences`）：

```tsx
"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Check, ListPlus, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSentence, createSentences, updateSentence, deleteSentence } from "@/lib/actions/sentences";
import type { Category, Language, Sentence } from "@/lib/db/schema";
```

- [ ] **Step 2：在 Props interface 之前加入解析函式**

在 `interface Props` 的上方加入：

```tsx
function parseBatchSentenceLine(line: string): { front: string; back: string } | null {
  const parts = line.includes("\t") ? line.split("\t") : line.split("|");
  const [front, back] = parts.map((p) => p.trim());
  if (!front || !back) return null;
  return { front, back };
}
```

- [ ] **Step 3：在 component 函式內加入批次相關狀態與 router**

在 `export default function SentenceCategoryClient` 函式體內，緊接在既有的 `const [, startTransition] = useTransition();` 下方加入：

```tsx
  const router = useRouter();
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchErrors, setBatchErrors] = useState<number[]>([]);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
```

- [ ] **Step 4：加入 `handleBatchCreate` handler**

在 `handleDelete` 函式之後、`return` 之前加入：

```tsx
  async function handleBatchCreate() {
    const lines = batchText.split("\n").filter((l) => l.trim());
    const errorLines: number[] = [];
    const items: { front: string; back: string }[] = [];

    lines.forEach((line, i) => {
      const parsed = parseBatchSentenceLine(line);
      if (!parsed) errorLines.push(i + 1);
      else items.push(parsed);
    });

    if (errorLines.length > 0) {
      setBatchErrors(errorLines);
      return;
    }
    if (items.length === 0) return;

    setIsBatchSubmitting(true);
    await createSentences(items, language.id, defaultCategoryId);
    setIsBatchSubmitting(false);
    setBatchOpen(false);
    setBatchText("");
    setBatchErrors([]);
    router.refresh();
  }
```

- [ ] **Step 5：更新標題列按鈕區，加入「批次新增」按鈕**

找到以下原始程式碼：

```tsx
        <Button onClick={() => setShowAddForm((s) => !s)}>
          <Plus className="w-4 h-4 mr-1" />新增句子
        </Button>
```

改為：

```tsx
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setBatchOpen(true);
              setBatchText("");
              setBatchErrors([]);
            }}
          >
            <ListPlus className="w-4 h-4 mr-1" />批次新增
          </Button>
          <Button onClick={() => setShowAddForm((s) => !s)}>
            <Plus className="w-4 h-4 mr-1" />新增句子
          </Button>
        </div>
```

- [ ] **Step 6：在 `return` 的最外層 `<div>` 結尾前加入批次新增 Dialog**

找到 `</div>` 的最後一個（對應最外層 `<div className="flex flex-col gap-6">`），在它之前加入：

```tsx
      {/* 批次新增 */}
      <Dialog
        open={batchOpen}
        onOpenChange={(o) => {
          setBatchOpen(o);
          if (!o) {
            setBatchText("");
            setBatchErrors([]);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次新增句子 — {categoryName}</DialogTitle>
            <DialogDescription>
              每行一筆：句子（{language.name}） | 翻譯（母語）
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              rows={8}
              placeholder={"I love cats | 我愛貓\nShe runs fast | 她跑得很快"}
              value={batchText}
              onChange={(e) => {
                setBatchText(e.target.value);
                if (batchErrors.length > 0) setBatchErrors([]);
              }}
            />
            {batchErrors.length > 0 && (
              <p className="text-sm text-destructive">
                以下行格式有誤（需至少「句子 | 翻譯」）：
                {batchErrors.map((n) => (
                  <span key={n} className="block font-medium">
                    ・第 {n} 行
                  </span>
                ))}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBatchCreate} disabled={isBatchSubmitting}>
              {isBatchSubmitting ? (
                "新增中…"
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  新增
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 7：確認 TypeScript 無型別錯誤**

```bash
npx tsc --noEmit 2>&1 | grep -E "SentenceCategoryClient|sentences"
```

期望：無任何輸出。

- [ ] **Step 8：啟動開發伺服器手動驗證**

```bash
npm run dev
```

驗證項目：
1. 進入任一語言的句子分類內頁，確認「批次新增」按鈕出現在「新增句子」左側
2. 點擊「批次新增」，確認 Dialog 開啟
3. 輸入 `Hello world | 你好世界`，按「新增」，確認句子出現在列表中
4. 輸入格式錯誤的行（如只有 `Hello world`），確認顯示錯誤行號提示
5. 確認取消按鈕正常關閉 Dialog 並清空文字

- [ ] **Step 9：Commit**

```bash
git add app/languages/\[id\]/sentences/\[categoryId\]/SentenceCategoryClient.tsx
git commit -m "feat(sentences): 句子分類內頁加入批次新增功能"
```
