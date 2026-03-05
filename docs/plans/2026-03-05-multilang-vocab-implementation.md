# 多語言單字學習系統 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將現有日中文單字 app 泛化為支援多語言的獨立複習平台，首頁改為語言卡片選擇器，表單欄位改為正面/反面/例句，FlashCard 依語言設定播音。

**Architecture:** 使用 Drizzle ORM 的欄位別名功能（`text("japanese")` 映射為 TypeScript 的 `front`），避免資料庫欄位重新命名的複雜 migration。新增 `languages` 表作為語言組管理，每個語言組有獨立的 SRS 複習佇列、TTS 代碼和預設顯示面設定。

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Neon Postgres, drizzle-kit, Web Speech API

---

## 全域規則

- 所有 `vocab.japanese` → `vocab.front`，`vocab.chinese` → `vocab.back`
- TTS 只在 `back`（目標語言）觸發，`front` 永遠靜音
- `defaultSide: 'front'` → 先看正面再翻轉播音；`defaultSide: 'back'` → 進入即播音正面靜音
- 每完成一個 Task 就 commit

---

### Task 1: Schema 更新 + DB Migration

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `drizzle/` (自動產生 migration)

**Step 1: 更新 schema.ts**

將 `lib/db/schema.ts` 完整取代為：

```typescript
// lib/db/schema.ts
import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  name: text("name"),
  image: text("image"),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const languages = pgTable("languages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ttsCode: text("tts_code").notNull(),
  defaultSide: text("default_side").notNull().default("front"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

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
    onDelete: "set null",
  }),
  // 欄位別名：DB 欄位名稱不變，TypeScript 使用 front/back
  front: text("japanese").notNull(),
  back: text("chinese").notNull(),
  exampleJp: text("example_jp").notNull().default(""),
  reviewStage: integer("review_stage").notNull().default(0),
  nextReviewAt: timestamp("next_review_at").default(sql`now()`).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export type User = typeof users.$inferSelect;
export type Language = typeof languages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Vocabulary = typeof vocabulary.$inferSelect;
export type NewLanguage = typeof languages.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewVocabulary = typeof vocabulary.$inferInsert;
```

**Step 2: 產生並執行 migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

預期：產生新 migration 檔案，建立 `languages` 表並在 `vocabulary` 加入 `language_id` 欄位。

**Step 3: 驗證**

```bash
npx tsc --noEmit
```

預期：只有下游 TypeScript 錯誤（`vocab.japanese` / `vocab.chinese` 找不到），這些將在後續 Task 修復。

**Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add languages table and language_id to vocabulary schema"
```

---

### Task 2: Language Server Actions

**Files:**
- Create: `lib/actions/languages.ts`

**Step 1: 建立 `lib/actions/languages.ts`**

```typescript
// lib/actions/languages.ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { languages } from "@/lib/db/schema";

export const PRESET_LANGUAGES = [
  { name: "中文", ttsCode: "zh-TW" },
  { name: "英文", ttsCode: "en-US" },
  { name: "日文", ttsCode: "ja-JP" },
  { name: "韓文", ttsCode: "ko-KR" },
] as const;

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  return session.user.id;
}

export async function getLanguages() {
  const userId = await getUserId();
  return db
    .select()
    .from(languages)
    .where(eq(languages.userId, userId))
    .orderBy(languages.createdAt);
}

export async function createLanguage(data: {
  name: string;
  ttsCode: string;
  defaultSide?: "front" | "back";
}) {
  const userId = await getUserId();
  const [created] = await db
    .insert(languages)
    .values({
      userId,
      name: data.name,
      ttsCode: data.ttsCode,
      defaultSide: data.defaultSide ?? "front",
    })
    .returning();
  revalidatePath("/");
  return created;
}

export async function updateLanguage(
  id: string,
  data: { defaultSide?: "front" | "back" }
) {
  const userId = await getUserId();
  await db
    .update(languages)
    .set({ ...(data.defaultSide && { defaultSide: data.defaultSide }) })
    .where(and(eq(languages.id, id), eq(languages.userId, userId)));
  revalidatePath("/");
  revalidatePath(`/languages/${id}`);
}

export async function deleteLanguage(id: string) {
  const userId = await getUserId();
  await db
    .delete(languages)
    .where(and(eq(languages.id, id), eq(languages.userId, userId)));
  revalidatePath("/");
}

export async function getLanguageById(id: string) {
  const userId = await getUserId();
  const [lang] = await db
    .select()
    .from(languages)
    .where(and(eq(languages.id, id), eq(languages.userId, userId)));
  return lang ?? null;
}
```

**Step 2: 驗證**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add lib/actions/languages.ts
git commit -m "feat: add language server actions"
```

---

### Task 3: 更新 Vocabulary Server Actions

**Files:**
- Modify: `lib/actions/vocabulary.ts`

**Step 1: 完整取代 `lib/actions/vocabulary.ts`**

