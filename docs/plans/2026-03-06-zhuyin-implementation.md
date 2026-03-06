# Zhuyin Field Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 為中文語言（ttsCode === "zh-TW"）的單字新增注音欄位，移除例句欄位；其他語言保持不變。

**Architecture:** 在 DB 新增 `zhuyin` 欄位（保留 `example_jp`），以 `ttsCode === "zh-TW"` 判斷是否為中文語言，在 VocabForm 與批次新增功能中條件式顯示對應欄位。

**Tech Stack:** Next.js 16, Drizzle ORM, Neon Postgres, TypeScript, React

---

### Task 1: 更新 schema 並產生 DB migration

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: 在 schema 新增 zhuyin 欄位**

在 `vocabulary` table 的 `exampleJp` 欄位後面加上：

```ts
zhuyin: text("zhuyin").notNull().default(""),
```

完整 `vocabulary` table 的 `exampleJp` 附近區塊：

```ts
exampleJp: text("example_jp").notNull().default(""),
zhuyin: text("zhuyin").notNull().default(""),
```

**Step 2: 產生 migration 檔案**

```bash
npx drizzle-kit generate
```

預期：在 `drizzle/` 目錄產生新的 `.sql` migration 檔

**Step 3: 執行 migration**

```bash
npx drizzle-kit migrate
```

預期：`zhuyin` 欄位成功加入資料庫

**Step 4: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add zhuyin column to vocabulary table"
```

---

### Task 2: 更新 TypeScript 型別

**Files:**
- Modify: `lib/types.ts`

**Step 1: 在 Vocabulary 介面新增 zhuyin**

```ts
export interface Vocabulary {
  id: string;
  front: string;
  back: string;
  exampleJp: string;
  zhuyin: string;
  categoryId: string | null;
  languageId: string | null;
  createdAt: number;
  reviewStage: 0 | 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number;
  lastReviewedAt?: number;
}
```

**Step 2: 在 VocabFormData 新增 zhuyin**

```ts
export type VocabFormData = {
  front: string;
  back: string;
  exampleJp: string;
  zhuyin: string;
  categoryId: string | null;
  languageId: string | null;
};
```

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add zhuyin to VocabFormData and Vocabulary types"
```

---

### Task 3: 更新 Server Actions

**Files:**
- Modify: `lib/actions/vocabulary.ts`

**Step 1: 更新 createVocabulary**

函式簽名加入 `zhuyin?: string`：

```ts
export async function createVocabulary(data: {
  front: string;
  back: string;
  exampleJp?: string;
  zhuyin?: string;
  categoryId: string | null;
  languageId: string | null;
}) {
```

`.values()` 加入 `zhuyin`：

```ts
.values({
  userId,
  front: data.front.trim(),
  back: data.back.trim(),
  exampleJp: data.exampleJp?.trim() ?? "",
  zhuyin: data.zhuyin?.trim() ?? "",
  categoryId: data.categoryId,
  languageId: data.languageId,
  reviewStage: 0,
  nextReviewAt: new Date(),
})
```

**Step 2: 更新 updateVocabulary**

型別加入 `zhuyin?: string`：

```ts
export async function updateVocabulary(
  id: string,
  data: {
    front?: string;
    back?: string;
    exampleJp?: string;
    zhuyin?: string;
    categoryId?: string | null;
    languageId?: string | null;
  }
)
```

`.set()` 加入：

```ts
...(data.zhuyin !== undefined && { zhuyin: data.zhuyin.trim() }),
```

**Step 3: 更新 createVocabularies**

items 型別加入 `zhuyin`：

```ts
export async function createVocabularies(
  items: { front: string; back: string; exampleJp: string; zhuyin: string }[],
  languageId: string,
  categoryId: string
): Promise<{ created: number }>
```

`.values()` map 加入：

```ts
items.map((item) => ({
  userId,
  languageId,
  categoryId,
  front: item.front,
  back: item.back,
  exampleJp: item.exampleJp,
  zhuyin: item.zhuyin,
  reviewStage: 0,
  nextReviewAt: new Date(),
}))
```

**Step 4: Commit**

```bash
git add lib/actions/vocabulary.ts
git commit -m "feat: support zhuyin in vocabulary server actions"
```

---

### Task 4: 更新 VocabForm 元件

**Files:**
- Modify: `components/VocabForm.tsx`

**Step 1: 新增 isChineseLanguage prop**

在 `Props` interface 加入：

```ts
isChineseLanguage?: boolean;
```

在函式參數解構加入：

```ts
isChineseLanguage = false,
```

**Step 2: 更新 form 初始狀態**