```typescript
// lib/actions/vocabulary.ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq, lte, lt } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { vocabulary } from "@/lib/db/schema";
import { getNextReviewAt } from "@/lib/srs";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("未登入");
  return session.user.id;
}

export async function getVocabularies(languageId?: string) {
  const userId = await getUserId();
  const conditions = [eq(vocabulary.userId, userId)];
  if (languageId) conditions.push(eq(vocabulary.languageId, languageId));
  return db
    .select()
    .from(vocabulary)
    .where(and(...conditions))
    .orderBy(vocabulary.createdAt);
}

export async function getTodayReviews(languageId: string) {
  const userId = await getUserId();
  const now = new Date();
  return db
    .select()
    .from(vocabulary)
    .where(
      and(
        eq(vocabulary.userId, userId),
        eq(vocabulary.languageId, languageId),
        lt(vocabulary.reviewStage, 5),
        lte(vocabulary.nextReviewAt, now)
      )
    );
}

export async function createVocabulary(data: {
  front: string;
  back: string;
  exampleJp?: string;
  categoryId: string | null;
  languageId: string | null;
}) {
  const userId = await getUserId();
  const [created] = await db
    .insert(vocabulary)
    .values({
      userId,
      front: data.front.trim(),
      back: data.back.trim(),
      exampleJp: data.exampleJp?.trim() ?? "",
      categoryId: data.categoryId,
      languageId: data.languageId,
      reviewStage: 0,
      nextReviewAt: new Date(),
    })
    .returning();

  revalidatePath("/vocabulary");
  revalidatePath("/");
  return created;
}

export async function updateVocabulary(
  id: string,
  data: {
    front?: string;
    back?: string;
    exampleJp?: string;
    categoryId?: string | null;
    languageId?: string | null;
  }
) {
  const userId = await getUserId();
  await db
    .update(vocabulary)
    .set({
      ...(data.front !== undefined && { front: data.front.trim() }),
      ...(data.back !== undefined && { back: data.back.trim() }),
      ...(data.exampleJp !== undefined && { exampleJp: data.exampleJp.trim() }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.languageId !== undefined && { languageId: data.languageId }),
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/vocabulary");
  revalidatePath("/");
}

export async function deleteVocabulary(id: string) {
  const userId = await getUserId();
  await db
    .delete(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/vocabulary");
  revalidatePath("/");
}

export async function getVocabularyById(id: string) {
  const userId = await getUserId();
  const [vocab] = await db
    .select()
    .from(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));
  return vocab ?? null;
}

export async function markReview(id: string, remembered: boolean) {
  const userId = await getUserId();
  const [vocab] = await db
    .select()
    .from(vocabulary)
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  if (!vocab) return;

  const { stage, nextReviewAt } = getNextReviewAt(vocab.reviewStage, remembered);

  const nextReviewAtDate =
    nextReviewAt === Infinity
      ? new Date("9999-12-31T00:00:00Z")
      : new Date(nextReviewAt);

  await db
    .update(vocabulary)
    .set({
      reviewStage: stage,
      nextReviewAt: nextReviewAtDate,
      lastReviewedAt: new Date(),
    })
    .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));

  revalidatePath("/");
}
```

**Step 2: 更新 `lib/types.ts`**

```typescript
// lib/types.ts
export interface Vocabulary {
  id: string;
  front: string;
  back: string;
  exampleJp: string;
  categoryId: string | null;
  languageId: string | null;
  createdAt: number;
  reviewStage: 0 | 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number;
  lastReviewedAt?: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface Language {
  id: string;
  name: string;
  ttsCode: string;
  defaultSide: "front" | "back";
}

export type VocabFormData = {
  front: string;
  back: string;
  exampleJp: string;
  categoryId: string | null;
  languageId: string | null;
};
```

**Step 3: 驗證**

```bash
npx tsc --noEmit
```

預期：仍有下游錯誤（元件還未更新），繼續下個 Task。

**Step 4: Commit**

```bash
git add lib/actions/vocabulary.ts lib/types.ts
git commit -m "feat: update vocabulary actions and types for multilang support"
```

---

### Task 4: 更新 FlashCard 元件

**Files:**
- Modify: `components/FlashCard.tsx`

**Step 1: 完整取代 `components/FlashCard.tsx`**