在 `useState<VocabFormData>` 初始值加入：

```ts
zhuyin: "",
```

完整初始值：

```ts
const [form, setForm] = useState<VocabFormData>({
  front: "",
  back: "",
  exampleJp: "",
  zhuyin: "",
  categoryId: null,
  languageId: null,
  ...initialData,
});
```

**Step 3: 替換例句區塊為條件式欄位**

找到：

```tsx
{/* 例句 */}
<div className="flex flex-col gap-1.5">
  <Label htmlFor="exampleJp">例句</Label>
  <Input
    id="exampleJp"
    value={form.exampleJp}
    onChange={(e) => setField("exampleJp", e.target.value)}
  />
</div>
```

替換為：

```tsx
{/* 注音（中文）或例句（其他語言） */}
{isChineseLanguage ? (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="zhuyin">注音</Label>
    <Input
      id="zhuyin"
      value={form.zhuyin}
      onChange={(e) => setField("zhuyin", e.target.value)}
    />
  </div>
) : (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor="exampleJp">例句</Label>
    <Input
      id="exampleJp"
      value={form.exampleJp}
      onChange={(e) => setField("exampleJp", e.target.value)}
    />
  </div>
)}
```

**Step 4: Commit**

```bash
git add components/VocabForm.tsx
git commit -m "feat: add isChineseLanguage prop to VocabForm, show zhuyin or example field conditionally"
```

---

### Task 5: 更新 NewVocabClient

**Files:**
- Modify: `app/vocabulary/new/NewVocabClient.tsx`

**Step 1: 在 handleSubmit 傳入 zhuyin**

```ts
await createVocabulary({
  front: data.front,
  back: data.back,
  exampleJp: data.exampleJp,
  zhuyin: data.zhuyin,
  categoryId: data.categoryId,
  languageId: data.languageId,
});
```

**Step 2: 計算 isChineseLanguage 並傳給 VocabForm**

在 return 前加入：

```ts
const selectedLanguage = languages.find((l) => l.id === (defaultLanguageId ?? ""));
const isChineseLanguage = selectedLanguage?.ttsCode === "zh-TW";
```

在 `VocabForm` 加入 prop：

```tsx
isChineseLanguage={isChineseLanguage}
```

**Step 3: 更新 initialData 加入 zhuyin**

```ts
initialData={{
  front: "",
  back: "",
  exampleJp: "",
  zhuyin: "",
  categoryId: defaultCategoryId,
  languageId: defaultLanguageId,
}}
```

**Step 4: Commit**

```bash
git add app/vocabulary/new/NewVocabClient.tsx
git commit -m "feat: pass isChineseLanguage and zhuyin to VocabForm in NewVocabClient"
```

---

### Task 6: 更新 EditVocabClient

**Files:**
- Modify: `app/vocabulary/[id]/EditVocabClient.tsx`

**Step 1: 在 handleSubmit 傳入 zhuyin**

```ts
await updateVocabulary(vocab.id, {
  front: data.front,
  back: data.back,
  exampleJp: data.exampleJp,
  zhuyin: data.zhuyin,
  categoryId: data.categoryId,
  languageId: data.languageId,
});
```

**Step 2: 在 initialData 加入 zhuyin**

```ts
const initialData: VocabFormData & { id: string } = {
  id: vocab.id,
  front: vocab.front,
  back: vocab.back,
  exampleJp: vocab.exampleJp,
  zhuyin: vocab.zhuyin,
  categoryId: vocab.categoryId,
  languageId: vocab.languageId,
};
```

**Step 3: 計算 isChineseLanguage 並傳給 VocabForm**

在 return 前加入：

```ts
const selectedLanguage = languages.find((l) => l.id === (vocab.languageId ?? ""));
const isChineseLanguage = selectedLanguage?.ttsCode === "zh-TW";
```

在 `VocabForm` 加入 prop：

```tsx
isChineseLanguage={isChineseLanguage}
```

**Step 4: Commit**

```bash
git add app/vocabulary/[id]/EditVocabClient.tsx
git commit -m "feat: pass isChineseLanguage and zhuyin to VocabForm in EditVocabClient"
```

---

### Task 7: 更新 FlashCard

**Files:**
- Modify: `components/FlashCard.tsx`

**Step 1: 更新反面顯示**

找到：

```tsx
{vocab.exampleJp && (
  <div className="mt-4 text-center">
    <p className="text-stone-200 text-sm">{vocab.exampleJp}</p>
  </div>
)}
```

替換為：