```tsx
// components/FlashCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Vocabulary } from "@/lib/db/schema";

interface Props {
  vocab: Vocabulary;
  ttsCode: string;
  defaultSide: "front" | "back";
  onRemembered: () => void;
  onForgot: () => void;
}

export default function FlashCard({
  vocab,
  ttsCode,
  defaultSide,
  onRemembered,
  onForgot,
}: Props) {
  // defaultSide='front' → 初始未翻轉（正面朝上）
  // defaultSide='back'  → 初始已翻轉（反面朝上，立即播音）
  const [flipped, setFlipped] = useState(defaultSide === "back");

  function speakBack() {
    const utterance = new SpeechSynthesisUtterance(vocab.back);
    utterance.lang = ttsCode;
    speechSynthesis.speak(utterance);
  }

  // 進入新卡片時，若 defaultSide='back' 立即播音
  useEffect(() => {
    if (defaultSide === "back") {
      speakBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab.id]);

  // 翻轉至反面時播音（僅 defaultSide='front' 時會觸發）
  useEffect(() => {
    if (flipped && defaultSide === "front") {
      speakBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  function handleAnswer(remembered: boolean) {
    setFlipped(defaultSide === "back");
    setTimeout(() => {
      if (remembered) onRemembered();
      else onForgot();
    }, 150);
  }

  const frontContent = defaultSide === "front" ? vocab.front : vocab.back;
  const backContent = defaultSide === "front" ? vocab.back : vocab.front;
  const backIsTarget = defaultSide === "front"; // 反面才是目標語言

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="perspective w-full max-w-sm">
        <div
          className={`relative w-full h-56 cursor-pointer transform-style-3d transition-transform duration-500 ${flipped ? "rotate-y-180" : ""}`}
          onClick={() => setFlipped((f) => !f)}
        >
          {/* 正面 */}
          <div className="backface-hidden absolute inset-0 bg-white rounded-3xl border-2 border-stone-200 flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-stone-900 text-center">
              {frontContent}
            </p>
            <p className="text-stone-400 text-sm mt-4">點擊翻轉</p>
          </div>

          {/* 反面 */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 bg-stone-800 rounded-3xl flex flex-col items-center justify-center p-6 shadow-sm">
            <p className="text-4xl font-bold text-white text-center">
              {backContent}
            </p>
            {backIsTarget && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakBack();
                  }}
                  className="text-stone-300 hover:text-white transition-colors text-xl"
                >
                  🔊
                </button>
              </div>
            )}
            {vocab.exampleJp && (
              <div className="mt-4 text-center">
                <p className="text-stone-200 text-sm">{vocab.exampleJp}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex gap-4 w-full max-w-sm">
          <Button
            variant="outline"
            className="flex-1 h-auto py-3.5 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-600 rounded-2xl font-semibold"
            onClick={() => handleAnswer(false)}
          >
            😞 忘記
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-auto py-3.5 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-600 rounded-2xl font-semibold"
            onClick={() => handleAnswer(true)}
          >
            😊 記得
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 驗證**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add components/FlashCard.tsx
git commit -m "feat: update FlashCard to support ttsCode and defaultSide props"
```

---

### Task 5: 更新 VocabForm 元件

**Files:**
- Modify: `components/VocabForm.tsx`

**Step 1: 完整取代 `components/VocabForm.tsx`**

```tsx
// components/VocabForm.tsx
"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PRESET_LANGUAGES } from "@/lib/actions/languages";
import type { VocabFormData } from "@/lib/types";
import { cn } from "@/lib/utils";

type CategoryLike = { id: string; name: string };
type LanguageLike = { id: string; name: string; ttsCode: string };

interface Props {
  categories: CategoryLike[];
  languages: LanguageLike[];
  initialData?: VocabFormData & { id?: string };
  onSubmit: (data: VocabFormData) => void;
  onCreateCategory?: (name: string) => Promise<CategoryLike>;
  onCreateLanguage?: (name: string, ttsCode: string) => Promise<LanguageLike>;
  submitLabel: string;
  showCategorySelector?: boolean;
}

export default function VocabForm({
  categories,
  languages,
  initialData,
  onSubmit,
  onCreateCategory,
  onCreateLanguage,
  submitLabel,
  showCategorySelector = false,
}: Props) {
  const [catOpen, setCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [form, setForm] = useState<VocabFormData>({
    front: "",
    back: "",
    exampleJp: "",
    categoryId: null,
    languageId: null,
    ...initialData,
  });

  function setField(field: keyof VocabFormData, value: string | null) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSelectCategory(catId: string) {
    setField("categoryId", form.categoryId === catId ? null : catId);
    setCatOpen(false);
    setCatSearch("");
  }

  async function handleCreateCategory() {
    const trimmed = catSearch.trim();
    if (!trimmed || !onCreateCategory) return;
    const created = await onCreateCategory(trimmed);
    setField("categoryId", created.id);
    setCatOpen(false);
    setCatSearch("");
  }

  function handleSelectLanguage(langId: string) {
    setField("languageId", form.languageId === langId ? null : langId);
    setLangOpen(false);
  }

  async function handleCreatePresetLanguage(name: string, ttsCode: string) {
    if (!onCreateLanguage) return;
    const created = await onCreateLanguage(name, ttsCode);
    setField("languageId", created.id);
    setLangOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.front || !form.back) return;
    onSubmit(form);
  }

  const selectedLang = languages.find((l) => l.id === form.languageId);

  // 預設清單中尚未被使用者建立的語言
  const availablePresets = PRESET_LANGUAGES.filter(
    (p) => !languages.some((l) => l.name === p.name)
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* 語言選擇 */}
      <div className="flex flex-col gap-1.5">
        <Label>語言 *</Label>
        <Popover open={langOpen} onOpenChange={setLangOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={langOpen}
              className="w-full justify-between font-normal"
            >
              {selectedLang ? selectedLang.name : "— 選擇語言 —"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandList>
                {languages.length > 0 && (
                  <CommandGroup heading="我的語言">
                    {languages.map((lang) => (
                      <CommandItem
                        key={lang.id}
                        value={lang.id}
                        onSelect={() => handleSelectLanguage(lang.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.languageId === lang.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {lang.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {availablePresets.length > 0 && (
                  <CommandGroup heading="新增語言">
                    {availablePresets.map((p) => (
                      <CommandItem
                        key={p.ttsCode}
                        value={p.name}
                        onSelect={() =>
                          handleCreatePresetLanguage(p.name, p.ttsCode)
                        }
                        className="text-muted-foreground"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {p.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* 正面 */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="front">正面（提示）*</Label>
        <Input
          id="front"
          value={form.front}
          onChange={(e) => setField("front", e.target.value)}
          placeholder="例：吃"
          required
        />
      </div>

      {/* 反面 */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="back">反面（目標語言）*</Label>
        <Input
          id="back"
          value={form.back}
          onChange={(e) => setField("back", e.target.value)}
          placeholder="例：食べる"
          required
        />
      </div>

      {/* 例句 */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="exampleJp">例句</Label>
        <Input
          id="exampleJp"
          value={form.exampleJp}
          onChange={(e) => setField("exampleJp", e.target.value)}
          placeholder="例：ご飯を食べる。"
        />
      </div>

      {/* 分類（可選） */}
      {showCategorySelector && (
        <div className="flex flex-col gap-1.5">
          <Label>分類</Label>
          <Popover open={catOpen} onOpenChange={setCatOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={catOpen}
                className="w-full justify-between font-normal"
              >
                {form.categoryId
                  ? (categories.find((c) => c.id === form.categoryId)?.name ??
                    "— 不指定分類 —")
                  : "— 不指定分類 —"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="搜尋或輸入新分類…"
                  value={catSearch}
                  onValueChange={setCatSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {catSearch.trim() ? (
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Plus className="h-4 w-4" />
                        建立「{catSearch.trim()}」
                      </button>
                    ) : (
                      <p className="py-2 text-center text-sm text-muted-foreground">
                        尚無分類
                      </p>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {categories.map((cat) => (
                      <CommandItem
                        key={cat.id}
                        value={cat.name}
                        onSelect={() => handleSelectCategory(cat.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.categoryId === cat.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {cat.name}
                      </CommandItem>
                    ))}
                    {catSearch.trim() &&
                      !categories.some(
                        (c) =>
                          c.name.toLowerCase() ===
                          catSearch.trim().toLowerCase()
                      ) && (
                        <CommandItem
                          value={`__create__${catSearch}`}
                          onSelect={handleCreateCategory}
                          className="text-muted-foreground"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          建立「{catSearch.trim()}」
                        </CommandItem>
                      )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Button type="submit" className="w-full mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}
```

**Step 2: 驗證**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add components/VocabForm.tsx
git commit -m "feat: update VocabForm with front/back labels and language selector"
```

---

### Task 6: 首頁改為語言卡片

**Files:**
- Create: `components/LanguageCard.tsx`
- Modify: `app/page.tsx`

**Step 1: 建立 `components/LanguageCard.tsx`**

```tsx
// components/LanguageCard.tsx
import Link from "next/link";
import type { Language } from "@/lib/db/schema";

interface Props {
  language: Language;
  reviewCount: number;
  totalCount: number;
}