```tsx
{vocab.zhuyin && (
  <div className="mt-4 text-center">
    <p className="text-stone-200 text-sm">{vocab.zhuyin}</p>
  </div>
)}
{vocab.exampleJp && (
  <div className="mt-4 text-center">
    <p className="text-stone-200 text-sm">{vocab.exampleJp}</p>
  </div>
)}
```

（注音和例句不會同時出現，但這樣寫最安全）

**Step 2: Commit**

```bash
git add components/FlashCard.tsx
git commit -m "feat: show zhuyin in FlashCard back side"
```

---

### Task 8: 更新 LanguageClient（批次新增）

**Files:**
- Modify: `app/languages/[id]/LanguageClient.tsx`

**Step 1: 更新 parseBatchVocabLine 函式**

找到：

```ts
function parseBatchVocabLine(line: string): { back: string; front: string; exampleJp: string } | null {
  const parts = line.includes("\t") ? line.split("\t") : line.split("|");
  const [front, back, exampleJp] = parts.map((p) => p.trim());
  if (!front || !back) return null;
  return { front, back, exampleJp: exampleJp ?? "" };
}
```

替換為接收 `isChineseLanguage` 參數的版本：

```ts
function parseBatchVocabLine(
  line: string,
  isChineseLanguage: boolean
): { back: string; front: string; exampleJp: string; zhuyin: string } | null {
  const parts = line.includes("\t") ? line.split("\t") : line.split("|");
  const [front, back, third] = parts.map((p) => p.trim());
  if (!front || !back) return null;
  return {
    front,
    back,
    exampleJp: isChineseLanguage ? "" : (third ?? ""),
    zhuyin: isChineseLanguage ? (third ?? "") : "",
  };
}
```

**Step 2: 更新 CategorySection props 加入 isChineseLanguage**

在 `CategorySection` 的 props interface 加入：

```ts
isChineseLanguage: boolean;
```

在函式參數解構加入：

```ts
isChineseLanguage,
```

**Step 3: 更新 CategorySection 內的型別與呼叫**

items 型別改為：

```ts
const items: { back: string; front: string; exampleJp: string; zhuyin: string }[] = [];
```

呼叫 parseBatchVocabLine 時傳入：

```ts
const parsed = parseBatchVocabLine(line, isChineseLanguage);
```

**Step 4: 更新 Dialog 說明文字**

找到（在 CategorySection 的 Dialog 內）：

```tsx
<DialogDescription>每行一筆：翻譯 | 目標語單字 | 例句（選填）</DialogDescription>
```

替換為條件式：

```tsx
<DialogDescription>
  {isChineseLanguage
    ? "每行一筆：母語 | 目標語言 | 注音（選填）"
    : "每行一筆：翻譯 | 目標語單字 | 例句（選填）"}
</DialogDescription>
```

**Step 5: 更新錯誤提示文字**

找到：

```tsx
以下行格式有誤（需至少「翻譯 | 目標語單字」）：
```

替換為：

```tsx
{isChineseLanguage
  ? "以下行格式有誤（需至少「母語 | 目標語言」）："
  : "以下行格式有誤（需至少「翻譯 | 目標語單字」）："}
```

**Step 6: 在 LanguageClient 主元件傳入 isChineseLanguage 給 CategorySection**

在 `groups.map` 內加入 prop：

```tsx
<CategorySection
  key={cat.id}
  cat={cat}
  vocabs={vocabs}
  languageId={language.id}
  ttsCode={language.ttsCode}
  isChineseLanguage={language.ttsCode === "zh-TW"}
  onDelete={handleDeleteVocab}
  onDeleteCategory={handleDeleteCategory}
/>
```

**Step 7: Commit**

```bash
git add app/languages/[id]/LanguageClient.tsx
git commit -m "feat: update batch vocab parsing and UI for Chinese zhuyin support"
```

---

### Task 9: 手動測試

**Step 1: 啟動開發伺服器**

```bash
npm run dev
```

**Step 2: 測試中文語言（zh-TW）**
- 進入中文語言的分類頁面
- 點「+ 單字」→ 確認顯示「注音」欄位，無「例句」欄位
- 新增一筆單字（含注音）→ 確認儲存成功
- 點「編輯」→ 確認「注音」欄位有正確載入
- 複習時確認 FlashCard 反面顯示注音
- 批次新增：輸入「你好|hello|ㄋㄧˇㄏㄠˇ」→ 確認成功

**Step 3: 測試其他語言（e.g. 日文 ja-JP）**
- 進入日文語言頁面
- 點「+ 單字」→ 確認顯示「例句」欄位，無「注音」欄位
- 批次新增正常運作