export default function LanguageCard({ language, reviewCount, totalCount }: Props) {
  return (
    <Link href={`/languages/${language.id}`}>
      <div className="bg-card border border-border rounded-2xl p-5 hover:border-foreground/30 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">{language.name}</h2>
          {reviewCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
              {reviewCount}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {totalCount} 個單字
          {reviewCount > 0
            ? `・${reviewCount} 個待複習`
            : totalCount > 0
            ? "・今日已完成"
            : ""}
        </p>
      </div>
    </Link>
  );
}
```

**Step 2: 更新 `app/page.tsx`**

```tsx
// app/page.tsx
import Link from "next/link";
import LanguageCard from "@/components/LanguageCard";
import { Button } from "@/components/ui/button";
import { getLanguages, createLanguage, PRESET_LANGUAGES } from "@/lib/actions/languages";
import { getVocabularies, getTodayReviews } from "@/lib/actions/vocabulary";

export default async function DashboardPage() {
  const langs = await getLanguages();

  // 取得每個語言的統計
  const stats = await Promise.all(
    langs.map(async (lang) => {
      const [all, reviews] = await Promise.all([
        getVocabularies(lang.id),
        getTodayReviews(lang.id),
      ]);
      return { lang, totalCount: all.length, reviewCount: reviews.length };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">學習語言</h1>
        <p className="text-muted-foreground text-sm mt-1">選擇語言開始複習</p>
      </div>

      {langs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-4">🌍</p>
          <p className="font-medium text-foreground">尚未新增任何語言</p>
          <p className="text-sm mt-1 mb-6">從下方選擇要學習的語言</p>
          <AddLanguageButtons />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {stats.map(({ lang, totalCount, reviewCount }) => (
              <LanguageCard
                key={lang.id}
                language={lang}
                reviewCount={reviewCount}
                totalCount={totalCount}
              />
            ))}
          </div>
          <AddLanguageButtons existingNames={langs.map((l) => l.name)} />
        </>
      )}
    </div>
  );
}

async function AddLanguageButtons({ existingNames = [] }: { existingNames?: string[] }) {
  const available = PRESET_LANGUAGES.filter(
    (p) => !existingNames.includes(p.name)
  );
  if (available.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground font-medium">新增語言</p>
      <div className="flex flex-wrap gap-2">
        {available.map((preset) => (
          <form key={preset.ttsCode} action={async () => {
            "use server";
            await createLanguage({ name: preset.name, ttsCode: preset.ttsCode });
          }}>
            <Button type="submit" variant="outline" size="sm">
              + {preset.name}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: 驗證**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add components/LanguageCard.tsx app/page.tsx
git commit -m "feat: replace home page with language card dashboard"
```

---

### Task 7: 語言詳細頁面

**Files:**
- Create: `app/languages/[id]/page.tsx`
- Create: `app/languages/[id]/LanguageClient.tsx`

**Step 1: 建立 `app/languages/[id]/LanguageClient.tsx`**

```tsx
// app/languages/[id]/LanguageClient.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { deleteLanguage, updateLanguage } from "@/lib/actions/languages";
import type { Language } from "@/lib/db/schema";

interface Props {
  language: Language;
  reviewCount: number;
  totalCount: number;
  graduatedCount: number;
}

export default function LanguageClient({
  language,
  reviewCount,
  totalCount,
  graduatedCount,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleToggleSide() {
    const newSide = language.defaultSide === "front" ? "back" : "front";
    startTransition(async () => {
      await updateLanguage(language.id, { defaultSide: newSide });
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteLanguage(language.id);
      router.push("/");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{language.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            預設顯示：{language.defaultSide === "front" ? "正面（提示）" : "反面（目標語言）"}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              刪除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>刪除語言</AlertDialogTitle>
              <AlertDialogDescription>
                確定刪除「{language.name}」？此語言的單字將不會被刪除，但會失去語言關聯。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{reviewCount}</p>
          <p className="text-xs text-muted-foreground mt-1">待複習</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-1">總單字</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{graduatedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">已畢業</p>
        </div>
      </div>

      {/* 開始複習 */}
      {reviewCount > 0 ? (
        <Button size="lg" className="w-full text-lg py-7" asChild>
          <Link href={`/review/${language.id}`}>
            開始複習（{reviewCount} 個）
          </Link>
        </Button>
      ) : (
        <Button size="lg" className="w-full text-lg py-7" disabled>
          今日無待複習單字
        </Button>
      )}

      {/* 快捷操作 */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/vocabulary/new?languageId=${language.id}`}>
            + 新增單字
          </Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/vocabulary?languageId=${language.id}`}>
            查看單字庫
          </Link>
        </Button>
      </div>

      {/* 設定 */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-3">複習設定</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">預設顯示面</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language.defaultSide === "front"
                ? "先看提示，翻轉後看目標語言"
                : "先看目標語言，翻轉後看提示"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleToggleSide}>
            {language.defaultSide === "front" ? "切換為反面" : "切換為正面"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 建立 `app/languages/[id]/page.tsx`**

```tsx
// app/languages/[id]/page.tsx
import { notFound } from "next/navigation";
import LanguageClient from "./LanguageClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getVocabularies, getTodayReviews } from "@/lib/actions/vocabulary";

export default async function LanguagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [language, allVocab, reviews] = await Promise.all([
    getLanguageById(id),
    getVocabularies(id),
    getTodayReviews(id),
  ]);

  if (!language) notFound();

  const graduatedCount = allVocab.filter((v) => v.reviewStage === 5).length;

  return (
    <LanguageClient
      language={language}
      reviewCount={reviews.length}
      totalCount={allVocab.length}
      graduatedCount={graduatedCount}
    />
  );
}
```

**Step 3: 驗證**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add app/languages/
git commit -m "feat: add language detail page with stats and review controls"
```

---

### Task 8: 複習頁面改為 per-language

**Files:**
- Create: `app/review/[languageId]/page.tsx`
- Create: `app/review/[languageId]/ReviewClient.tsx`
- Delete: `app/review/page.tsx`
- Delete: `app/review/ReviewClient.tsx`

**Step 1: 建立 `app/review/[languageId]/ReviewClient.tsx`**

```tsx
// app/review/[languageId]/ReviewClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FlashCard from "@/components/FlashCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { markReview } from "@/lib/actions/vocabulary";
import type { Language, Vocabulary } from "@/lib/db/schema";

export default function ReviewClient({
  queue,
  language,
}: {
  queue: Vocabulary[];
  language: Language;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState({ remembered: 0, forgot: 0 });
  const [done, setDone] = useState(false);

  const current = queue[index];
  const total = queue.length;

  async function handleAnswer(remembered: boolean) {
    await markReview(current.id, remembered);
    setResults((r) => ({
      remembered: r.remembered + (remembered ? 1 : 0),
      forgot: r.forgot + (remembered ? 0 : 1),
    }));
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="text-xl font-bold text-foreground">
          今日沒有待複習單字
        </h2>
        <Button
          variant="link"
          className="text-primary"
          onClick={() => router.push(`/languages/${language.id}`)}
        >
          回到{language.name}
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <p className="text-5xl">✅</p>
        <h2 className="text-2xl font-bold text-foreground">複習完成！</h2>
        <div className="flex gap-6">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-emerald-600">
              {results.remembered}
            </span>
            <span className="text-sm text-muted-foreground">記得</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-red-500">
              {results.forgot}
            </span>
            <span className="text-sm text-muted-foreground">忘記</span>
          </div>
        </div>
        <Button
          className="px-8"
          onClick={() => router.push(`/languages/${language.id}`)}
        >
          回到{language.name}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{language.name} 進度</span>
          <span className="font-bold text-foreground">
            {index + 1} / {total}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push(`/languages/${language.id}`)}
        >
          離開
        </Button>
      </div>
      <Progress value={(index / total) * 100} className="w-full" />
      <FlashCard
        key={current.id}
        vocab={current}
        ttsCode={language.ttsCode}
        defaultSide={language.defaultSide as "front" | "back"}
        onRemembered={() => handleAnswer(true)}
        onForgot={() => handleAnswer(false)}
      />
    </div>
  );
}
```

**Step 2: 建立 `app/review/[languageId]/page.tsx`**

```tsx
// app/review/[languageId]/page.tsx
import { notFound } from "next/navigation";
import ReviewClient from "./ReviewClient";
import { getLanguageById } from "@/lib/actions/languages";
import { getTodayReviews } from "@/lib/actions/vocabulary";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ languageId: string }>;
}) {
  const { languageId } = await params;
  const [language, queue] = await Promise.all([
    getLanguageById(languageId),
    getTodayReviews(languageId),
  ]);

  if (!language) notFound();

  return <ReviewClient queue={queue} language={language} />;
}
```

**Step 3: 刪除舊 review 檔案**

```bash
rm app/review/page.tsx app/review/ReviewClient.tsx
```

**Step 4: 驗證**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add app/review/
git commit -m "feat: move review page to per-language route /review/[languageId]"
```

---

### Task 9: 更新 VocabCard 元件

**Files:**
- Modify: `components/VocabCard.tsx`

**Step 1: 修改 VocabCard.tsx**

將 `vocab.japanese` → `vocab.front`，`vocab.chinese` → `vocab.back`：

```tsx
// components/VocabCard.tsx
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Category, Vocabulary } from "@/lib/db/schema";
import CategoryTag from "./CategoryTag";

interface Props {
  vocab: Vocabulary;
  categories: Category[];
  onDelete: () => void;
}

const STAGE_LABELS = ["新", "第1次", "第2次", "第3次", "第4次", "畢業"];

export default function VocabCard({ vocab, categories, onDelete }: Props) {
  const vocabCategory = categories.find((c) => c.id === vocab.categoryId);

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-foreground">
              {vocab.back}
            </span>
            <span className="text-sm font-medium text-primary">
              {vocab.front}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {STAGE_LABELS[vocab.reviewStage]}
            </Badge>
            {vocabCategory && (
              <CategoryTag key={vocabCategory.id} category={vocabCategory} />
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vocabulary/${vocab.id}`}>編輯</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            刪除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/VocabCard.tsx
git commit -m "feat: update VocabCard to use front/back fields"
```

---

### Task 10: 更新 VocabularyClient + 頁面

**Files:**
- Modify: `app/vocabulary/VocabularyClient.tsx`
- Modify: `app/vocabulary/page.tsx`

**Step 1: 修改 `app/vocabulary/page.tsx`**

```tsx
// app/vocabulary/page.tsx
import { getCategories } from "@/lib/actions/categories";
import { getLanguages } from "@/lib/actions/languages";
import { getVocabularies } from "@/lib/actions/vocabulary";
import VocabularyClient from "./VocabularyClient";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ languageId?: string }>;
}) {
  const { languageId } = await searchParams;
  const [categories, languages, vocabularies] = await Promise.all([
    getCategories(),
    getLanguages(),
    getVocabularies(languageId),
  ]);

  return (
    <VocabularyClient
      initialCategories={categories}
      initialVocabularies={vocabularies}
      languages={languages}
      currentLanguageId={languageId ?? null}
    />
  );
}
```

**Step 2: 修改 `app/vocabulary/VocabularyClient.tsx`**

在 `VocabularyClient` 的 props 加入 `languages` 和 `currentLanguageId`，並將所有 `vocab.japanese` 改為 `vocab.front`：

- Line 125: `if (vocab) setPendingDelete({ type: "vocab", id, name: vocab.japanese });`
  → `if (vocab) setPendingDelete({ type: "vocab", id, name: vocab.front });`

- Line 106 props interface 新增：
```tsx
  languages: { id: string; name: string }[];
  currentLanguageId: string | null;
```

- Line 172 heading 區塊加上語言切換說明（可選，顯示目前語言名稱）

完整修改（只改有問題的部分）：

```diff
// app/vocabulary/VocabularyClient.tsx — 修改處

- import type { Category, Vocabulary } from "@/lib/db/schema";
+ import type { Category, Language, Vocabulary } from "@/lib/db/schema";

  export default function VocabularyClient({
    initialCategories,
    initialVocabularies,
+   languages,
+   currentLanguageId,
  }: {
    initialCategories: Category[];
    initialVocabularies: Vocabulary[];
+   languages: Language[];
+   currentLanguageId: string | null;
  }) {

-   if (vocab) setPendingDelete({ type: "vocab", id, name: vocab.japanese });
+   if (vocab) setPendingDelete({ type: "vocab", id, name: vocab.front });
```

以上是 diff 形式；實際執行時完整修改這兩處。

**Step 3: Commit**

```bash
git add app/vocabulary/
git commit -m "feat: update vocabulary pages to support languageId filter"
```

---

### Task 11: 更新 NewVocabClient + EditVocabClient

**Files:**
- Modify: `app/vocabulary/new/NewVocabClient.tsx`
- Modify: `app/vocabulary/new/NewVocabPageInner.tsx`
- Modify: `app/vocabulary/[id]/EditVocabClient.tsx`
- Modify: `app/vocabulary/[id]/page.tsx`

**Step 1: 更新 `app/vocabulary/new/NewVocabPageInner.tsx`**

```tsx
// app/vocabulary/new/NewVocabPageInner.tsx
import { getCategories } from "@/lib/actions/categories";
import { getLanguages } from "@/lib/actions/languages";
import NewVocabClient from "./NewVocabClient";

export default async function NewVocabPageInner({
  languageId,
}: {
  languageId?: string;
}) {
  const [categories, languages] = await Promise.all([
    getCategories(),
    getLanguages(),
  ]);
  return (
    <NewVocabClient
      categories={categories}
      languages={languages}
      defaultLanguageId={languageId ?? null}
    />
  );
}
```

**Step 2: 更新 `app/vocabulary/new/page.tsx`**

```tsx
// app/vocabulary/new/page.tsx
import { Suspense } from "react";
import NewVocabPageInner from "./NewVocabPageInner";

export default async function NewVocabPage({
  searchParams,
}: {
  searchParams: Promise<{ languageId?: string }>;
}) {
  const { languageId } = await searchParams;
  return (
    <Suspense>
      <NewVocabPageInner languageId={languageId} />
    </Suspense>
  );
}
```

**Step 3: 完整取代 `app/vocabulary/new/NewVocabClient.tsx`**

```tsx
// app/vocabulary/new/NewVocabClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import VocabForm from "@/components/VocabForm";
import { createCategory } from "@/lib/actions/categories";
import { createLanguage } from "@/lib/actions/languages";
import { createVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Language } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";

export default function NewVocabClient({
  categories: initialCategories,
  languages: initialLanguages,
  defaultLanguageId,
}: {
  categories: Category[];
  languages: Language[];
  defaultLanguageId: string | null;
}) {
  const router = useRouter();
  const [vocabError, setVocabError] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const [languages, setLanguages] = useState(initialLanguages);

  async function handleSubmit(data: VocabFormData) {
    setVocabError("");
    try {
      await createVocabulary({
        front: data.front,
        back: data.back,
        exampleJp: data.exampleJp,
        categoryId: data.categoryId,
        languageId: data.languageId,
      });
      const target = data.languageId
        ? `/languages/${data.languageId}`
        : "/";
      router.push(target);
    } catch {
      setVocabError("新增失敗，請再試一次");
    }
  }

  async function handleCreateCategory(name: string) {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  async function handleCreateLanguage(name: string, ttsCode: string) {
    const created = await createLanguage({ name, ttsCode });
    setLanguages((prev) => [...prev, created]);
    return created;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">新增單字</h1>
        <p className="text-stone-500 text-sm mt-1">加入新的單字到你的單字庫</p>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        {vocabError && (
          <p className="text-destructive text-sm mb-4">{vocabError}</p>
        )}
        <VocabForm
          categories={categories}
          languages={languages}
          initialData={{
            front: "",
            back: "",
            exampleJp: "",
            categoryId: null,
            languageId: defaultLanguageId,
          }}
          onSubmit={handleSubmit}
          onCreateCategory={handleCreateCategory}
          onCreateLanguage={handleCreateLanguage}
          submitLabel="新增單字"
          showCategorySelector
        />
      </div>
    </div>
  );
}
```

**Step 4: 更新 `app/vocabulary/[id]/EditVocabClient.tsx`**

```tsx
// app/vocabulary/[id]/EditVocabClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import VocabForm from "@/components/VocabForm";
import { createCategory } from "@/lib/actions/categories";
import { createLanguage } from "@/lib/actions/languages";
import { updateVocabulary, deleteVocabulary } from "@/lib/actions/vocabulary";
import type { Category, Language, Vocabulary } from "@/lib/db/schema";
import type { VocabFormData } from "@/lib/types";

export default function EditVocabClient({
  vocab,
  categories: initialCategories,
  languages: initialLanguages,
}: {
  vocab: Vocabulary;
  categories: Category[];
  languages: Language[];
}) {
  const router = useRouter();
  const [vocabError, setVocabError] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const [languages, setLanguages] = useState(initialLanguages);

  async function handleSubmit(data: VocabFormData) {
    setVocabError("");
    try {
      await updateVocabulary(vocab.id, {
        front: data.front,
        back: data.back,
        exampleJp: data.exampleJp,
        categoryId: data.categoryId,
        languageId: data.languageId,
      });
      router.push(
        vocab.languageId ? `/languages/${vocab.languageId}` : "/"
      );
    } catch {
      setVocabError("儲存失敗，請再試一次");
    }
  }

  async function handleDelete() {
    await deleteVocabulary(vocab.id);
    router.push(vocab.languageId ? `/languages/${vocab.languageId}` : "/");
  }

  async function handleCreateCategory(name: string) {
    const created = await createCategory(name);
    setCategories((prev) => [...prev, created]);
    return created;
  }

  async function handleCreateLanguage(name: string, ttsCode: string) {
    const created = await createLanguage({ name, ttsCode });
    setLanguages((prev) => [...prev, created]);
    return created;
  }

  const initialData: VocabFormData & { id: string } = {
    id: vocab.id,
    front: vocab.front,
    back: vocab.back,
    exampleJp: vocab.exampleJp,
    categoryId: vocab.categoryId,
    languageId: vocab.languageId,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">編輯單字</h1>
          <p className="text-muted-foreground text-sm mt-1">
            修改 {vocab.back} 的資料
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              刪除單字
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認刪除</AlertDialogTitle>
              <AlertDialogDescription>
                確定刪除「{vocab.back}」？此操作無法復原。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="bg-card rounded-2xl border border-border p-6">
        {vocabError && (
          <p className="text-destructive text-sm mb-4">{vocabError}</p>
        )}
        <VocabForm
          categories={categories}
          languages={languages}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCreateCategory={handleCreateCategory}
          onCreateLanguage={handleCreateLanguage}
          submitLabel="儲存變更"
          showCategorySelector
        />
      </div>
    </div>
  );
}
```

**Step 5: 更新 `app/vocabulary/[id]/page.tsx`**

```tsx
// app/vocabulary/[id]/page.tsx
import { notFound } from "next/navigation";
import EditVocabClient from "./EditVocabClient";
import { getCategories } from "@/lib/actions/categories";
import { getLanguages } from "@/lib/actions/languages";
import { getVocabularyById } from "@/lib/actions/vocabulary";

export default async function EditVocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vocab, categories, languages] = await Promise.all([
    getVocabularyById(id),
    getCategories(),
    getLanguages(),
  ]);

  if (!vocab) notFound();

  return (
    <EditVocabClient vocab={vocab} categories={categories} languages={languages} />
  );
}
```

**Step 6: 最終驗證**

```bash
npx tsc --noEmit
```

預期：0 errors。

**Step 7: Commit**

```bash
git add app/vocabulary/
git commit -m "feat: update new/edit vocab pages to support multilang form"
```

---

### Task 12: 最終整合驗證

**Step 1: 完整 build**

```bash
npm run build
```

預期：Build 成功，無 TypeScript 或 React 錯誤。

**Step 2: 手動測試清單**

1. 首頁 `/` → 顯示語言卡片，空白時顯示新增語言按鈕
2. 點「+ 日文」→ 新增語言，頁面刷新顯示日文卡片
3. 點日文卡片 → 進入 `/languages/[id]` 顯示統計
4. 點「+ 新增單字」→ 表單顯示正面/反面/例句，語言預選日文
5. 新增一個單字 → 跳回語言頁，待複習 +1
6. 點「開始複習」→ 進入複習頁，翻轉時聽到日文播音
7. 語言設定切換為「反面」→ 複習時進入卡片立即播音
8. 刪除語言 → 跳回首頁

**Step 3: 最終 commit**

```bash
git add -A
git commit -m "feat: complete multilang vocab learning system"
```
